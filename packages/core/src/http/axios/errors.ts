import type { AxiosError } from 'axios';
import type { HttpErrorReason, HttpErrorDetail } from './types';
import { HttpError } from './types';

export function buildHttpError(
  message: string,
  status: number,
  reason: HttpErrorReason,
  options?: {
    code?: string;
    requestId?: string;
    url?: string;
    method?: string;
    originalError?: unknown;
  }
): HttpError {
  return new HttpError(message, status, reason, options);
}

export function parseReasonFromStatus(status: number, data?: unknown): HttpErrorReason {
  switch (status) {
    case 400:
      return {
        type: 'client',
        status,
        data: data ?? null,
        message: 'Bad Request',
      };
    case 401:
      return { type: 'unauthorized', message: 'Unauthorized' };
    case 403:
      return { type: 'forbidden', message: 'Forbidden' };
    case 404:
      return { type: 'not_found', message: 'Not Found' };
    case 422:
      if (data && typeof data === 'object' && 'errors' in data && Array.isArray((data as Record<string, unknown>).errors)) {
        return {
          type: 'validation',
          errors: ((data as Record<string, unknown>).errors as HttpErrorDetail[]).map((e) => ({
            code: e.code ?? 'VALIDATION_ERROR',
            field: e.field,
            message: e.message,
          })),
          message: 'Validation Error',
        };
      }
      return {
        type: 'client',
        status,
        data: data ?? null,
        message: 'Unprocessable Entity',
      };
    case 429: {
      const retryAfter = extractRetryAfter(data);
      return {
        type: 'rate_limit',
        message: 'Too Many Requests',
        retryAfter,
      };
    }
    case 500:
      return { type: 'server', status, message: 'Internal Server Error' };
    case 502:
      return { type: 'server', status, message: 'Bad Gateway' };
    case 503:
      return { type: 'server', status, message: 'Service Unavailable' };
    case 504:
      return { type: 'server', status, message: 'Gateway Timeout' };
    default:
      if (status >= 400 && status < 500) {
        return {
          type: 'client',
          status,
          data: data ?? null,
          message: `Client Error (${status})`,
        };
      }
      return {
        type: 'unknown',
        message: `Unknown Error (${status})`,
      };
  }
}

function extractRetryAfter(data: unknown): number | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as Record<string, unknown>;
  const raw = obj.retryAfter ?? obj.retry_after ?? obj.RetryAfter;
  if (typeof raw === 'number' && raw > 0) return raw;
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

export function extractErrorMessage(data: unknown, defaultMessage: string): string {
  if (!data) return defaultMessage;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if ('message' in obj && typeof obj.message === 'string') return obj.message;
    if ('error' in obj && typeof obj.error === 'string') return obj.error;
    if ('msg' in obj && typeof obj.msg === 'string') return obj.msg;
    if ('errorMessage' in obj && typeof obj.errorMessage === 'string') return obj.errorMessage;
  }
  return defaultMessage;
}

export function isAxiosError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    '__isAxiosError' in error
  );
}

export function asAxiosError(error: unknown): AxiosError | null {
  if (isAxiosError(error)) return error as AxiosError;
  return null;
}

export function isCancel(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const obj = error as Record<string, unknown>;
  if (obj.name === 'CanceledError' || obj.name === 'Cancel') return true;
  const cancelToken = obj.__CANCEL__;
  if (cancelToken === true) return true;
  return false;
}
