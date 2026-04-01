# HTTP 模块

基于 `axios` 封装的企业级 HTTP 请求核心工具库，开箱即用。

## 核心能力一览

| 能力 | 说明 |
|------|------|
| **请求/响应拦截** | 三层拦截链：插件 → 请求拦截 → 响应拦截 → 错误拦截 |
| **401 自动刷新 Token** | 并发锁（refreshingPromise）+ 队列排队，防止惊群效应 |
| **指数退避重试** | 可配置最大次数、初始延迟、退避乘数，网络错误/500/503/429 自动重试 |
| **请求去重 & 取消** | 基于 method+url+params+data 的 dedupe key，支持 AbortController 精确取消 |
| **GET 内存缓存** | TTL + isFresh/isStale + LRU 容量限制（默认 500 条），支持 stale-while-revalidate |
| **并发上限控制** | 可配置最大并发数（默认 50），超出后 FIFO 淘汰最旧请求 |
| **统一错误类型** | `HttpError` 标准化所有错误，含 `reason.type` 细分类别 + 业务 error code |
| **插件扩展** | `HttpPlugin` 支持 beforeRequest / afterResponse / onError |
| **文件上传/下载** | `upload()` / `download()` 封装 FormData，支持进度回调 |
| **业务错误码提取** | 自动从响应 data 中提取 `code` / `error_code` / `errno` |

## 快速开始

```ts
import { createHttpClient } from '@unifying/core';

const http = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
});

const res = await http.get('/users/1');
console.log(res.data);
```

---

## 全局配置 — HttpClientConfig

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `baseURL` | `string` | - | 请求基础 URL |
| `timeout` | `number` | `30000` | 默认超时时间（毫秒） |
| `withCredentials` | `boolean` | `false` | 是否携带 cookie（跨域） |
| `retry` | `RetryConfig` | - | 全局重试策略 |
| `enableCache` | `boolean` | `true` | 是否启用 GET 缓存 |
| `defaultCacheTTL` | `number` | `30000` | 默认缓存 TTL（毫秒） |
| `enableDeduplication` | `boolean` | `true` | 是否启用请求去重 |
| `maxConcurrent` | `number` | `50` | 最大并发请求数 |
| `defaultHeaders` | `Record<string, string>` | - | 默认请求头 |
| `refreshTokenEndpoint` | `string` | `'/auth/refresh'` | 刷新 token 接口路径 |
| `refreshTokenMethod` | `'post' \| 'POST'` | `'POST'` | 刷新 token 请求方法 |
| `getAccessTokenFromResponse` | `(response) => string` | - | 自定义提取 accessToken |
| `getRefreshTokenFromResponse` | `(response) => string` | - | 自定义提取 refreshToken |
| `getExpiresInFromResponse` | `(response) => number` | - | 自定义提取 token 过期时间 |
| `on401` | `() => Promise<void>` | - | 401 发生时的回调（刷新失败后） |
| `onTokenRefreshed` | `(accessToken) => void` | - | token 刷新成功后的回调 |
| `onTokenRefreshError` | `(error) => void` | - | token 刷新失败后的回调 |
| `requestInterceptor` | `HttpRequestInterceptorHook` | - | 请求拦截器 |
| `responseInterceptor` | `HttpResponseInterceptorHook` | - | 响应拦截器 |
| `errorInterceptor` | `HttpErrorInterceptorHook` | - | 错误拦截器 |
| `plugins` | `HttpPlugin[]` | - | 插件列表 |

---

## 请求级配置 — HttpRequestConfig

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `url` | `string` | 请求地址（必填） |
| `method` | `RequestMethod` | 请求方法 |
| `headers` | `Record<string, string>` | 请求头 |
| `params` | `Record<string, unknown>` | URL 查询参数 |
| `data` | `unknown` | 请求体数据 |
| `timeout` | `number` | 请求级超时时间（覆盖全局） |
| `retry` | `boolean` | 是否启用重试（覆盖全局） |
| `retryMaxAttempts` | `number` | 请求级最大重试次数 |
| `requestCached` | `boolean` | 是否缓存该请求响应（默认 true） |
| `cacheTTL` | `number` | 该请求的缓存 TTL（毫秒） |
| `cacheStaleWhileRevalidate` | `boolean` | 缓存过期时返回旧缓存同时后台重新请求 |
| `abortPrevious` | `boolean` | 是否取消同 key 的旧请求（防抖） |
| `requestId` | `string` | 手动指定请求 ID（用于追踪/取消） |
| `customDataPath` | `string` | 从响应 data 中按路径提取，如 `'data.result'` |

---

## HttpInstance API

```ts
interface HttpInstance {
  // 通用
  request: <T>(config: HttpRequestConfig) => Promise<HttpResponse<T>>;

  // RESTful
  get:    <T>(url: string, config?) => Promise<HttpResponse<T>>;
  post:   <T>(url: string, data?, config?) => Promise<HttpResponse<T>>;
  put:    <T>(url: string, data?, config?) => Promise<HttpResponse<T>>;
  delete: <T>(url: string, config?) => Promise<HttpResponse<T>>;
  patch:  <T>(url: string, data?, config?) => Promise<HttpResponse<T>>;
  head:   <T>(url: string, config?) => Promise<HttpResponse<T>>;
  options:<T>(url: string, config?) => Promise<HttpResponse<T>>;

  // 文件
  upload:   <T>(config: UploadConfig) => Promise<HttpResponse<T>>;
  download: <T>(config: DownloadConfig) => Promise<HttpResponse<T>>;

  // 控制
  abort:             (requestId?) => void;       // 中止指定请求
  abortAll:          () => void;                 // 中止所有请求
  hasPendingRequests: () => boolean;             // 是否有进行中的请求
  getPendingCount:    () => number;             // 进行中的请求数

  // 缓存
  clearCache: () => void;

  // Token
  setToken: (token: string | null) => void;
  getToken: () => string | null;
  setHeader: (key: string, value: string | null) => void;
}
```

---

## HttpError 错误类型

`HttpError.reason` 的 `type` 可为：

| type | 说明 | 常见场景 |
|------|------|----------|
| `timeout` | 请求超时 | 超过 timeout 配置 |
| `network` | 网络错误 | 无网络、连接失败（status=0） |
| `server` | 服务器错误 | 500/502/503/504 |
| `client` | 客户端错误 | 400/422 等，含 `data` 字段 |
| `cancel` | 请求取消 | 主动 abort 或页面跳转 |
| `validation` | 数据校验错误 | 422，含 `errors: HttpErrorDetail[]` |
| `unauthorized` | 未授权 | 401 |
| `forbidden` | 权限不足 | 403 |
| `not_found` | 资源不存在 | 404 |
| `rate_limit` | 请求过于频繁 | 429，含 `retryAfter` |
| `unknown` | 未知错误 | 其他所有情况 |

`HttpError` 属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 业务错误码（从 `data.code/error_code/errno` 提取） |
| `status` | `number` | HTTP 状态码 |
| `message` | `string` | 错误消息文本 |
| `reason` | `HttpErrorReason` | 细分类别的 reason 对象 |
| `url` / `method` | `string` | 请求的 URL 和方法 |
| `requestId` | `string` | 请求 ID |
| `originalError` | `unknown` | 原始 axios 错误对象 |

---

## RetryConfig 重试配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxAttempts` | `number` | `3` | 最大重试次数 |
| `delay` | `number` | `1000` | 初始重试延迟（毫秒） |
| `backoffMultiplier` | `number` | `2` | 退避乘数（指数增长） |
| `maxDelay` | `number` | `30000` | 最大延迟上限（毫秒） |
| `retryOnNetworkError` | `boolean` | `true` | 网络错误是否重试 |
| `retryConditions` | `(error) => boolean[]` | - | 自定义重试条件 |

**自动重试的条件（默认）**：网络错误 / 超时 / 500 / 503 / 429。**不会**重试 502 / 504 / 4xx 客户端错误。

---

## 插件系统

```ts
const myPlugin: HttpPlugin = {
  name: 'my-plugin',
  beforeRequest: async (config) => {
    return { ...config, headers: { ...config.headers, 'X-Request-ID': uuid() } };
  },
  afterResponse: async (response) => {
    console.log(`${response.status} ${response.config?.url}`);
    return response;
  },
  onError: async (error) => {
    logger.error({ url: error.url, status: error.status, code: error.code });
    return error;
  },
};
```

---

## 内置工具类

| 类/函数 | 说明 |
|---------|------|
| `createHttpClient(config)` | 创建 HttpInstance 的快捷函数 |
| `HttpFactory` | HTTP 客户端工厂类 |
| `HttpError` | 统一错误类型 |
| `MemoryCache` | 内存缓存（LRU + TTL） |
| `TokenManager` | Token 管理与刷新锁 |
| `RetryHandler` | 重试策略处理器 |
| `RequestManager` | 请求去重与取消管理 |
| `parseReasonFromStatus(status, data)` | 根据状态码和数据构建错误 reason |
| `extractErrorMessage(data, fallback)` | 从响应数据中提取错误消息 |
| `isCancel(error)` | 判断是否为取消错误（支持 AbortController 和 CancelToken） |

---

## 文件结构

```
src/http/
├── axios/
│   ├── types.ts          # 类型定义（HttpError、HttpInstance、HttpRequestConfig 等）
│   ├── errors.ts         # 错误解析工具（parseReasonFromStatus、extractErrorMessage 等）
│   ├── cache.ts          # 内存缓存（TTL + LRU 容量限制）
│   ├── token.ts          # TokenManager（刷新锁 + localStorage 持久化）
│   ├── retry.ts          # RetryHandler（指数退避 + 可配置条件）
│   ├── requestManager.ts # RequestManager（去重、AbortController、并发上限）
│   └── http.ts           # HttpFactory 核心工厂（createHttpClient）
├── stream/
│   └── stream.ts         # 流式请求（SSE / Server-Sent Events）
└── index.ts              # 统一导出
```
