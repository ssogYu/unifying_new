/**
 * Request context and lifecycle management
 */

import type { RequestContext } from './types'

/**
 * Manages request contexts and abort controllers
 */
export class RequestContextManager {
  private requestContextMap = new Map<string, RequestContext>()
  private abortControllers = new Map<string, AbortController>()

  /**
   * Create a new request context
   */
  public createContext(requestId: string): RequestContext {
    const context: RequestContext = {
      requestId,
      startTime: Date.now(),
      retryCount: 0,
    }
    this.requestContextMap.set(requestId, context)
    return context
  }

  /**
   * Get request context
   */
  public getContext(requestId: string): RequestContext | undefined {
    return this.requestContextMap.get(requestId)
  }

  /**
   * Update request context
   */
  public updateContext(requestId: string, updates: Partial<RequestContext>): void {
    const context = this.requestContextMap.get(requestId)
    if (context) {
      Object.assign(context, updates)
    }
  }

  /**
   * Remove request context
   */
  public removeContext(requestId: string): void {
    this.requestContextMap.delete(requestId)
  }

  /**
   * Create or get abort controller for request
   */
  public getOrCreateAbortController(requestId: string): AbortController {
    let controller = this.abortControllers.get(requestId)
    if (!controller) {
      controller = new AbortController()
      this.abortControllers.set(requestId, controller)
    }
    return controller
  }

  /**
   * Get abort controller
   */
  public getAbortController(requestId: string): AbortController | undefined {
    return this.abortControllers.get(requestId)
  }

  /**
   * Abort a specific request
   */
  public abort(requestId: string, reason?: string): void {
    const controller = this.abortControllers.get(requestId)
    if (controller && !controller.signal.aborted) {
      controller.abort()
    }
    this.abortControllers.delete(requestId)
    this.requestContextMap.delete(requestId)
  }

  /**
   * Abort all requests
   */
  public abortAll(reason?: string): void {
    this.abortControllers.forEach((controller) => {
      if (!controller.signal.aborted) {
        controller.abort()
      }
    })
    this.abortControllers.clear()
    this.requestContextMap.clear()
  }

  /**
   * Get request duration in milliseconds
   */
  public getDuration(requestId: string): number {
    const context = this.requestContextMap.get(requestId)
    if (!context || !context.startTime) {
      return 0
    }
    return Date.now() - context.startTime
  }

  /**
   * Clear all contexts
   */
  public clear(): void {
    this.abortControllers.clear()
    this.requestContextMap.clear()
  }

  /**
   * Get all pending request IDs
   */
  public getPendingRequestIds(): string[] {
    return Array.from(this.requestContextMap.keys())
  }
}
