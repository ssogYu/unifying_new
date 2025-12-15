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
  HttpErrorDetail,
  RequestContext,
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
import { ConfigManager } from './config'
import { RequestContextManager } from './request-context'
import { InterceptorManager } from './interceptors'

/**
 * HTTP Client for making requests
 */
export class HttpClient {
  private client: AxiosInstance
  private configManager: ConfigManager
  private logger: ILogger
  private interceptorManager: InterceptorManager
  private contextManager: RequestContextManager

  constructor(config: HttpClientConfig = {}) {
    this.configManager = new ConfigManager(config)
    this.contextManager = new RequestContextManager()
    this.interceptorManager = new InterceptorManager()

    const normalizedConfig = this.configManager.get()
    this.logger = normalizedConfig.enableLogging ? new ConsoleLogger() : new NoOpLogger()

    this.client = axios.create(this.createAxiosConfig())
    this.setupInterceptors()
  }

  /**
   * Create Axios configuration from config manager
   */
  private createAxiosConfig(): AxiosRequestConfig {
    const config = this.configManager.get()
    const timeoutConfig = config.timeout as any
    return {
      baseURL: config.baseURL,
      timeout: timeoutConfig.request,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      validateStatus: () => true, // Don't throw on any status code
    }
  }

  /**
   * Setup Axios interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: any) => {
        const requestId = this.getOrCreateRequestId(config)
        const context = this.contextManager.getContext(requestId) || this.contextManager.createContext(requestId)

        // Setup abort signal
        const controller = this.contextManager.getOrCreateAbortController(requestId)
        config.signal = controller.signal
        config.headers['X-Request-ID'] = requestId

        this.logger.debug(`[${requestId}] Request started`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: sanitizeHeaders(config.headers as Record<string, any>),
        })

        // Apply custom request interceptors
        let modifiedConfig = config
        for (const interceptor of this.interceptorManager.getRequestInterceptors()) {
          modifiedConfig = await interceptor(modifiedConfig)
        }

        // Preserve abort signal
        if (!modifiedConfig.signal) {
          modifiedConfig.signal = controller.signal
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
        const context = requestId ? this.contextManager.getContext(requestId) : undefined
        const duration = this.contextManager.getDuration(requestId)

        const enhancedResponse: HttpResponse = {
          ...response,
          duration,
          retryCount: context?.retryCount || 0,
        }

        this.logger.debug(`[${requestId || 'UNKNOWN'}] Response received`, {
          status: response.status,
          duration: `${duration}ms`,
        })

        // Validate response status
        const config = this.configManager.get()
        const isSuccess = isSuccessStatusCode(response.status, config.successStatusCodes)
        if (!isSuccess) {
          const error = this.createHttpError(response, context)
          throw error
        }

        // Apply custom response interceptors
        let modifiedResponse = enhancedResponse
        for (const interceptor of this.interceptorManager.getResponseInterceptors()) {
          try {
            const result = await interceptor(modifiedResponse)
            if (result) {
              modifiedResponse = result
            }
          } catch (interceptorError) {
            this.logger.error(`[${requestId || 'UNKNOWN'}] Response interceptor error`, interceptorError)
            if (interceptorError instanceof Error && ('response' in interceptorError || 'request' in interceptorError)) {
              throw this.createHttpError(interceptorError as AxiosError, context)
            }
            throw interceptorError
          }
        }

        // Clean up request context
        if (requestId) {
          this.contextManager.removeContext(requestId)
        }

        return modifiedResponse
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-ID'] || 'UNKNOWN'
        const context = this.contextManager.getContext(requestId as string)

        this.logger.warn(`[${requestId}] Response error received`, {
          status: error.response?.status,
          message: error.message,
        })

        // Apply custom error interceptors
        let handledError = error
        for (const interceptor of this.interceptorManager.getErrorInterceptors()) {
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
          this.contextManager.updateContext(requestId as string, {
            retryCount: (context.retryCount || 0) + 1,
          })
          const updatedContext = this.contextManager.getContext(requestId as string)!
          const clientConfig = this.configManager.get()
          const retryCount = updatedContext.retryCount || 0
          const delay = calculateBackoffDelay(retryCount - 1, clientConfig.retry!.retryDelay)

          this.logger.info(
            `[${requestId}] Retrying request (attempt ${updatedContext.retryCount}/${clientConfig.retry!.maxRetries}) after ${delay}ms`
          )

          await this.sleep(delay)
          config.headers['X-Request-ID'] = requestId
          return this.client.request(config)
        }

        // Clean up request context
        this.contextManager.removeContext(requestId as string)

        throw this.createHttpError(handledError, context)
      }
    )
  }

  /**
   * Get or create request ID
   */
  private getOrCreateRequestId(config: any): string {
    let requestId = config.headers?.['X-Request-ID']
    if (!requestId) {
      requestId = generateRequestId()
    }
    return requestId
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: AxiosError, context?: any): boolean {
    const config = this.configManager.get()
    if (!context || !config.retry || (context.retryCount ?? 0) >= config.retry.maxRetries!) {
      return false
    }

    if (error.response) {
      return isRetryableError(error, config.retry.retryStatusCodes)
    }

    return config.retry.retryOnNetworkError ?? true
  }

  /**
   * Create HTTP error
   */
  private createHttpError(
    errorOrResponse: AxiosError | AxiosResponse,
    context?: RequestContext
  ): HttpError {
    const config = this.configManager.get()
    const isAxiosError = 'response' in errorOrResponse || 'request' in errorOrResponse

    if (isAxiosError) {
      const error = errorOrResponse as AxiosError
      const detail: HttpErrorDetail = {
        code: getErrorCode(error),
        message: parseErrorMessage(error),
        status: error.response?.status,
        isRetryable: isRetryableError(error, config.retry?.retryStatusCodes),
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
      isRetryable: isRetryableError(response, config.retry?.retryStatusCodes),
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
   * Add custom interceptors
   */
  public use(interceptor: {
    request?: any
    response?: any
    error?: any
  }): void {
    this.interceptorManager.use(interceptor)
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
    this.configManager.update(config)
  }

  /**
   * Get current configuration
   */
  public getConfig(): HttpClientConfig {
    return this.configManager.get()
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
    this.interceptorManager.clear()
  }

  /**
   * Cancel a specific request by request ID
   */
  public cancelRequest(requestId: string, reason?: string): void {
    this.contextManager.abort(requestId, reason)
    this.logger.info(`[${requestId}] Request cancelled: ${reason || 'Manual cancellation'}`)
  }

  /**
   * Cancel all pending requests
   */
  public cancelAllRequests(reason?: string): void {
    const pendingIds = this.contextManager.getPendingRequestIds()
    pendingIds.forEach((requestId) => {
      this.logger.info(`[${requestId}] Request cancelled: ${reason || 'Cancel all'}`)
    })
    this.contextManager.abortAll(reason)
  }

  /**
   * Get pending request IDs
   */
  public getPendingRequestIds(): string[] {
    return this.contextManager.getPendingRequestIds()
  }

  /**
   * Destroy the client and clean up resources
   */
  public destroy(): void {
    this.cancelAllRequests('Client destroyed')
    this.clearInterceptors()
    this.contextManager.clear()
  }
}
