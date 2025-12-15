/**
 * Interceptor management for HTTP client
 */

import type {
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from './types'

/**
 * Manages request, response, and error interceptors
 */
export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  /**
   * Add a new set of interceptors
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
   * Get request interceptors
   */
  public getRequestInterceptors(): RequestInterceptor[] {
    return this.requestInterceptors
  }

  /**
   * Get response interceptors
   */
  public getResponseInterceptors(): ResponseInterceptor[] {
    return this.responseInterceptors
  }

  /**
   * Get error interceptors
   */
  public getErrorInterceptors(): ErrorInterceptor[] {
    return this.errorInterceptors
  }

  /**
   * Clear all interceptors
   */
  public clear(): void {
    this.requestInterceptors = []
    this.responseInterceptors = []
    this.errorInterceptors = []
  }
}
