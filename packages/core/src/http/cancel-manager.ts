import { CancelTokenSource, Canceler } from 'axios'

export class CancelManager {
  private pendingRequests: Map<string, CancelTokenSource> = new Map()

  generateCancelKey(config: any): string {
    const { url, method, params, data } = config
    const paramsStr = params ? JSON.stringify(params) : ''
    const dataStr = data ? JSON.stringify(data) : ''
    return `${method}:${url}:${paramsStr}:${dataStr}`
  }

  addPendingRequest(config: any, cancelTokenSource: CancelTokenSource): void {
    const key = this.generateCancelKey(config)
    this.pendingRequests.set(key, cancelTokenSource)
  }

  removePendingRequest(config: any): void {
    const key = this.generateCancelKey(config)
    this.pendingRequests.delete(key)
  }

  cancelRequest(config: any, reason?: string): void {
    const key = this.generateCancelKey(config)
    const cancelTokenSource = this.pendingRequests.get(key)
    
    if (cancelTokenSource) {
      cancelTokenSource.cancel(reason || 'Request canceled')
      this.pendingRequests.delete(key)
    }
  }

  cancelAll(reason?: string): void {
    for (const [key, cancelTokenSource] of this.pendingRequests.entries()) {
      cancelTokenSource.cancel(reason || 'All requests canceled')
    }
    this.pendingRequests.clear()
  }

  cancelByPattern(pattern: RegExp, reason?: string): void {
    for (const [key, cancelTokenSource] of this.pendingRequests.entries()) {
      if (pattern.test(key)) {
        cancelTokenSource.cancel(reason || 'Request canceled by pattern')
        this.pendingRequests.delete(key)
      }
    }
  }

  cancelByKey(key: string, reason?: string): void {
    const cancelTokenSource = this.pendingRequests.get(key)
    if (cancelTokenSource) {
      cancelTokenSource.cancel(reason || 'Request canceled by key')
      this.pendingRequests.delete(key)
    }
  }

  hasPendingRequest(config: any): boolean {
    const key = this.generateCancelKey(config)
    return this.pendingRequests.has(key)
  }

  getPendingRequestsCount(): number {
    return this.pendingRequests.size
  }

  getPendingRequestKeys(): string[] {
    return Array.from(this.pendingRequests.keys())
  }

  clear(): void {
    this.pendingRequests.clear()
  }
}
