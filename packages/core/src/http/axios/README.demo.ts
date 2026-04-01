import { createHttpClient, HttpError, type HttpInstance, type HttpPlugin } from '../index';
import type { AxiosResponse } from 'axios';

const BASE_URL = 'https://api.example.com';

const http: HttpInstance = createHttpClient({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  retry: {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
    retryOnNetworkError: true,
  },
  enableCache: true,
  defaultCacheTTL: 30000,
  enableDeduplication: true,
  maxConcurrent: 50,
  refreshTokenEndpoint: '/auth/refresh',
  on401: async () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
});

export { http };

const _http2 = createHttpClient({ baseURL: BASE_URL });

async function basicCrud() {
  const users = await http.get<{ id: string; name: string; email: string }[]>('/users');
  const user = await http.get<{ id: string; name: string }>('/users/1');
  const searchResults = await http.get<{ list: unknown[]; total: number }>('/users/search', {
    params: { q: 'keyword', page: 1, pageSize: 20 },
  });
  const created = await http.post<{ id: string }>('/users', { name: 'Tom', email: 'tom@example.com' });
  const updated = await http.put<{ id: string }>('/users/1', { name: 'Tom Updated' });
  const patched = await http.patch<{ id: string }>('/users/1', { name: 'Tom Patched' });
  await http.delete('/users/1');
  console.log(users, user, searchResults, created, updated, patched);
}

async function tokenManagement() {
  const res = await http.post<{ access_token: string; refresh_token: string }>('/auth/login', {
    email: 'user@example.com',
    password: 'password123',
  });
  http.setToken(res.data.access_token);
  http.setToken(null);
  http.setHeader('X-Custom-Header', 'value');
  http.setHeader('X-Custom-Header', null);
}

async function autoRefreshToken() {
  const httpWithRefresh = createHttpClient({
    baseURL: BASE_URL,
    refreshTokenEndpoint: '/auth/refresh',
    getAccessTokenFromResponse: (resp: AxiosResponse<{ access_token: string; refresh_token: string }>) => resp.data.access_token,
    getRefreshTokenFromResponse: (resp: AxiosResponse<{ access_token: string; refresh_token: string }>) => resp.data.refresh_token,
    onTokenRefreshed: (token: string) => console.log('Token refreshed:', token),
    onTokenRefreshError: (err: Error) => console.error('Refresh failed:', err),
    on401: async () => { window.location.href = '/login'; },
  });

  const res:any = await httpWithRefresh.post('/auth/login', { email: 'user@example.com', password: 'password' });
  httpWithRefresh.setToken(res.data.access_token);
}

async function requestOverrides() {
  await http.get('/users', { requestCached: false });
  await http.post('/orders', { item: 'abc' }, { retry: false });
  await http.get('/debug-info', { timeout: 5000 });
  await http.get('/trace-me', {
    requestId: `req-${crypto.randomUUID()}`,
    headers: { 'X-Trace-ID': crypto.randomUUID() },
  });
}

async function cachingExamples() {
  const res1 = await http.get<{ revenue: number }>('/dashboard/stats', { requestCached: true });
  if (res1.cached) console.log('from cache');

  const res2 = await http.get<{ id: string }[]>('/products', {
    requestCached: true,
    cacheTTL: 60000,
  });

  const res3 = await http.get<{ feed: unknown[] }>('/feed', {
    requestCached: true,
    cacheStaleWhileRevalidate: true,
  });
  if (res3.cached) console.log('stale cache returned, revalidation in background');

  http.clearCache();
}

async function deduplicationAndCancel() {
  const req1 = http.get('/search', {
    params: { q: 'query A' },
    abortPrevious: true,
    requestId: 'search-query-A',
  });

  const req2 = http.get('/search', {
    params: { q: 'query B' },
    abortPrevious: true,
    requestId: 'search-query-B',
  });

  const [r1, r2] = await Promise.all([req1, req2]);
  console.log(r1, r2);

  const specificReq = http.get('/data', { requestId: 'my-specific-req' });
  http.abort('my-specific-req');

  window.addEventListener('beforeunload', () => http.abortAll());

  console.log(http.hasPendingRequests(), http.getPendingCount());
}

async function uploadExamples(file: File) {
  const res = await http.upload<{ url: string; size: number }>({
    url: '/files/upload',
    file,
    filename: file.name,
    fieldName: 'attachment',
    onProgress: (percent: number) => console.log(`上传 ${percent}%`),
    timeout: 120000,
  });
  console.log(res.data);
}

async function uploadMultiple(files: File[]) {
  const results = await Promise.all(
    files.map((f) =>
      http.upload<{ url: string }>({
        url: '/files/upload-multiple',
        file: f,
        filename: f.name,
        fieldName: 'files',
      })
    )
  );
  console.log(results);
}

async function downloadExamples(fileId: string) {
  const res = await http.download<Blob>({
    url: `/files/download/${fileId}`,
    responseType: 'blob',
    onProgress: (percent: number) => console.log(`下载 ${percent}%`),
  });

  const blob = res.data;
  const disposition = res.headers?.['content-disposition'] as string | undefined;
  let filename = 'download';
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|([^;\n]*))/i);
    if (match) filename = match[2] ?? match[3] ?? filename;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function errorHandling() {
  try {
    await http.get('/protected-resource');
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      const { type } = err.reason;
      switch (type) {
        case 'unauthorized':
          console.error('[401] 未授权，跳转登录', err.code);
          break;
        case 'forbidden':
          console.error('[403] 权限不足');
          break;
        case 'not_found':
          console.error('[404] 资源不存在');
          break;
        case 'rate_limit':
          console.error(`[429] 限流，请 ${(err.reason as { retryAfter?: number }).retryAfter}s 后重试`);
          break;
        case 'validation':
          console.error('[422] 校验失败:', (err.reason as { errors: { field?: string; message: string }[] }).errors);
          break;
        case 'server':
          console.error('[5xx] 服务器错误', err.status);
          break;
        case 'network':
          console.error('[网络] 网络不可用');
          break;
        case 'timeout':
          console.error('[超时] 请求超时');
          break;
        case 'cancel':
          console.warn('[取消] 请求已取消');
          break;
        default:
          console.error('[未知]', err.message, err.code);
      }
    }
  }
}

async function wrappedRequest<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      console.error(`[${err.status}] ${err.message}`, {
        code: err.code,
        url: err.url,
        method: err.method,
        requestId: err.requestId,
      });
    }
    throw err;
  }
}

function pluginExamples() {
  const loggingPlugin: HttpPlugin = {
    name: 'logger',
    beforeRequest: async (config) => {
      const start = Date.now();
      (config as unknown as Record<string, unknown>)._startTime = start;
      console.debug(`[HTTP →] ${config.method?.toUpperCase()} ${config.url}`, config.params ?? {});
      return config;
    },
    afterResponse: async (response) => {
      const duration = Date.now() - ((response.config as unknown as Record<string, unknown>)._startTime as number);
      console.debug(`[HTTP ←] ${response.status} ${response.config?.url} (${duration}ms)`);
      return response;
    },
    onError: async (error) => {
      console.error(`[HTTP ✗] ${error.status} ${error.url} — ${error.message}`, { code: error.code });
      return error;
    },
  };

  const tracePlugin: HttpPlugin = {
    name: 'trace',
    beforeRequest: async (config) => {
      const traceId = crypto.randomUUID();
      const headers = { ...(config.headers as Record<string, string>) };
      headers['X-Trace-ID'] = traceId;
      config.headers = headers as typeof config.headers;
      return config;
    },
  };

  const httpWithPlugins = createHttpClient({
    baseURL: BASE_URL,
    plugins: [tracePlugin, loggingPlugin],
  });

  return httpWithPlugins;
}

function interceptorExamples() {
  const httpWithInterceptors = createHttpClient({
    baseURL: BASE_URL,
    requestInterceptor: async (config) => {
      const token = localStorage.getItem('access_token');
      const headers = { ...(config.headers as Record<string, string>) };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['X-App-Version'] = '1.0.0';
      headers['X-Request-Time'] = new Date().toISOString();
      config.headers = headers as typeof config.headers;
      return config;
    },
    responseInterceptor: async (response) => {
      const requestId = response.headers?.['x-request-id'] as string | undefined;
      if (requestId) console.log('Server Request ID:', requestId);
      return response;
    },
    errorInterceptor: async (error: unknown) => {
      const axiosErr = error as { response?: { status: number } };
      if (axiosErr?.response?.status === 401) {
        console.warn('Received 401 in error interceptor');
      }
      return Promise.reject(error);
    },
  });

  return httpWithInterceptors;
}

async function businessErrorCodes() {
  const httpWithCustomCode = createHttpClient({
    baseURL: BASE_URL,
    getAccessTokenFromResponse: (resp: AxiosResponse<{ access_token: string }>) => resp.data.access_token,
  });

  try {
    await httpWithCustomCode.post('/orders', { item: 'invalid' });
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      console.log('HTTP status:', err.status);
      console.log('Business code:', err.code);
      console.log('Message:', err.message);
    }
  }
}

async function customDataPath() {
  const res = await http.get<{ id: string; name: string }>('/api/v2/users/1', {
    customDataPath: 'data.user',
  });
  console.log(res.data);
}

async function retryExamples() {
  const httpWithRetry = createHttpClient({
    baseURL: BASE_URL,
    retry: {
      maxAttempts: 5,
      delay: 500,
      backoffMultiplier: 1.5,
      maxDelay: 10000,
      retryOnNetworkError: true,
    },
  });

  await httpWithRetry.get('/unstable-endpoint');

  const httpWithRetryOnServerOnly = createHttpClient({
    baseURL: BASE_URL,
    retry: {
      maxAttempts: 3,
      delay: 1000,
      retryOnNetworkError: false,
      retryConditions: [
        (err: HttpError) => err.reason.type === 'server' || err.reason.type === 'rate_limit',
      ],
    },
  });

  await httpWithRetryOnServerOnly.get('/unstable-endpoint');
}

function fullConfigExample() {
  const apiClient: HttpInstance = createHttpClient({
    baseURL: (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_API_BASE ?? 'https://api.example.com',
    timeout: 30000,
    withCredentials: true,
    enableCache: true,
    defaultCacheTTL: 60000,
    enableDeduplication: true,
    maxConcurrent: 30,
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      retryOnNetworkError: true,
    },
    refreshTokenEndpoint: '/auth/refresh',
    on401: async () => { window.location.href = '/login'; },
    requestInterceptor: async (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
  });

  return apiClient;
}

async function concurrencyControl() {
  const httpLimited = createHttpClient({
    baseURL: BASE_URL,
    maxConcurrent: 10,
  });

  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) => httpLimited.get<{ id: number }>(`/items/${i}`))
  );

  console.log('Completed, pending:', httpLimited.getPendingCount());
  console.log(results);
}
