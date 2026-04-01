import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export type RequestMethod = 'get' | 'GET' | 'post' | 'POST' | 'put' | 'PUT' | 'delete' | 'DELETE' | 'patch' | 'PATCH' | 'head' | 'HEAD' | 'options' | 'OPTIONS';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type AxiosRequestConfigOverride = AxiosRequestConfig & {
  requestId?: string;// 请求ID
  requestDeduplicated?: boolean;// 是否去重
  requestCached?: boolean;// 是否缓存
  cached?: boolean;// 是否缓存
  cacheTTL?: number;// 缓存时间，单位秒
  cacheStaleWhileRevalidate?: boolean;// 是否缓存过期时，是否使用缓存
  retryCount?: number;// 重试次数
  retry?: boolean;// 是否重试
  retryDelay?: number;// 重试延迟，单位毫秒
  retryMaxAttempts?: number;// 最大重试次数
  retryConditions?: ((error: HttpError) => boolean)[];// 重试条件
  abortPrevious?: boolean;// 是否取消之前的请求
  uploadProgress?: (percent: number) => void;// 上传进度回调
  downloadProgress?: (percent: number) => void;// 下载进度回调
  on401?: () => Promise<void>;// 401错误回调
  shouldRefreshToken?: () => Promise<boolean>;// 是否刷新token
  onTokenRefreshed?: (accessToken: string) => void;// token刷新成功回调
  onTokenRefreshError?: (error: Error) => void;// token刷新失败回调
  customDataPath?: string;// 自定义数据路径
 };

export type HttpRequestConfig = Omit<AxiosRequestConfigOverride, 'headers' | 'method' | 'url' | 'baseURL' | 'data' | 'params'> & {
  method?: RequestMethod;
  url: string;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
};

export type ResponseWrap<T = unknown> = {
  code: number;
  message: string;
  data: T;
  success: boolean;
  requestId?: string;
  timestamp?: number;
};

export type HttpResponse<T = unknown> = AxiosResponse<T> & {
  requestId?: string;
  cached?: boolean;
};

export type HttpErrorDetail = {
  code?: string;
  field?: string;
  message: string;
};

export type HttpErrorReason =
  | { type: 'timeout'; message: string }
  | { type: 'network'; message: string }
  | { type: 'server'; status: number; message: string }
  | { type: 'client'; status: number; data: unknown; message: string }
  | { type: 'cancel'; message: string }
  | { type: 'validation'; errors: HttpErrorDetail[]; message: string }
  | { type: 'unauthorized'; message: string }
  | { type: 'forbidden'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'rate_limit'; retryAfter?: number; message: string }
  | { type: 'unknown'; message: string };

export class HttpError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly reason: HttpErrorReason;
  public readonly requestId?: string;
  public readonly url?: string;
  public readonly method?: string;
  public readonly isHttpError: true;
  public readonly originalError?: unknown;

  constructor(
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
  ) {
    super(message);
    this.name = 'HttpError';
    this.code = options?.code ?? String(status);
    this.status = status;
    this.reason = reason;
    this.requestId = options?.requestId;
    this.url = options?.url;
    this.method = options?.method;
    this.isHttpError = true;
    this.originalError = options?.originalError;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

export type ResponseInterceptorSuccess<T = unknown> = (
  response: HttpResponse<T>
) => HttpResponse<T> | Promise<HttpResponse<T>>;

export type ResponseInterceptorError = (
  error: unknown
) => unknown;

export interface TokenProvider {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearTokens: () => void;
  isAccessTokenExpired: () => boolean;
}

export interface HttpPlugin {
  name: string;
  beforeRequest?: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;
  afterResponse?: <T>(response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
  onError?: (error: HttpError) => HttpError | Promise<HttpError>;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
  isFresh: () => boolean;
  isStale: () => boolean;
}

export type HttpRequestInterceptorHook = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
export type HttpResponseInterceptorHook<T = unknown> = (response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
export type HttpErrorInterceptorHook = (error: unknown) => unknown;

export interface HttpInstance {
  request: <T = unknown>(config: HttpRequestConfig) => Promise<HttpResponse<T>>;
  get: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => Promise<HttpResponse<T>>;
  post: <T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>) => Promise<HttpResponse<T>>;
  put: <T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>) => Promise<HttpResponse<T>>;
  delete: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => Promise<HttpResponse<T>>;
  patch: <T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>) => Promise<HttpResponse<T>>;
  head: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => Promise<HttpResponse<T>>;
  options: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => Promise<HttpResponse<T>>;
  upload: <T = unknown>(config: UploadConfig) => Promise<HttpResponse<T>>;
  download: <T = unknown>(config: DownloadConfig) => Promise<HttpResponse<T>>;
  abort: (requestId?: string) => void;
  abortAll: () => void;
  clearCache: () => void;
  setToken: (token: string | null) => void;
  setHeader: (key: string, value: string | null) => void;
  getToken: () => string | null;
  hasPendingRequests: () => boolean;
  getPendingCount: () => number;
}

export interface UploadConfig {
  url: string;
  method?: HttpMethod;
  file: File | Blob | FormData;
  filename?: string;
  fieldName?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  onProgress?: (percent: number, loaded: number, total: number) => void;
  timeout?: number;
  retry?: boolean;
  retryMaxAttempts?: number;
  requestId?: string;
}

export interface DownloadConfig {
  url: string;
  method?: HttpMethod;
  data?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  onProgress?: (percent: number, loaded: number, total: number) => void;
  timeout?: number;
  retry?: boolean;
  retryMaxAttempts?: number;
  requestId?: string;
  responseType?: 'blob' | 'arraybuffer' | 'stream';
}
