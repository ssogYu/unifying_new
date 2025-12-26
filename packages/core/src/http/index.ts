import { HttpClient } from './http-client'

export { HttpClient } from './http-client'
export { HttpErrorHandler } from './error-handler'
export { CacheManager } from './cache-manager'
export { CancelManager } from './cancel-manager'
export { RetryManager } from './retry-manager'
export type {
  HttpConfig,
  RequestConfig,
  ResponseData,
  HttpError,
  CacheConfig,
  RetryConfig,
  RequestQueueItem,
  HttpMethod,
  UploadProgressEvent,
  DownloadProgressEvent,
  UploadOptions,
  DownloadOptions
} from './types'

export function createHttpClient(config?: import('./types').HttpConfig): HttpClient {
  return new HttpClient(config)
}
