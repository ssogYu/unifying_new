/**
 * HTTP Request library types
 */

import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

/**
 * Request retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries?: number
  /** Delay between retries in milliseconds */
  retryDelay?: number
  /** HTTP status codes that trigger a retry */
  retryStatusCodes?: number[]
  /** Whether to retry on network errors */
  retryOnNetworkError?: boolean
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Request timeout in milliseconds */
  request?: number
  /** Response timeout in milliseconds */
  response?: number
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /** Base URL for all requests */
  baseURL?: string
  /** Default timeout configuration */
  timeout?: TimeoutConfig | number
  /** Retry configuration */
  retry?: RetryConfig
  /** Whether to enable request logging */
  enableLogging?: boolean
  /** Request headers */
  headers?: Record<string, string>
  /** HTTP status codes considered successful */
  successStatusCodes?: number[]
}

/**
 * Request context for interceptors
 */
export interface RequestContext {
  /** Number of retry attempts */
  retryCount?: number
  /** Request start time */
  startTime?: number
  /** Request ID for tracing */
  requestId?: string
}

/**
 * HTTP error details
 */
export interface HttpErrorDetail {
  code: string | number
  message: string
  status?: number
  isRetryable: boolean
  context?: Record<string, any>
}

/**
 * Response with metadata
 */
export interface HttpResponse<T = any> extends AxiosResponse<T> {
  /** Time taken to complete the request in milliseconds */
  duration?: number
  /** Request retry count */
  retryCount?: number
}

/**
 * HTTP error with details
 */
export class HttpError extends Error implements HttpErrorDetail {
  code: string | number
  status?: number
  isRetryable: boolean
  context?: Record<string, any>

  constructor(detail: HttpErrorDetail) {
    super(detail.message)
    this.name = 'HttpError'
    this.code = detail.code
    this.message = detail.message
    this.status = detail.status
    this.isRetryable = detail.isRetryable
    this.context = detail.context

    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

/**
 * Request interceptor type
 */
export type RequestInterceptor = (
  config: AxiosRequestConfig
) => AxiosRequestConfig | Promise<AxiosRequestConfig>

/**
 * Response interceptor type
 */
export type ResponseInterceptor = (
  response: AxiosResponse
) => AxiosResponse | Promise<AxiosResponse>

/**
 * Error interceptor type
 */
export type ErrorInterceptor = (
  error: AxiosError
) => AxiosError | void | Promise<AxiosError | void>
