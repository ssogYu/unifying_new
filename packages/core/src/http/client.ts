/**
 * HTTP Client - Main class for making HTTP requests
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios'

import type {
  HttpClientConfig,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RequestContext,
  HttpErrorDetail,
} from './types'
import { HttpError } from './types'
import {
  isRetryableError,
  generateRequestId,
  parseErrorMessage,
  getErrorCode,
  sanitizeHeaders,
  isSuccessStatusCode,
  calculateBackoffDelay,
} from './utils'
import type { ILogger } from './logger'
import { ConsoleLogger, NoOpLogger } from './logger'

/**
 * HTTP Client for making requests
 */
export class HttpClient {
  private client: AxiosInstance
  private config: HttpClientConfig
  private logger: ILogger
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []
  private requestContextMap = new Map<string, RequestContext>()
  private abortControllers = new Map<string, AbortController>()

  constructor(config: HttpClientConfig = {}) {
    this.config = this.normalizeConfig(config)
    this.logger = this.config.enableLogging ? new ConsoleLogger() : new NoOpLogger()

    this.client = axios.create(this.createAxiosConfig())
    this.setupInterceptors()
  }

  /**
   * Normalize configuration
   */
  private normalizeConfig(config: HttpClientConfig): HttpClientConfig {
    return {
      baseURL: config.baseURL || '',
      timeout:
        config.timeout && typeof config.timeout === 'number'
          ? { request: config.timeout, response: config.timeout }
          : (config.timeout as any) || { request: 30000, response: 30000 },
      retry: {
        maxRetries: config.retry?.maxRetries ?? 3,
        retryDelay: config.retry?.retryDelay ?? 1000,
        retryStatusCodes: config.retry?.retryStatusCodes || [],
        retryOnNetworkError: config.retry?.retryOnNetworkError ?? true,
      },
      enableLogging: config.enableLogging ?? false,
      headers: config.headers || {},
      successStatusCodes: config.successStatusCodes || [],
    }
  }

  /**
   * Create Axios configuration
   */
  private createAxiosConfig(): AxiosRequestConfig {
    const timeoutConfig = this.config.timeout as any
    return {
      baseURL: this.config.baseURL,
      timeout: timeoutConfig.request,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      validateStatus: () => true, // Don't throw on any status code
    }
  }

  /**
   * Setup interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: any) => {
        const requestId = generateRequestId()
        config.headers['X-Request-ID'] = requestId

        const context: RequestContext = {
          requestId,
          startTime: Date.now(),
          retryCount: 0,
        }
        this.requestContextMap.set(requestId, context)

        this.logger.debug(`[${requestId}] Request started`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: sanitizeHeaders(config.headers as Record<string, any>),
        })

        // Apply custom request interceptors
        let modifiedConfig = config
        for (const interceptor of this.requestInterceptors) {
          modifiedConfig = await interceptor(modifiedConfig)
        }

        return modifiedConfig
      },
      (error) => {
        this.logger.error('Request interceptor error', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      async (response: any) => {
        const requestId = response.config?.headers?.['X-Request-ID']
        const context = requestId ? this.requestContextMap.get(requestId) : undefined
        const duration = context ? Date.now() - (context.startTime || 0) : 0

        const enhancedResponse: HttpResponse = {
          ...response,
          duration,
          retryCount: context?.retryCount || 0,
        }

        this.logger.debug(`[${requestId || 'UNKNOWN'}] Response received`, {
          status: response.status,
          duration: `${duration}ms`,
        })

        // Only process status validation if it's not already successful
        // Since validateStatus: () => true, all responses reach here
        const isSuccess = isSuccessStatusCode(response.status, this.config.successStatusCodes)
        if (!isSuccess) {
          const error = this.createHttpError(response, context)
          throw error
        }

        // Apply custom response interceptors
        let modifiedResponse = enhancedResponse
        for (const interceptor of this.responseInterceptors) {
          try {
            const result = await interceptor(modifiedResponse)
            if (result) {
              modifiedResponse = result
            }
          } catch (interceptorError) {
            this.logger.error(`[${requestId || 'UNKNOWN'}] Response interceptor error`, interceptorError)
            // If the error is an AxiosError, use createHttpError, otherwise throw
            if (interceptorError instanceof Error && ('response' in interceptorError || 'request' in interceptorError)) {
              throw this.createHttpError(interceptorError as AxiosError, context)
            }
            throw interceptorError
          }
        }

        // Clean up request context
        if (requestId) {
          this.requestContextMap.delete(requestId)
          this.abortControllers.delete(requestId)
        }

        return modifiedResponse
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-ID'] || 'UNKNOWN'
        const context = this.requestContextMap.get(requestId as string)

        this.logger.warn(`[${requestId}] Response error received`, {
          status: error.response?.status,
          message: error.message,
        })

        // Apply custom error interceptors
        let handledError = error
        for (const interceptor of this.errorInterceptors) {
          try {
            const result = await interceptor(handledError)
            if (result) {
              handledError = result
            }
          } catch (e) {
            this.logger.error(`[${requestId}] Error interceptor error`, e)
            handledError = e as AxiosError
          }
        }

        // Retry logic
        const config = error.config
        if (config && context && this.shouldRetry(handledError, context)) {
          context.retryCount = (context.retryCount || 0) + 1
          const delay = calculateBackoffDelay(context.retryCount - 1, this.config.retry!.retryDelay)

          this.logger.info(
            `[${requestId}] Retrying request (attempt ${context.retryCount}/${this.config.retry!.maxRetries}) after ${delay}ms`
          )

          await this.sleep(delay)
          return this.client.request(config)
        }

        // Clean up request context
        this.requestContextMap.delete(requestId as string)
        this.abortControllers.delete(requestId as string)

        throw this.createHttpError(handledError, context)
      }
    )
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: AxiosError, context?: RequestContext): boolean {
    if (!context || !this.config.retry || (context.retryCount ?? 0) >= this.config.retry.maxRetries!) {
      return false
    }

    if (error.response) {
      // HTTP error - check retry status codes
      return isRetryableError(error, this.config.retry.retryStatusCodes)
    }

    // Network error
    return this.config.retry.retryOnNetworkError ?? true
  }

  /**
   * Create HTTP error
   */
  private createHttpError(
    errorOrResponse: AxiosError | AxiosResponse,
    context?: RequestContext
  ): HttpError {
    const isAxiosError = 'response' in errorOrResponse || 'request' in errorOrResponse

    if (isAxiosError) {
      const error = errorOrResponse as AxiosError
      const detail: HttpErrorDetail = {
        code: getErrorCode(error),
        message: parseErrorMessage(error),
        status: error.response?.status,
        isRetryable: isRetryableError(error, this.config.retry?.retryStatusCodes),
        context: {
          requestId: context?.requestId,
          retryCount: context?.retryCount,
          url: error.config?.url,
          method: error.config?.method,
        },
      }
      return new HttpError(detail)
    }

    const response = errorOrResponse as AxiosResponse
    const detail: HttpErrorDetail = {
      code: response.status,
      message: parseErrorMessage(response),
      status: response.status,
      isRetryable: isRetryableError(response, this.config.retry?.retryStatusCodes),
      context: {
        requestId: context?.requestId,
        retryCount: context?.retryCount,
      },
    }
    return new HttpError(detail)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Add request interceptor
   */
  public use(interceptor: {
    request?: RequestInterceptor
    response?: ResponseInterceptor
    error?: ErrorInterceptor
  }): void {
    if (interceptor.request) {
      this.requestInterceptors.push(interceptor.request)
    }
    if (interceptor.response) {
      this.responseInterceptors.push(interceptor.response)
    }
    if (interceptor.error) {
      this.errorInterceptors.push(interceptor.error)
    }
  }

  /**
   * Make GET request
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<HttpResponse<T>> {
    return this.client.get(url, config)
  }

  /**
   * Make POST request
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<HttpResponse<T>> {
    return this.client.post(url, data, config)
  }

  /**
   * Make PUT request
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<HttpResponse<T>> {
    return this.client.put(url, data, config)
  }

  /**
   * Make PATCH request
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<HttpResponse<T>> {
    return this.client.patch(url, data, config)
  }

  /**
   * Make DELETE request
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<HttpResponse<T>> {
    return this.client.delete(url, config)
  }

  /**
   * Get the underlying Axios instance
   */
  public getAxiosInstance(): AxiosInstance {
    return this.client
  }

  /**
   * Update configuration
   */
  public setConfig(config: Partial<HttpClientConfig>): void {
    this.config = { ...this.config, ...this.normalizeConfig(config) }
  }

  /**
   * Get current configuration
   */
  public getConfig(): HttpClientConfig {
    return { ...this.config }
  }

  /**
   * Set default headers
   */
  public setHeaders(headers: Record<string, string>): void {
    Object.assign(this.client.defaults.headers.common, headers)
  }

  /**
   * Clear all interceptors
   */
  public clearInterceptors(): void {
    this.requestInterceptors = []
    this.responseInterceptors = []
    this.errorInterceptors = []
  }

  /**
   * Cancel a specific request by request ID
   */
  public cancelRequest(requestId: string, reason?: string): void {
    const controller = this.abortControllers.get(requestId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(requestId)
      this.requestContextMap.delete(requestId)
      this.logger.info(`[${requestId}] Request cancelled: ${reason || 'Manual cancellation'}`)
    }
  }

  /**
   * Cancel all pending requests
   */
  public cancelAllRequests(reason?: string): void {
    this.abortControllers.forEach((controller, requestId) => {
      controller.abort()
      this.logger.info(`[${requestId}] Request cancelled: ${reason || 'Cancel all'}`)
    })
    this.abortControllers.clear()
    this.requestContextMap.clear()
  }

  /**
   * Destroy the client and clean up resources
   */
  public destroy(): void {
    this.cancelAllRequests('Client destroyed')
    this.clearInterceptors()
    this.requestContextMap.clear()
    this.abortControllers.clear()
  }
}
