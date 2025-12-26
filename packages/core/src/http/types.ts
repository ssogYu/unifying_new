import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

export interface HttpConfig extends AxiosRequestConfig {
  baseURL?: string
  timeout?: number
  retryCount?: number
  retryDelay?: number
  enableCache?: boolean
  cacheTime?: number
  showErrorMessage?: boolean
  showErrorDetail?: boolean
  transformRequest?: (data: any) => any
  transformResponse?: (data: any) => any
  requestInterceptor?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>
  requestInterceptorCatch?: (error: any) => any
  responseInterceptor?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>
  responseInterceptorCatch?: (error: any) => any
}

export interface RequestConfig extends HttpConfig {
  skipErrorHandler?: boolean
  skipAuth?: boolean
  skipLoading?: boolean
  loadingText?: string
  customErrorMessage?: string
  cancelKey?: string
}

export interface ResponseData<T = any> {
  code: number
  data: T
  message: string
  success: boolean
  timestamp?: number
}

export interface HttpError extends Error {
  config?: AxiosRequestConfig
  code?: string
  request?: any
  response?: AxiosResponse<ResponseData>
  isAxiosError: boolean
  isCancel: boolean
  isTimeout: boolean
  isNetworkError: boolean
}

export interface CacheConfig {
  key: string
  data: any
  expireTime: number
  timestamp: number
}

export interface RetryConfig {
  count: number
  delay: number | ((retryCount: number) => number)
  retryCondition?: (error: HttpError) => boolean
}

export interface RequestQueueItem {
  config: AxiosRequestConfig
  resolve: (value: any) => void
  reject: (reason?: any) => void
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface UploadProgressEvent {
  loaded: number
  total: number
  progress: number
}

export interface DownloadProgressEvent {
  loaded: number
  total: number
  progress: number
}

export interface UploadOptions extends RequestConfig {
  file: File | Blob
  fieldName?: string
  data?: Record<string, any>
  onProgress?: (progress: UploadProgressEvent) => void
}

export interface DownloadOptions extends RequestConfig {
  onProgress?: (progress: DownloadProgressEvent) => void
  filename?: string
}
