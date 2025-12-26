import type { HttpError, ResponseData } from './types'
import { AxiosError, isCancel } from 'axios'

export class HttpErrorHandler {
  private defaultErrorMessage = '请求失败，请稍后重试'

  handleError(error: any): HttpError {
    const httpError = this.normalizeError(error)
    
    if (!httpError.isCancel) {
      this.logError(httpError)
    }
    
    return httpError
  }

  private normalizeError(error: any): HttpError {
    if (error.isAxiosError) {
      return this.normalizeAxiosError(error)
    }
    
    if (error instanceof Error) {
      return {
        ...error,
        name: error.name,
        isAxiosError: false,
        isCancel: false,
        isTimeout: false,
        isNetworkError: false
      }
    }
    
    return {
      name: 'HttpError',
      message: this.defaultErrorMessage,
      isAxiosError: false,
      isCancel: false,
      isTimeout: false,
      isNetworkError: false
    }
  }

  private normalizeAxiosError(error: AxiosError): HttpError {
    const httpError: HttpError = {
      ...error,
      name: error.name,
      message: this.getErrorMessage(error),
      isAxiosError: true,
      isCancel: isCancel(error),
      isTimeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT',
      isNetworkError: !error.response && !error.request,
      response: error.response as any
    }
    
    return httpError
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response) {
      const responseData = error.response.data as ResponseData
      return responseData?.message || this.getStatusMessage(error.response.status)
    }
    
    if (error.request) {
      if (error.code === 'ECONNABORTED') {
        return '请求超时，请检查网络连接'
      }
      return '网络错误，请检查网络连接'
    }
    
    if (error.message) {
      return error.message
    }
    
    return this.defaultErrorMessage
  }

  private getStatusMessage(status: number): string {
    const statusMessages: Record<number, string> = {
      400: '请求参数错误',
      401: '未授权，请重新登录',
      403: '拒绝访问',
      404: '请求资源不存在',
      405: '请求方法不允许',
      408: '请求超时',
      409: '请求冲突',
      422: '请求参数验证失败',
      429: '请求过于频繁，请稍后重试',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务不可用',
      504: '网关超时'
    }
    
    return statusMessages[status] || `请求失败，状态码：${status}`
  }

  private logError(error: HttpError): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[HTTP Error]', {
        message: error.message,
        config: error.config,
        code: error.code,
        response: error.response?.data
      })
    }
  }

  shouldRetry(error: HttpError): boolean {
    if (error.isCancel) {
      return false
    }
    
    if (error.isTimeout) {
      return true
    }
    
    if (error.isNetworkError) {
      return true
    }
    
    if (error.response) {
      const status = error.response.status
      return [408, 429, 500, 502, 503, 504].includes(status)
    }
    
    return false
  }
}
