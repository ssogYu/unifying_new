/**
 * Configuration management and normalization
 */

import type { HttpClientConfig, TimeoutConfig, RetryConfig } from './types'

/**
 * Default configuration values
 */
const DEFAULTS = {
  timeout: {
    request: 30000,
    response: 30000,
  },
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    retryStatusCodes: [],
    retryOnNetworkError: true,
  },
}

/**
 * Configuration manager for HTTP client
 */
export class ConfigManager {
  private config: HttpClientConfig

  constructor(config: HttpClientConfig = {}) {
    this.config = this.normalize(config)
  }

  /**
   * Normalize and validate configuration
   */
  private normalize(config: HttpClientConfig): HttpClientConfig {
    return {
      baseURL: config.baseURL || '',
      timeout: this.normalizeTimeout(config.timeout),
      retry: this.normalizeRetry(config.retry),
      enableLogging: config.enableLogging ?? false,
      headers: config.headers || {},
      successStatusCodes: config.successStatusCodes || [],
    }
  }

  /**
   * Normalize timeout configuration
   */
  private normalizeTimeout(timeout?: TimeoutConfig | number): TimeoutConfig {
    if (!timeout) {
      return DEFAULTS.timeout
    }

    if (typeof timeout === 'number') {
      return {
        request: timeout,
        response: timeout,
      }
    }

    return {
      request: timeout.request ?? DEFAULTS.timeout.request,
      response: timeout.response ?? DEFAULTS.timeout.response,
    }
  }

  /**
   * Normalize retry configuration
   */
  private normalizeRetry(retry?: RetryConfig): RetryConfig {
    return {
      maxRetries: retry?.maxRetries ?? DEFAULTS.retry.maxRetries,
      retryDelay: retry?.retryDelay ?? DEFAULTS.retry.retryDelay,
      retryStatusCodes: retry?.retryStatusCodes ?? DEFAULTS.retry.retryStatusCodes,
      retryOnNetworkError: retry?.retryOnNetworkError ?? DEFAULTS.retry.retryOnNetworkError,
    }
  }

  /**
   * Get current configuration
   */
  public get(): HttpClientConfig {
    return { ...this.config }
  }

  /**
   * Get a specific config value
   */
  public getValue<K extends keyof HttpClientConfig>(key: K): HttpClientConfig[K] {
    return this.config[key]
  }

  /**
   * Update configuration
   */
  public update(updates: Partial<HttpClientConfig>): void {
    this.config = this.normalize({
      ...this.config,
      ...updates,
    })
  }

  /**
   * Merge configuration
   */
  public merge(updates: Partial<HttpClientConfig>): void {
    this.config = this.normalize({
      ...this.config,
      ...updates,
    })
  }

  /**
   * Reset to defaults
   */
  public reset(): void {
    this.config = {
      baseURL: '',
      timeout: DEFAULTS.timeout,
      retry: DEFAULTS.retry,
      enableLogging: false,
      headers: {},
      successStatusCodes: [],
    }
  }

  /**
   * Validate configuration
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    const retryConfig = this.config.retry
    if (retryConfig && retryConfig.maxRetries && retryConfig.maxRetries < 0) {
      errors.push('maxRetries must be non-negative')
    }

    if (retryConfig && retryConfig.retryDelay && retryConfig.retryDelay < 0) {
      errors.push('retryDelay must be non-negative')
    }

    const timeoutConfig = this.config.timeout as TimeoutConfig
    if (timeoutConfig.request && timeoutConfig.request < 0) {
      errors.push('request timeout must be non-negative')
    }

    if (timeoutConfig.response && timeoutConfig.response < 0) {
      errors.push('response timeout must be non-negative')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
