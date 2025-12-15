/**
 * HTTP client utility functions
 */

import type { AxiosError } from 'axios'

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown, retryStatusCodes: number[] = []): boolean {
  if (!error) return false

  const axiosError = error as AxiosError

  // Network errors are retryable
  if (!axiosError.response) {
    return true
  }

  // Check if status code is in retry list
  const statusCode = axiosError.response.status
  if (retryStatusCodes.includes(statusCode)) {
    return true
  }

  // Default retryable status codes: 408, 429, 500, 502, 503, 504
  const defaultRetryStatusCodes = [408, 429, 500, 502, 503, 504]
  return defaultRetryStatusCodes.includes(statusCode)
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Parse error message from AxiosError
 */
export function parseErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError

  if (!axiosError) return 'Unknown error'

  if (axiosError.response) {
    const data = axiosError.response.data as any
    if (!data) return axiosError.message || 'Request failed'
    
    // Handle nested error message structures
    return (
      data.message ||
      data.msg ||
      data.error?.message ||
      data.error?.msg ||
      data.errors?.[0]?.message ||
      axiosError.message ||
      'Request failed'
    )
  }

  if (axiosError.request) {
    return 'No response received from server'
  }

  return axiosError.message || 'Request initialization failed'
}

/**
 * Get error code from AxiosError
 */
export function getErrorCode(error: unknown): string | number {
  const axiosError = error as AxiosError

  if (!axiosError) return 'UNKNOWN_ERROR'

  if (axiosError.response) {
    return axiosError.response.status
  }

  return axiosError.code || 'NETWORK_ERROR'
}

/**
 * Format headers for logging (removes sensitive data)
 */
export function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers }
  const sensitiveKeys = ['authorization', 'cookie', 'x-token', 'x-api-key', 'token']

  sensitiveKeys.forEach((key) => {
    if (sanitized[key]) {
      sanitized[key] = '***'
    }
  })

  return sanitized
}

/**
 * Validate HTTP status code
 */
export function isSuccessStatusCode(status: number, successCodes: number[] = []): boolean {
  if (successCodes.length > 0) {
    return successCodes.includes(status)
  }
  return status >= 200 && status < 300
}

/**
 * Exponential backoff calculation
 */
export function calculateBackoffDelay(retryCount: number, baseDelay: number = 1000): number {
  const delay = baseDelay * Math.pow(2, retryCount)
  const jitter = delay * 0.1 * Math.random() // Add 10% jitter
  return Math.min(delay + jitter, 30000) // Cap at 30 seconds
}
