import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type {
  HttpRequestConfig,
  HttpResponse,
  HttpError,
  HttpInstance,
  HttpPlugin,
  UploadConfig,
  DownloadConfig,
  HttpRequestInterceptorHook,
  HttpResponseInterceptorHook,
  HttpErrorInterceptorHook,
  CacheEntry,
} from './types';
import { parseReasonFromStatus, extractErrorMessage, isCancel, asAxiosError } from './errors';
import { HttpError as HttpErrorClass } from './types';
import { MemoryCache } from './cache';
import { TokenManager } from './token';
import { RetryHandler as _RetryHandler, createRetryHandler, type RetryConfig } from './retry';
import { RequestManager } from './requestManager';

export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  retry?: RetryConfig;
  defaultHeaders?: Record<string, string>;
  withCredentials?: boolean;
  maxConcurrent?: number;
  enableCache?: boolean;
  defaultCacheTTL?: number;
  enableDeduplication?: boolean;
  refreshTokenEndpoint?: string;
  refreshTokenMethod?: 'post' | 'POST';
  getAccessTokenFromResponse?: (response: AxiosResponse) => string;
  getRefreshTokenFromResponse?: (response: AxiosResponse) => string;
  getExpiresInFromResponse?: (response: AxiosResponse) => number;
  on401?: () => Promise<void>;
  onTokenRefreshed?: (accessToken: string) => void;
  onTokenRefreshError?: (error: Error) => void;
  requestInterceptor?: HttpRequestInterceptorHook;
  responseInterceptor?: HttpResponseInterceptorHook;
  errorInterceptor?: HttpErrorInterceptorHook;
  plugins?: HttpPlugin[];
}

interface InternalConfig extends HttpRequestConfig {
  signal?: AbortSignal;
  cached?: boolean;
  requestCached?: boolean;
  cacheTTL?: number;
  cacheStaleWhileRevalidate?: boolean;
  defaultCacheTTL?: number;
  enableDeduplication?: boolean;
  abortPrevious?: boolean;
  retry?: boolean;
  retryMaxAttempts?: number;
  retryCount?: number;
  customDataPath?: string;
  refreshTokenEndpoint?: string;
  getAccessTokenFromResponse?: (response: AxiosResponse) => string;
  getRefreshTokenFromResponse?: (response: AxiosResponse) => string;
  getExpiresInFromResponse?: (response: AxiosResponse) => number;
  on401?: () => Promise<void>;
  onTokenRefreshed?: (accessToken: string) => void;
  onTokenRefreshError?: (error: Error) => void;
  onProgress?: (percent: number, loaded: number, total: number) => void;
  isUpload?: boolean;
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'document' | 'text';
}

export class HttpFactory {
  static create(config: HttpClientConfig = {}): HttpInstance {
    const cache = config.enableCache !== false ? new MemoryCache() : null;
    const requestManager = new RequestManager();
    if (config.maxConcurrent) {
      requestManager.setMaxConcurrent(config.maxConcurrent);
    }

    const tokenManager = new TokenManager();
    const retryHandler = config.retry ? createRetryHandler(config.retry) : null;
    const plugins = config.plugins ?? [];

    const axiosInstance: AxiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      withCredentials: config.withCredentials ?? false,
      headers: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders,
      },
    });

    axiosInstance.interceptors.request.use(
      async (axiosConfig: InternalAxiosRequestConfig) => {
        let finalConfig: InternalConfig = axiosConfig as unknown as InternalConfig;

        for (const plugin of plugins) {
          if (plugin.beforeRequest) {
            finalConfig = (await plugin.beforeRequest(finalConfig as unknown as HttpRequestConfig)) as unknown as InternalConfig;
          }
        }

        const accessToken = tokenManager.getAccessToken();
        if (accessToken) {
          const headers = { ...(finalConfig.headers as Record<string, string>) };
          headers['Authorization'] = `Bearer ${accessToken}`;
          finalConfig.headers = headers;
        }

        if (config.requestInterceptor) {
          return (await config.requestInterceptor(finalConfig as unknown as InternalAxiosRequestConfig)) as InternalAxiosRequestConfig;
        }

        return finalConfig as unknown as InternalAxiosRequestConfig;
      },
      (error) => Promise.reject(error)
    );

    axiosInstance.interceptors.response.use(
      async (response: AxiosResponse) => {
        if (config.responseInterceptor) {
          return (await config.responseInterceptor(response as HttpResponse)) as AxiosResponse;
        }
        return response;
      },
      async (axiosError) => {
        if (config.errorInterceptor) {
          const handled = await config.errorInterceptor(axiosError);
          if (handled !== axiosError) {
            return handled;
          }
        }
        return Promise.reject(axiosError);
      }
    );

    const extractErrorCode = (data: unknown): string | undefined => {
      if (!data || typeof data !== 'object') return undefined;
      const obj = data as Record<string, unknown>;
      if (typeof obj.code === 'number' || typeof obj.code === 'string') return String(obj.code);
      if (typeof obj.error_code === 'number' || typeof obj.error_code === 'string') return String(obj.error_code);
      if (typeof obj.errno === 'number' || typeof obj.errno === 'string') return String(obj.errno);
      return undefined;
    };

    const wrapError = (_error: unknown, _axiosConfig?: AxiosRequestConfig): HttpError => {
      let error: unknown = _error;
      if (error instanceof HttpErrorClass) return error;

      const axiosErr = asAxiosError(error);
      const isCancelErr = isCancel(error);

      let status = 0;
      let data: unknown;
      let requestId: string | undefined;
      let url: string | undefined;
      let method: string | undefined;
      let message = 'Unknown error';
      let code: string | undefined;

      if (axiosErr && axiosErr.response) {
        status = axiosErr.response.status;
        data = axiosErr.response.data;
        requestId = (axiosErr.config as InternalConfig)?.requestId;
        url = axiosErr.config?.url;
        method = axiosErr.config?.method?.toUpperCase();
        code = extractErrorCode(data);
        message = extractErrorMessage(data, axiosErr.message || `Request failed with status ${status}`);
      } else if (axiosErr && axiosErr.request) {
        status = 0;
        data = axiosErr.request;
        url = axiosErr.config?.url;
        method = axiosErr.config?.method?.toUpperCase();
        message = axiosErr.message || 'Network error';
      } else if (isCancelErr) {
        status = 0;
        message = 'Request canceled';
      } else {
        status = 0;
        message = (error instanceof Error ? error.message : String(error));
      }

      const reason = parseReasonFromStatus(status, data);
      return new HttpErrorClass(message, status, reason, {
        code,
        requestId,
        url,
        method,
        originalError: error,
      });
    };

    const getDataByPath = <T>(data: unknown, path: string): T => {
      const segments = path.split('.');
      let current: unknown = data;
      for (const seg of segments) {
        if (current == null || typeof current !== 'object') {
          return data as T;
        }
        current = (current as Record<string, unknown>)[seg];
      }
      return (current as T) ?? (data as T);
    };

    const normalizeProgress = (loaded: number, total: number): number => {
      if (!total || total === 0) return 0;
      return Math.round((loaded / total) * 100);
    };

    const doRequest = async <T>(inputConfig: InternalConfig): Promise<HttpResponse<T>> => {
      const requestId = inputConfig.requestId ?? requestManager.generateRequestId();
      const cfg: InternalConfig = { ...inputConfig, requestId };

      let retryCount = 0;
      const maxAttempts = cfg.retryMaxAttempts ?? retryHandler?.getMaxAttempts() ?? (cfg.retry ? 3 : 1);
      const shouldRetry = cfg.retry === true;

      const cacheKey = cfg.url ? `${cfg.url}_${JSON.stringify(cfg.params ?? {})}` : '';

      const abortController = new AbortController();

      requestManager.addRequest(requestId, abortController as unknown as InternalAxiosRequestConfig, () => {}, () => {});

      let returnedFromCache = false;

      while (true) {
        try {
          let finalConfig: InternalConfig = { ...cfg };

          finalConfig.signal = abortController.signal;

          if (cfg.onProgress) {
            if (cfg.isUpload) {
              finalConfig.onUploadProgress = (progressEvent) => {
                const loaded = progressEvent.loaded ?? 0;
                const total = progressEvent.total ?? 0;
                cfg.onProgress!(normalizeProgress(loaded, total), loaded, total);
              };
            } else {
              finalConfig.onDownloadProgress = (progressEvent) => {
                const loaded = progressEvent.loaded ?? 0;
                const total = progressEvent.total ?? 0;
                cfg.onProgress!(normalizeProgress(loaded, total), loaded, total);
              };
            }
          }

          if (cache && cfg.method?.toLowerCase() === 'get' && cfg.requestCached !== false) {
            const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
            if (cached) {
              if (cached.isFresh()) {
                finalConfig.cached = true;
                requestManager.removeRequest(requestId);
                const httpResponse: HttpResponse<T> = {
                  data: cached.data,
                  status: 200,
                  statusText: 'OK',
                  headers: {},
                  config: finalConfig as unknown as InternalAxiosRequestConfig,
                  request: {},
                } as HttpResponse<T>;
                httpResponse.requestId = requestId;
                httpResponse.cached = true;
                return httpResponse;
              }
              if (cached.isStale() && cfg.cacheStaleWhileRevalidate) {
                finalConfig.cached = true;
                returnedFromCache = true;
              }
            }
          }

          if (cfg.enableDeduplication !== false && cfg.abortPrevious) {
            requestManager.abortByKey(requestManager.getDeduplicationKey(finalConfig as unknown as InternalAxiosRequestConfig));
          }

          const axiosResp: AxiosResponse<T> = await axiosInstance.request<T>(finalConfig as AxiosRequestConfig);

          requestManager.removeRequest(requestId);

          if (cache && cfg.method?.toLowerCase() === 'get' && cfg.requestCached !== false && cacheKey) {
            const cacheTTL = cfg.cacheTTL ?? cfg.defaultCacheTTL ?? 30000;
            cache.set(cacheKey, axiosResp.data, cacheTTL, {
              etag: axiosResp.headers?.etag as string | undefined,
              lastModified: axiosResp.headers?.['last-modified'] as string | undefined,
            });
          }

          let responseData: T = axiosResp.data;
          if (cfg.customDataPath) {
            responseData = getDataByPath<T>(responseData, cfg.customDataPath);
          }

          const httpResponse: HttpResponse<T> = axiosResp as HttpResponse<T>;
          httpResponse.data = responseData;
          httpResponse.requestId = requestId;
          httpResponse.cached = returnedFromCache;
          return httpResponse;
        } catch (error) {
          if (abortController.signal.aborted) {
            const cancelError = new Error('Request canceled');
            cancelError.name = 'CanceledError';
            throw cancelError;
          }

          requestManager.removeRequest(requestId);

          const httpError = wrapError(error, cfg as AxiosRequestConfig);

          if (shouldRetry && retryCount < maxAttempts && retryHandler?.shouldRetry(httpError)) {
            retryCount++;
            const delay = retryHandler.getDelay(retryCount - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));

            const newController = new AbortController();
            abortController.signal.addEventListener('abort', () => newController.abort());
            Object.assign(abortController, newController);
            requestManager.addRequest(requestId, newController as unknown as InternalAxiosRequestConfig, () => {}, () => {});

            continue;
          }

          if (httpError.status === 401 && tokenManager.getRefreshToken()) {
            const refreshEndpoint = cfg.refreshTokenEndpoint ?? config.refreshTokenEndpoint ?? '/auth/refresh';
            const refreshMethod = config.refreshTokenMethod ?? 'POST';

            const refreshFn = async () => {
              const refreshResp = await axiosInstance.request<{ access_token: string; refresh_token?: string; expires_in?: number }>({
                url: refreshEndpoint,
                method: refreshMethod,
                // data: { refresh_token: tokenManager.getRefreshToken() },//cookie自动带上，不兼容移动端和小程序
                headers: { 'Content-Type': 'application/json' },
              });
              const accessToken = config.getAccessTokenFromResponse
                ? config.getAccessTokenFromResponse(refreshResp)
                : (refreshResp.data as { access_token: string }).access_token;
              const refreshToken = config.getRefreshTokenFromResponse
                ? config.getRefreshTokenFromResponse(refreshResp)
                : (refreshResp.data as { refresh_token?: string }).refresh_token;
              return { accessToken, refreshToken };
            };

            try {
              const tokens = await tokenManager.withRefreshLock(refreshFn);
              const headers = { ...(cfg.headers as Record<string, string>) };
              headers['Authorization'] = `Bearer ${tokens.accessToken}`;
              cfg.headers = headers;
              if (cfg.onTokenRefreshed) {
                cfg.onTokenRefreshed(tokens.accessToken);
              } else if (config.onTokenRefreshed) {
                config.onTokenRefreshed(tokens.accessToken);
              }
              continue;
            } catch (refreshError) {
              tokenManager.clearTokens();
              if (cfg.onTokenRefreshError) {
                cfg.onTokenRefreshError(refreshError as Error);
              } else if (config.onTokenRefreshError) {
                config.onTokenRefreshError(refreshError as Error);
              }
              if (cfg.on401) {
                await cfg.on401();
              } else if (config.on401) {
                await config.on401();
              }
              throw httpError;
            }
          }

          throw httpError;
        }
      }
    };

    const httpInstance: HttpInstance = {
      request: <T = unknown>(config: HttpRequestConfig) => {
        return doRequest<T>(config as InternalConfig);
      },

      get: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => {
        return doRequest<T>({ ...(config ?? {}), method: 'GET', url } as InternalConfig);
      },

      post: <T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>) => {
        return doRequest<T>({ ...(config ?? {}), method: 'POST', url, data } as InternalConfig);
      },

      put: <T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>) => {
        return doRequest<T>({ ...(config ?? {}), method: 'PUT', url, data } as InternalConfig);
      },

      delete: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => {
        return doRequest<T>({ ...(config ?? {}), method: 'DELETE', url } as InternalConfig);
      },

      patch: <T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>) => {
        return doRequest<T>({ ...(config ?? {}), method: 'PATCH', url, data } as InternalConfig);
      },

      head: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => {
        return doRequest<T>({ ...(config ?? {}), method: 'HEAD', url } as InternalConfig);
      },

      options: <T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>) => {
        return doRequest<T>({ ...(config ?? {}), method: 'OPTIONS', url } as InternalConfig);
      },

      upload: <T = unknown>(uploadConfig: UploadConfig) => {
        const { url, method = 'POST', file, filename, fieldName = 'file', headers, params, onProgress, timeout, retry, retryMaxAttempts, requestId } = uploadConfig;
        const formData = new FormData();
        formData.append(fieldName, file as File | Blob, filename);
        return doRequest<T>({
          url,
          method,
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            ...headers,
          },
          params,
          timeout: timeout ?? 60000,
          retry,
          retryMaxAttempts,
          requestId,
          onProgress,
          isUpload: true,
        } as unknown as InternalConfig);
      },

      download: <T = unknown>(downloadConfig: DownloadConfig) => {
        const { url, method = 'GET', data, headers, params, onProgress, timeout, retry, retryMaxAttempts, requestId, responseType = 'blob' } = downloadConfig;
        return doRequest<T>({
          url,
          method,
          data,
          headers,
          params,
          timeout: timeout ?? 60000,
          retry,
          retryMaxAttempts,
          requestId,
          onProgress,
          isUpload: false,
          responseType,
        } as unknown as InternalConfig);
      },

      abort: (requestId?: string) => {
        if (requestId) {
          requestManager.abortRequest(requestId);
        }
      },

      abortAll: () => {
        requestManager.abortAll();
      },

      clearCache: () => {
        if (cache) {
          cache.clear();
        }
      },

      setToken: (token: string | null) => {
        if (token) {
          tokenManager.setTokens(token);
        } else {
          tokenManager.clearTokens();
        }
      },

      setHeader: (key: string, value: string | null) => {
        if (value === null) {
          delete axios.defaults.headers.common[key];
        } else {
          (axios.defaults.headers.common as Record<string, string>)[key] = value;
        }
      },

      getToken: () => {
        return tokenManager.getAccessToken();
      },

      hasPendingRequests: () => {
        return requestManager.hasPending();
      },

      getPendingCount: () => {
        return requestManager.getPendingCount();
      },
    };

    return httpInstance;
  }
}

export const createHttpClient = (config?: HttpClientConfig): HttpInstance => {
  return HttpFactory.create(config);
};
