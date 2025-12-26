import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { HttpConfig, RequestConfig, ResponseData, HttpMethod } from './types'
import { HttpErrorHandler } from './error-handler'
import { CacheManager } from './cache-manager'
import { CancelManager } from './cancel-manager'
import { RetryManager } from './retry-manager'

export class HttpClient {
  private axiosInstance: AxiosInstance
  private errorHandler: HttpErrorHandler
  private cacheManager: CacheManager
  private cancelManager: CancelManager
  private retryManager: RetryManager
  private config: HttpConfig

  constructor(config: HttpConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      retryCount: config.retryCount || 3,
      retryDelay: config.retryDelay || 1000,
      enableCache: config.enableCache || false,
      cacheTime: config.cacheTime || 5 * 60 * 1000,
      showErrorMessage: config.showErrorMessage ?? true,
      showErrorDetail: config.showErrorDetail ?? false,
      ...config
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers
    })

    this.errorHandler = new HttpErrorHandler()
    this.cacheManager = new CacheManager()
    this.cancelManager = new CancelManager()
    this.retryManager = new RetryManager({
      count: this.config.retryCount!,
      delay: this.config.retryDelay!
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestConfig = config as RequestConfig
        
        if (!requestConfig.skipAuth && this.getToken()) {
          config.headers.Authorization = `Bearer ${this.getToken()}`
        }

        if (requestConfig.cancelKey) {
          const source = axios.CancelToken.source()
          config.cancelToken = source.token
          this.cancelManager.addPendingRequest(config, source)
        }

        if (this.config.transformRequest) {
          config.data = this.config.transformRequest(config.data)
        }

        if (this.config.requestInterceptor) {
          return this.config.requestInterceptor(config as any) as any
        }

        return config
      },
      (error) => {
        if (this.config.requestInterceptorCatch) {
          return this.config.requestInterceptorCatch(error)
        }
        return Promise.reject(error)
      }
    )

    this.axiosInstance.interceptors.response.use(
      (response) => {
        const requestConfig = response.config as RequestConfig
        this.cancelManager.removePendingRequest(requestConfig)

        if (this.config.transformResponse) {
          response.data = this.config.transformResponse(response.data)
        }

        if (this.config.responseInterceptor) {
          return this.config.responseInterceptor(response)
        }

        return response
      },
      async (error) => {
        const requestConfig = error.config as RequestConfig
        if (requestConfig) {
          this.cancelManager.removePendingRequest(requestConfig)
        }

        const httpError = this.errorHandler.handleError(error)

        if (this.config.responseInterceptorCatch) {
          return this.config.responseInterceptorCatch(httpError)
        }

        if (requestConfig && !requestConfig.skipErrorHandler) {
          if (this.retryManager.shouldRetry(httpError)) {
            try {
              const result = await this.retryManager.retry(
                () => this.axiosInstance.request(requestConfig),
                httpError
              )
              return result
            } catch (retryError) {
              this.handleFinalError(retryError as any, requestConfig)
              throw retryError
            }
          }

          this.handleFinalError(httpError, requestConfig)
        }

        throw httpError
      }
    )
  }

  private handleFinalError(error: any, config?: RequestConfig): void {
    if (config?.customErrorMessage) {
      this.showError(config.customErrorMessage)
    } else if (this.config.showErrorMessage) {
      this.showError(error.message)
    }
  }

  private showError(message: string): void {
    if (this.config.showErrorDetail) {
      console.error('[HTTP Error]', message)
    }
  }

  private getToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null
    }
    return localStorage.getItem('token') || sessionStorage?.getItem('token')
  }

  async request<T = any>(config: RequestConfig): Promise<ResponseData<T>> {
    const requestConfig = { ...config }

    if (requestConfig.enableCache && requestConfig.method?.toUpperCase() === 'GET') {
      const cacheKey = this.cacheManager.generateKey(requestConfig)
      const cachedData = this.cacheManager.get(cacheKey)
      
      if (cachedData) {
        return cachedData
      }
    }

    const response: AxiosResponse<ResponseData<T>> = await this.axiosInstance.request(requestConfig)

    if (requestConfig.enableCache && requestConfig.method?.toUpperCase() === 'GET') {
      const cacheKey = this.cacheManager.generateKey(requestConfig)
      this.cacheManager.set(cacheKey, response.data, requestConfig.cacheTime)
    }

    return response.data
  }

  get<T = any>(url: string, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  delete<T = any>(url: string, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  head<T = any>(url: string, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.request<T>({ ...config, method: 'HEAD', url })
  }

  options<T = any>(url: string, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.request<T>({ ...config, method: 'OPTIONS', url })
  }

  async upload<T = any>(
    url: string,
    file: File | Blob,
    options?: RequestConfig & {
      fieldName?: string
      data?: Record<string, any>
      onProgress?: (progress: number) => void
    }
  ): Promise<ResponseData<T>> {
    const formData = new FormData()
    formData.append(options?.fieldName || 'file', file)
    
    if (options?.data) {
      Object.keys(options.data).forEach(key => {
        formData.append(key, options.data![key])
      })
    }

    return this.request<T>({
      ...options,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options?.headers
      },
      onUploadProgress: options?.onProgress ? (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          options.onProgress!(progress)
        }
      } : undefined
    })
  }

  async download<T = any>(
    url: string,
    options?: RequestConfig & {
      onProgress?: (progress: number) => void
      filename?: string
    }
  ): Promise<Blob> {
    const response = await this.axiosInstance.request<Blob>({
      ...options,
      method: 'GET',
      url,
      responseType: 'blob',
      onDownloadProgress: options?.onProgress ? (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          options.onProgress!(progress)
        }
      } : undefined
    })

    if (options?.filename) {
      const blobUrl = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = options.filename
      link.click()
      URL.revokeObjectURL(blobUrl)
    }

    return response.data
  }

  cancelRequest(config: RequestConfig, reason?: string): void {
    this.cancelManager.cancelRequest(config, reason)
  }

  cancelAll(reason?: string): void {
    this.cancelManager.cancelAll(reason)
  }

  cancelByPattern(pattern: RegExp, reason?: string): void {
    this.cancelManager.cancelByPattern(pattern, reason)
  }

  clearCache(): void {
    this.cacheManager.clear()
  }

  cleanExpiredCache(): void {
    this.cacheManager.cleanExpired()
  }

  getCacheSize(): number {
    return this.cacheManager.size()
  }

  getCacheKeys(): string[] {
    return this.cacheManager.getKeys()
  }

  getPendingRequestsCount(): number {
    return this.cancelManager.getPendingRequestsCount()
  }

  getPendingRequestKeys(): string[] {
    return this.cancelManager.getPendingRequestKeys()
  }

  updateConfig(config: Partial<HttpConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (config.baseURL !== undefined) {
      this.axiosInstance.defaults.baseURL = config.baseURL
    }
    
    if (config.timeout !== undefined) {
      this.axiosInstance.defaults.timeout = config.timeout
    }
    
    if (config.headers) {
      Object.assign(this.axiosInstance.defaults.headers, config.headers)
    }
  }

  getConfig(): HttpConfig {
    return { ...this.config }
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }

  getErrorHandler(): HttpErrorHandler {
    return this.errorHandler
  }

  getCacheManager(): CacheManager {
    return this.cacheManager
  }

  getCancelManager(): CancelManager {
    return this.cancelManager
  }

  getRetryManager(): RetryManager {
    return this.retryManager
  }
}
