/**
 * HTTP module exports
 */

export * from './types'
export * from './utils'
export * from './logger'
export { HttpClient } from './client'

import { HttpClient } from './client'
import type { HttpClientConfig } from './types'

/**
 * Create and configure a default HTTP client instance
 */
let defaultClient: HttpClient | null = null

export function createHttpClient(config?: HttpClientConfig): HttpClient {
  return new HttpClient(config)
}

export function getDefaultHttpClient(): HttpClient {
  if (!defaultClient) {
    defaultClient = new HttpClient({
      enableLogging: false,
    })
  }
  return defaultClient
}

export function setDefaultHttpClient(client: HttpClient): void {
  defaultClient = client
}

/**
 * Convenience methods using default client
 */
export async function get<T = any>(url: string, config?: any) {
  return getDefaultHttpClient().get<T>(url, config)
}

export async function post<T = any>(url: string, data?: any, config?: any) {
  return getDefaultHttpClient().post<T>(url, data, config)
}

export async function put<T = any>(url: string, data?: any, config?: any) {
  return getDefaultHttpClient().put<T>(url, data, config)
}

export async function patch<T = any>(url: string, data?: any, config?: any) {
  return getDefaultHttpClient().patch<T>(url, data, config)
}

export async function del<T = any>(url: string, config?: any) {
  return getDefaultHttpClient().delete<T>(url, config)
}
