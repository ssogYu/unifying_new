import type { HttpError } from './types';

export interface RetryConfig {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  retryOnNetworkError?: boolean;
  retryConditions?: ((error: HttpError) => boolean)[];
}

export class RetryHandler {
  constructor(private config: Required<RetryConfig>) {}

  shouldRetry(error: HttpError): boolean {
    if (this.config.retryConditions && this.config.retryConditions.length > 0) {
      return this.config.retryConditions.some((condition) => condition(error));
    }
    const reason = error.reason;
    if (reason.type === 'network' && this.config.retryOnNetworkError) return true;
    if (reason.type === 'server') return reason.status === 500 || reason.status === 503;
    if (reason.type === 'rate_limit') return true;
    if (reason.type === 'timeout') return true;
    return false;
  }

  getDelay(attemptIndex: number): number {
    const delay = this.config.delay * Math.pow(this.config.backoffMultiplier, attemptIndex);
    return Math.min(delay, this.config.maxDelay);
  }

  getMaxAttempts(): number {
    return this.config.maxAttempts;
  }

  static defaultRetryConditions(error: HttpError): boolean {
    const reason = error.reason;
    if (reason.type === 'network') return true;
    if (reason.type === 'server') return reason.status === 500 || reason.status === 503;
    if (reason.type === 'rate_limit') return true;
    if (reason.type === 'timeout') return true;
    return false;
  }
}

export function createRetryHandler(config?: RetryConfig): RetryHandler {
  return new RetryHandler({
    maxAttempts: config?.maxAttempts ?? 3,
    delay: config?.delay ?? 1000,
    backoffMultiplier: config?.backoffMultiplier ?? 2,
    maxDelay: config?.maxDelay ?? 30000,
    retryOnNetworkError: config?.retryOnNetworkError ?? true,
    retryConditions: config?.retryConditions ?? [],
  });
}
