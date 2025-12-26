import type { HttpError, RetryConfig } from './types'

export class RetryManager {
  private retryConfig: RetryConfig = {
    count: 3,
    delay: 1000
  }

  constructor(config?: Partial<RetryConfig>) {
    if (config) {
      this.retryConfig = { ...this.retryConfig, ...config }
    }
  }

  async retry<T>(
    fn: () => Promise<T>,
    error: HttpError,
    currentRetry: number = 0
  ): Promise<T> {
    if (currentRetry >= this.retryConfig.count) {
      throw error
    }

    if (this.retryConfig.retryCondition && !this.retryConfig.retryCondition(error)) {
      throw error
    }

    const delay = this.calculateDelay(currentRetry)
    
    await this.sleep(delay)
    
    try {
      return await fn()
    } catch (err) {
      const httpError = err as HttpError
      return this.retry(fn, httpError, currentRetry + 1)
    }
  }

  private calculateDelay(currentRetry: number): number {
    const delay = this.retryConfig.delay
    if (typeof delay === 'function') {
      return delay(currentRetry)
    }
    
    return delay * Math.pow(2, currentRetry)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  shouldRetry(error: HttpError): boolean {
    if (this.retryConfig.retryCondition) {
      return this.retryConfig.retryCondition(error)
    }
    
    return this.defaultRetryCondition(error)
  }

  private defaultRetryCondition(error: HttpError): boolean {
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

  updateConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config }
  }

  getConfig(): RetryConfig {
    return { ...this.retryConfig }
  }
}
