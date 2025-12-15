# HTTP 模块设计文档

## 目录

1. [模块简介](#模块简介)
2. [架构设计](#架构设计)
3. [核心功能](#核心功能)
4. [类型定义](#类型定义)
5. [API 文档](#api-文档)
6. [使用示例](#使用示例)
7. [拦截器系统](#拦截器系统)
8. [错误处理](#错误处理)
9. [日志系统](#日志系统)
10. [高级用法](#高级用法)

---

## 模块简介

`@unifying/core` 的 HTTP 模块是一个基于 Axios 的企业级 HTTP 客户端库。它提供了完整的请求/响应管理、自动重试、拦截器、错误处理和日志记录功能。

### 主要特性

- 🚀 **基于 Axios**：构建在稳定可靠的 Axios 库之上
- 🔄 **自动重试**：智能重试机制，支持自定义重试规则
- 🎯 **拦截器系统**：灵活的请求/响应/错误拦截器
- 📊 **详细日志**：支持多级日志和敏感信息过滤
- ⏱️ **请求跟踪**：唯一的请求 ID 用于追踪和调试
- 🛡️ **错误处理**：详细的错误信息和错误分类
- 📋 **类型安全**：完整的 TypeScript 支持
- ⚙️ **灵活配置**：支持动态配置修改

---

## 架构设计

### 模块结构

```
http/
├── client.ts              # HttpClient 主类 - 核心客户端实现
├── config.ts              # ConfigManager - 配置管理和验证
├── request-context.ts     # RequestContextManager - 请求生命周期管理
├── interceptors.ts        # InterceptorManager - 拦截器管理
├── types.ts               # 类型定义和接口
├── utils.ts               # 工具函数（重试、日志、错误处理等）
├── logger.ts              # 日志系统（ConsoleLogger、NoOpLogger）
├── index.ts               # 模块导出和便利方法
└── README.md              # 本文档
```

### 核心模块职责

#### 1. **HttpClient** (`client.ts`)

- HTTP 请求的主要入口
- 管理 Axios 实例
- 协调其他管理器的工作
- 提供 GET/POST/PUT/PATCH/DELETE 等 HTTP 方法

#### 2. **ConfigManager** (`config.ts`)

- 配置的规范化和验证
- 配置更新和合并
- 默认值管理
- 配置验证

#### 3. **RequestContextManager** (`request-context.ts`)

- 请求上下文生命周期管理
- AbortController 管理
- 请求追踪和取消
- 持续时间计算

#### 4. **InterceptorManager** (`interceptors.ts`)

- 拦截器的注册和管理
- 请求/响应/错误拦截器的存储和检索

### 设计模式

#### 1. **单一职责原则**

每个模块职责清晰，各司其职：

- `client.ts`：HTTP 请求编排和生命周期管理
- `config.ts`：配置管理和验证
- `request-context.ts`：请求追踪和取消管理
- `interceptors.ts`：拦截器注册和执行
- `logger.ts`：日志记录功能
- `utils.ts`：工具函数和辅助方法
- `types.ts`：类型定义

#### 2. **依赖注入 + 组合**

HttpClient 通过组合模式使用各个管理器，易于测试和扩展：

```typescript
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  enableLogging: true,
});

// 内部使用 ConfigManager、RequestContextManager、InterceptorManager
```

#### 3. **工厂模式**

```typescript
// 创建自定义客户端
const client = createHttpClient(config);

// 获取全局默认客户端
const defaultClient = getDefaultHttpClient();
```

#### 4. **拦截器模式**

支持三种拦截器链：

- 请求拦截器 (Request Interceptor)
- 响应拦截器 (Response Interceptor)
- 错误拦截器 (Error Interceptor)

#### 4. **请求追踪**

每个请求都有唯一的 `X-Request-ID` 头，用于：

- 日志追踪
- 错误诊断
- 请求上下文管理

#### 5. **重试策略**

采用指数退避算法：
$$\text{delay} = \text{baseDelay} \times 2^{\text{retryCount}} + \text{jitter}$$

---

## 核心功能

### 1. HTTP 方法支持

- `GET` - 获取资源
- `POST` - 创建资源
- `PUT` - 替换资源
- `PATCH` - 部分更新
- `DELETE` - 删除资源

### 2. 自动重试机制

```typescript
// 重试配置
{
  maxRetries: 3,                    // 最大重试次数
  retryDelay: 1000,                 // 初始延迟(ms)
  retryStatusCodes: [429, 503],     // 触发重试的状态码
  retryOnNetworkError: true         // 网络错误是否重试
}
```

**默认可重试的状态码**：

- `408` - 请求超时
- `429` - 请求过多 (Too Many Requests)
- `500` - 服务器内部错误
- `502` - 网关错误
- `503` - 服务不可用
- `504` - 网关超时

### 3. 请求生命周期

```
┌─────────────────────────────────────┐
│  创建请求                            │
│  生成 X-Request-ID                   │
│  记录请求开始时间                    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  请求拦截器                         │
│  (可修改请求配置)                    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  发送请求到服务器                    │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
  ┌────────┐   ┌────────┐
  │ 成功   │   │ 失败   │
  └────┬───┘   └───┬────┘
       │           │
       ▼           ▼
   响应拦截器   错误拦截器
       │           │
       │      是否可重试?
       │      /          \
       │    是            否
       │    │             │
       │    ▼             ▼
       │  延迟后重试   抛出错误
       │    │          (HttpError)
       │    └─────────┘
       │         │
       └─────────┴─────────┐
                          │
                          ▼
                    清理请求上下文
                    返回结果
```

### 4. 请求上下文跟踪

每个请求都维护一个 `RequestContext`：

- `requestId`: 唯一请求标识
- `startTime`: 请求开始时间
- `retryCount`: 重试次数

---

## 类型定义

### HttpClientConfig

```typescript
interface HttpClientConfig {
  baseURL?: string; // 基础 URL
  timeout?: TimeoutConfig | number; // 超时配置
  retry?: RetryConfig; // 重试配置
  enableLogging?: boolean; // 是否启用日志
  headers?: Record<string, string>; // 默认请求头
  successStatusCodes?: number[]; // 成功状态码
}
```

### RetryConfig

```typescript
interface RetryConfig {
  maxRetries?: number; // 最大重试次数
  retryDelay?: number; // 重试延迟(ms)
  retryStatusCodes?: number[]; // 触发重试的状态码
  retryOnNetworkError?: boolean; // 网络错误是否重试
}
```

### HttpResponse

```typescript
interface HttpResponse<T = any> extends AxiosResponse<T> {
  duration?: number; // 请求耗时(ms)
  retryCount?: number; // 重试次数
}
```

### HttpError

```typescript
class HttpError extends Error {
  code: string | number; // 错误码
  status?: number; // HTTP 状态码
  isRetryable: boolean; // 是否可重试
  context?: Record<string, any>; // 错误上下文
}
```

### 拦截器类型

```typescript
// 请求拦截器
type RequestInterceptor = (
  config: AxiosRequestConfig
) => AxiosRequestConfig | Promise<AxiosRequestConfig>;

// 响应拦截器
type ResponseInterceptor = (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;

// 错误拦截器
type ErrorInterceptor = (error: AxiosError) => AxiosError | void | Promise<AxiosError | void>;
```

---

## API 文档

### HttpClient 类

#### 构造函数

```typescript
constructor(config?: HttpClientConfig)
```

创建一个新的 HTTP 客户端实例。

**参数**：

- `config` - 可选的客户端配置

**示例**：

```typescript
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  enableLogging: true,
});
```

#### get()

```typescript
get<T = any>(url: string, config?: AxiosRequestConfig): Promise<HttpResponse<T>>
```

发送 GET 请求。

#### post()

```typescript
post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<HttpResponse<T>>
```

发送 POST 请求。

#### put()

```typescript
put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<HttpResponse<T>>
```

发送 PUT 请求。

#### patch()

```typescript
patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<HttpResponse<T>>
```

发送 PATCH 请求。

#### delete()

```typescript
delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<HttpResponse<T>>
```

发送 DELETE 请求。

#### use()

```typescript
use(interceptor: {
  request?: RequestInterceptor
  response?: ResponseInterceptor
  error?: ErrorInterceptor
}): void
```

注册拦截器。

#### setConfig()

```typescript
setConfig(config: Partial<HttpClientConfig>): void
```

更新客户端配置。

#### getConfig()

```typescript
getConfig(): HttpClientConfig
```

获取当前配置。

#### setHeaders()

```typescript
setHeaders(headers: Record<string, string>): void
```

设置默认请求头。

#### clearInterceptors()

```typescript
clearInterceptors(): void
```

清除所有拦截器。

#### cancelRequest()

```typescript
cancelRequest(requestId: string, reason?: string): void
```

取消指定的请求。

#### cancelAllRequests()

```typescript
cancelAllRequests(reason?: string): void
```

取消所有待处理请求。

#### destroy()

```typescript
destroy(): void
```

销毁客户端并清理资源。

#### getAxiosInstance()

```typescript
getAxiosInstance(): AxiosInstance
```

获取底层的 Axios 实例。

#### getPendingRequestIds()

```typescript
getPendingRequestIds(): string[]
```

获取所有待处理请求的 ID 列表。

### 管理器类 API

#### ConfigManager

用于管理和验证 HTTP 客户端配置：

```typescript
import { ConfigManager } from '@unifying/core';

const configManager = new ConfigManager({
  baseURL: 'https://api.example.com',
  timeout: 30000,
});

// 获取配置
const config = configManager.get();

// 更新配置
configManager.update({ baseURL: 'https://api.new.com' });

// 验证配置
const { valid, errors } = configManager.validate();
```

**主要方法**：

- `get()` - 获取当前配置
- `getValue(key)` - 获取特定配置值
- `update(updates)` - 更新配置
- `merge(updates)` - 合并配置
- `validate()` - 验证配置有效性
- `reset()` - 重置为默认配置

#### RequestContextManager

用于管理请求生命周期、追踪和取消：

```typescript
import { RequestContextManager } from '@unifying/core';

const contextManager = new RequestContextManager();

// 创建请求上下文
const context = contextManager.createContext('req_123');

// 获取上下文
const ctx = contextManager.getContext('req_123');

// 获取请求耗时
const duration = contextManager.getDuration('req_123');

// 取消请求
contextManager.abort('req_123', '用户取消');

// 取消所有请求
contextManager.abortAll('应用关闭');
```

**主要方法**：

- `createContext(requestId)` - 创建新的请求上下文
- `getContext(requestId)` - 获取上下文
- `updateContext(requestId, updates)` - 更新上下文
- `removeContext(requestId)` - 移除上下文
- `getOrCreateAbortController(requestId)` - 获取或创建 AbortController
- `getDuration(requestId)` - 获取请求耗时
- `abort(requestId, reason)` - 中止指定请求
- `abortAll(reason)` - 中止所有请求
- `getPendingRequestIds()` - 获取待处理请求 ID 列表

#### InterceptorManager

用于管理拦截器：

```typescript
import { InterceptorManager } from '@unifying/core';

const interceptorManager = new InterceptorManager();

// 添加拦截器
interceptorManager.use({
  request: async (config) => {
    // 修改请求配置
    return config;
  },
  response: async (response) => {
    // 处理响应
    return response;
  },
  error: async (error) => {
    // 处理错误
    return error;
  },
});

// 获取拦截器列表
const requestInterceptors = interceptorManager.getRequestInterceptors();
const responseInterceptors = interceptorManager.getResponseInterceptors();
const errorInterceptors = interceptorManager.getErrorInterceptors();

// 清除所有拦截器
interceptorManager.clear();
```

**主要方法**：

- `use(interceptor)` - 添加拦截器
- `getRequestInterceptors()` - 获取请求拦截器列表
- `getResponseInterceptors()` - 获取响应拦截器列表
- `getErrorInterceptors()` - 获取错误拦截器列表
- `clear()` - 清除所有拦截器

### 模块级函数

#### createHttpClient()

```typescript
function createHttpClient(config?: HttpClientConfig): HttpClient;
```

创建新的 HTTP 客户端实例。

#### getDefaultHttpClient()

```typescript
function getDefaultHttpClient(): HttpClient;
```

获取全局默认客户端（单例）。

#### setDefaultHttpClient()

```typescript
function setDefaultHttpClient(client: HttpClient): void;
```

设置全局默认客户端。

#### get(), post(), put(), patch(), del()

```typescript
async function get<T = any>(url: string, config?: any): Promise<HttpResponse<T>>;
async function post<T = any>(url: string, data?: any, config?: any): Promise<HttpResponse<T>>;
async function put<T = any>(url: string, data?: any, config?: any): Promise<HttpResponse<T>>;
async function patch<T = any>(url: string, data?: any, config?: any): Promise<HttpResponse<T>>;
async function del<T = any>(url: string, config?: any): Promise<HttpResponse<T>>;
```

使用默认客户端发送请求的便利方法。

---

## 使用示例

### 基础使用

```typescript
import { HttpClient } from '@unifying/core';

// 创建客户端
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  enableLogging: true,
});

// 发送 GET 请求
const response = await client.get('/users');
console.log(response.data);
console.log(`耗时: ${response.duration}ms`);

// 发送 POST 请求
const createResponse = await client.post('/users', {
  name: 'John',
  email: 'john@example.com',
});
console.log(createResponse.data);
```

### 使用全局默认客户端

```typescript
import { get, post, getDefaultHttpClient } from '@unifying/core';

// 获取默认客户端并配置
const defaultClient = getDefaultHttpClient();
defaultClient.setConfig({
  baseURL: 'https://api.example.com',
  enableLogging: true,
});

// 使用便利方法
const users = await get('/users');
const newUser = await post('/users', { name: 'Alice' });
```

### 自定义配置

```typescript
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  timeout: {
    request: 10000, // 请求超时 10 秒
    response: 20000, // 响应超时 20 秒
  },
  retry: {
    maxRetries: 5,
    retryDelay: 2000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
    retryOnNetworkError: true,
  },
  headers: {
    Authorization: 'Bearer token',
    'X-Custom-Header': 'value',
  },
  enableLogging: true,
});
```

### 请求拦截器

```typescript
const client = new HttpClient();

// 添加请求拦截器
client.use({
  request: async (config) => {
    // 修改请求配置
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${getToken()}`;
    return config;
  },
});

// 发送请求时会自动添加认证 token
await client.get('/protected-resource');
```

### 响应拦截器

```typescript
const client = new HttpClient();

// 添加响应拦截器
client.use({
  response: async (response) => {
    // 提取实际数据
    if (response.data.code === 0) {
      // 自定义成功响应处理
      response.data = response.data.data;
    }
    return response;
  },
});
```

### 错误拦截器

```typescript
const client = new HttpClient();

// 添加错误拦截器
client.use({
  error: async (error) => {
    if (error.response?.status === 401) {
      // 处理认证失败
      clearToken();
      redirectToLogin();
    }
    return error;
  },
});
```

### 多个拦截器

```typescript
const client = new HttpClient();

client.use({
  request: async (config) => {
    console.log('Request 1');
    return config;
  },
});

client.use({
  request: async (config) => {
    console.log('Request 2');
    return config;
  },
});

// 输出: Request 1, Request 2
```

### 类型安全

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const client = new HttpClient();

// 类型安全的请求
const response = await client.get<User>('/users/1');
const user: User = response.data;
console.log(user.name);

// 类型安全的 POST
const createResponse = await client.post<User>('/users', {
  name: 'Alice',
  email: 'alice@example.com',
});
```

### 错误处理

```typescript
import { HttpError } from '@unifying/core';

try {
  const response = await client.get('/users/999');
} catch (error) {
  if (error instanceof HttpError) {
    console.log(`错误码: ${error.code}`);
    console.log(`错误信息: ${error.message}`);
    console.log(`HTTP 状态码: ${error.status}`);
    console.log(`是否可重试: ${error.isRetryable}`);
    console.log(`请求 ID: ${error.context?.requestId}`);
    console.log(`重试次数: ${error.context?.retryCount}`);
  }
}
```

### 请求取消

```typescript
const client = new HttpClient();

// 获取响应时会获得请求 ID
const promise = client.get('/users');

// 可以通过检查响应头获取 request ID
const response = await promise;
const requestId = response.config.headers['X-Request-ID'];

// 取消请求
client.cancelRequest(requestId, '用户取消');

// 取消所有请求
client.cancelAllRequests('应用关闭');
```

---

## 拦截器系统

### 拦截器执行顺序

```
请求拦截器链:
Request 1 -> Request 2 -> Request 3
                  |
                  ▼
             HTTP 请求
                  |
Error 处理? <-    |    <- 响应拦截器链
   |             |      Response 1 <- Response 2
   ▼             ▼
重试 ?       返回结果
   │
   └─ 是 -> 延迟 -> 回到 Request 1
   │
   └─ 否 -> 抛出错误
```

### 请求拦截器

用于修改请求配置：

```typescript
client.use({
  request: async (config) => {
    // 可以访问和修改：
    // - config.url
    // - config.method
    // - config.headers
    // - config.data
    // - config.params
    // - 等等

    return config;
  },
});
```

### 响应拦截器

用于处理成功响应：

```typescript
client.use({
  response: async (response) => {
    // 可以访问和修改响应
    // response.status
    // response.data
    // response.headers
    // 等等

    // 也可以访问扩展属性：
    // response.duration - 请求耗时
    // response.retryCount - 重试次数

    return response;
  },
});
```

### 错误拦截器

用于处理错误和重试前的逻辑：

```typescript
client.use({
  error: async (error) => {
    // 可以执行：
    // - 日志记录
    // - 错误报告
    // - 特定错误处理
    // - 返回修改后的错误或 void

    if (error.response?.status === 401) {
      // 处理认证失败
      refreshToken();
    }

    // 返回错误继续处理，返回 void 或不返回会中止链
    return error;
  },
});
```

### 实际例子：认证拦截器

```typescript
const client = new HttpClient({
  baseURL: 'https://api.example.com',
});

// 请求拦截器：添加 token
client.use({
  request: async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
});

// 错误拦截器：处理 token 过期
client.use({
  error: async (error) => {
    if (error.response?.status === 401) {
      // Token 过期，刷新 token
      const newToken = await refreshToken();
      localStorage.setItem('token', newToken);

      // 重试原请求
      const config = error.config;
      if (config) {
        config.headers['Authorization'] = `Bearer ${newToken}`;
        return client.get(config.url) as any;
      }
    }
    return error;
  },
});
```

---

## 错误处理

### HttpError 结构

```typescript
{
  name: 'HttpError',
  code: string | number,        // 错误码
  message: string,              // 错误信息
  status?: number,              // HTTP 状态码
  isRetryable: boolean,         // 是否可重试
  context?: {
    requestId: string,          // 请求 ID
    retryCount: number,         // 重试次数
    url: string,                // 请求 URL
    method: string              // 请求方法
  }
}
```

### 错误分类

#### 1. 网络错误

- 请求初始化失败
- 网络连接错误
- 超时错误

#### 2. HTTP 错误

- 4xx 客户端错误
- 5xx 服务器错误

#### 3. 响应解析错误

- 无效的 JSON
- 其他响应格式问题

### 错误捕获示例

```typescript
try {
  await client.get('/api/users');
} catch (error) {
  if (error instanceof HttpError) {
    // 处理 HTTP 错误
    if (error.status === 404) {
      console.log('资源不存在');
    } else if (error.status === 500) {
      console.log('服务器错误，可能会重试');
    } else if (error.code === 'ECONNABORTED') {
      console.log('请求超时');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('连接被拒绝');
    }
  } else {
    // 其他错误
    console.error('未知错误:', error);
  }
}
```

### 自定义错误处理

```typescript
const client = new HttpClient();

client.use({
  error: async (error) => {
    // 记录详细错误信息
    console.log('发生错误:');
    console.log('  URL:', error.config?.url);
    console.log('  方法:', error.config?.method);
    console.log('  状态码:', error.response?.status);
    console.log('  错误信息:', error.message);

    // 可以在这里上报到错误追踪系统
    reportError(error);

    return error;
  },
});
```

---

## 日志系统

### 日志级别

```typescript
enum LogLevel {
  DEBUG = 'DEBUG', // 调试信息
  INFO = 'INFO', // 一般信息
  WARN = 'WARN', // 警告信息
  ERROR = 'ERROR', // 错误信息
}
```

### 启用日志

```typescript
const client = new HttpClient({
  enableLogging: true, // 启用日志
});
```

### 日志输出示例

```
[2024-01-15T10:30:45.123Z] [DEBUG] [req_1705315845123_abc12345] Request started {
  method: 'GET',
  url: '/users',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': '***'  // 敏感信息被隐藏
  }
}

[2024-01-15T10:30:45.456Z] [DEBUG] [req_1705315845123_abc12345] Response received {
  status: 200,
  duration: '333ms'
}

[2024-01-15T10:30:46.789Z] [INFO] [req_1705315845456_def67890] Retrying request (attempt 1/3) after 1000ms
```

### 日志过滤

敏感的请求头会被自动过滤：

- `authorization`
- `cookie`
- `x-token`
- `x-api-key`
- `token`

### 自定义日志器

```typescript
import { ILogger, LogLevel } from '@unifying/core';

class CustomLogger implements ILogger {
  debug(message: string, data?: any): void {
    console.log(`[DEBUG] ${message}`, data);
  }

  info(message: string, data?: any): void {
    console.info(`[INFO] ${message}`, data);
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data);
  }

  error(message: string, data?: any): void {
    console.error(`[ERROR] ${message}`, data);
  }
}

// 注意：需要在创建客户端后手动注入
const client = new HttpClient();
// 当前版本通过 enableLogging 选项控制日志
```

---

## 高级用法

### 全局 HTTP 客户端管理

```typescript
// 初始化（应该在应用启动时调用）
import { getDefaultHttpClient, setDefaultHttpClient } from '@unifying/core';

const client = getDefaultHttpClient();
client.setConfig({
  baseURL: 'https://api.example.com',
  enableLogging: true,
  headers: {
    'X-App-Version': '1.0.0',
  },
});

// 在任何地方使用
import { get, post } from '@unifying/core';

export async function fetchUsers() {
  return get('/users');
}

export async function createUser(data) {
  return post('/users', data);
}
```

### 多个独立客户端

```typescript
// API 客户端
const apiClient = new HttpClient({
  baseURL: 'https://api.example.com',
  enableLogging: true,
});

// 支付客户端（不同的配置）
const paymentClient = new HttpClient({
  baseURL: 'https://payment.example.com',
  timeout: 60000, // 更长的超时时间
  retry: {
    maxRetries: 5, // 更多重试次数
    retryDelay: 2000,
  },
});

// WebSocket 后备客户端
const fallbackClient = new HttpClient({
  baseURL: 'https://fallback.example.com',
  retry: {
    retryOnNetworkError: true,
  },
});
```

### 链式配置

```typescript
const client = new HttpClient();

// 可以链式调用多个 use() 方法
client.use({
  request: addAuthToken,
});

client.use({
  request: addRequestId,
});

client.use({
  response: transformResponse,
});

client.use({
  error: logError,
});
```

### 条件拦截

```typescript
const client = new HttpClient({
  baseURL: 'https://api.example.com',
});

client.use({
  request: async (config) => {
    // 只为某些请求添加 token
    if (!config.url?.includes('/public')) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${getToken()}`;
    }
    return config;
  },
});
```

### 错误重映射

```typescript
const client = new HttpClient();

client.use({
  response: async (response) => {
    // 将 API 的错误码映射到本地错误
    if (response.data.code === 'USER_NOT_FOUND') {
      throw new Error('用户不存在');
    }
    return response;
  },
});
```

### 请求聚合/批处理

```typescript
import { post } from '@unifying/core';

// 批量创建用户
async function createUsersInBatch(users: User[]): Promise<User[]> {
  const results = await Promise.all(users.map((user) => post<User>('/users', user)));
  return results.map((r) => r.data);
}

// 或使用批处理 API（如果服务器支持）
async function batchCreate(users: User[]): Promise<User[]> {
  const response = await post<User[]>('/users/batch', { users });
  return response.data;
}
```

### 请求超时处理

```typescript
const client = new HttpClient({
  timeout: {
    request: 5000, // 5 秒请求超时
    response: 10000, // 10 秒响应超时
  },
});

try {
  const response = await client.get('/slow-endpoint');
} catch (error) {
  if (error instanceof HttpError && error.code === 'ECONNABORTED') {
    console.log('请求超时，已自动重试');
  }
}
```

### 动态 baseURL

```typescript
const client = new HttpClient();

// 根据环境动态设置
const apiUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://api.example.com'
    : 'https://staging-api.example.com';

client.setConfig({ baseURL: apiUrl });
```

### 响应缓存

```typescript
const cache = new Map();

const client = new HttpClient();

client.use({
  request: async (config) => {
    // 仅缓存 GET 请求
    if (config.method === 'GET') {
      const cached = cache.get(config.url);
      if (cached) {
        console.log('从缓存返回:', config.url);
        // 无法在请求拦截器中返回缓存的响应
        // 需要在应用层处理
      }
    }
    return config;
  },
});
```

### 性能监控

```typescript
const client = new HttpClient({
  enableLogging: true,
});

client.use({
  response: async (response) => {
    // 记录性能数据
    const duration = response.duration || 0;
    console.log(`请求 ${response.config?.url} 耗时 ${duration}ms`);

    // 如果超过阈值，发送告警
    if (duration > 5000) {
      console.warn('请求响应缓慢！', {
        url: response.config?.url,
        duration: duration,
      });
    }

    return response;
  },
});
```

---

## 最佳实践

### 1. 创建专用的客户端配置

```typescript
// api/client.ts
import { HttpClient } from '@unifying/core';

export const apiClient = new HttpClient({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
  enableLogging: process.env.NODE_ENV === 'development',
});

// 配置拦截器
apiClient.use({
  request: async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
});
```

### 2. 创建 API 服务层

```typescript
// api/services/user.ts
import { apiClient } from '../client';

export interface User {
  id: number;
  name: string;
  email: string;
}

export const userService = {
  async getUsers() {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  },

  async getUser(id: number) {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  async createUser(data: Omit<User, 'id'>) {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  async updateUser(id: number, data: Partial<User>) {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: number) {
    await apiClient.delete(`/users/${id}`);
  },
};
```

### 3. 错误处理层

```typescript
// api/error-handler.ts
import { HttpError } from '@unifying/core';

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        // 处理认证失败
        clearAuthToken();
        redirectToLogin();
        break;
      case 403:
        // 处理权限不足
        showErrorToast('您没有权限进行此操作');
        break;
      case 404:
        // 处理资源不存在
        showErrorToast('请求的资源不存在');
        break;
      case 500:
        // 处理服务器错误
        showErrorToast('服务器错误，请稍后重试');
        break;
      default:
        showErrorToast(error.message);
    }
  } else {
    showErrorToast('未知错误');
  }
}
```

### 4. 在 React 中的使用

```typescript
// hooks/useApi.ts
import { useState, useCallback } from 'react'
import { apiClient } from '../api/client'
import { HttpError } from '@unifying/core'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: HttpError | null
}

export function useApi<T = any>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', data?: any) => {
    setState({ data: null, loading: true, error: null })
    try {
      let response
      switch (method) {
        case 'POST':
          response = await apiClient.post<T>(url, data)
          break
        case 'PUT':
          response = await apiClient.put<T>(url, data)
          break
        case 'PATCH':
          response = await apiClient.patch<T>(url, data)
          break
        case 'DELETE':
          response = await apiClient.delete<T>(url)
          break
        default:
          response = await apiClient.get<T>(url)
      }
      setState({ data: response.data, loading: false, error: null })
      return response.data
    } catch (error) {
      const httpError = error instanceof HttpError ? error : new HttpError({ code: 'UNKNOWN', message: '未知错误', isRetryable: false })
      setState({ data: null, loading: false, error: httpError })
      throw httpError
    }
  }, [])

  return { ...state, execute }
}

// 组件中使用
export function UserList() {
  const { data: users, loading, error, execute } = useApi<User[]>()

  useEffect(() => {
    execute('/users', 'GET')
  }, [execute])

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return (
    <ul>
      {users?.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  )
}
```

### 5. 环境配置

```typescript
// config/api.ts
const config = {
  development: {
    baseURL: 'http://localhost:3000/api',
    enableLogging: true,
    timeout: 30000,
  },
  staging: {
    baseURL: 'https://staging-api.example.com',
    enableLogging: true,
    timeout: 30000,
  },
  production: {
    baseURL: 'https://api.example.com',
    enableLogging: false,
    timeout: 30000,
  },
};

export const apiConfig = config[process.env.NODE_ENV || 'development'];
```

---

## 总结

`@unifying/core` 的 HTTP 模块提供了一个完整、灵活、企业级的 HTTP 请求解决方案。通过合理的架构设计和丰富的功能，它能够满足各种复杂的应用场景。

### 核心优势

✅ 完整的请求生命周期管理  
✅ 灵活的拦截器系统  
✅ 智能的自动重试机制  
✅ 详细的错误信息和追踪  
✅ 完善的日志系统  
✅ 完整的 TypeScript 支持  
✅ 易于集成和扩展

### 推荐流程

1. 创建专用的客户端配置
2. 实现 API 服务层
3. 添加错误处理
4. 在应用中集成和使用
5. 监控和优化性能
