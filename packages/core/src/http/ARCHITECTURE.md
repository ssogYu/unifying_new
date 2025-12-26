# HTTP 模块架构说明

## 概述

这是一个基于 Axios 的企业级 HTTP 请求二次封装模块，提供了完善的错误处理、请求取消、重试机制、缓存功能等企业级特性。

## 模块结构

```
http/
├── types.ts              # 类型定义文件
├── http-client.ts        # 核心 HTTP 客户端类
├── error-handler.ts      # 错误处理器
├── cache-manager.ts      # 缓存管理器
├── cancel-manager.ts     # 取消管理器
├── retry-manager.ts      # 重试管理器
├── index.ts              # 模块导出入口
├── example.ts            # 使用示例
├── README.md             # 详细使用文档
└── QUICK_REFERENCE.md    # 快速参考指南
```

## 核心组件

### 1. HttpClient (http-client.ts)

**职责**: 核心 HTTP 客户端，封装所有 HTTP 请求功能

**主要功能**:

- 提供标准的 HTTP 方法（GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS）
- 文件上传和下载
- 请求和响应拦截器
- 自动 Token 注入
- 统一的错误处理
- 配置管理

**关键方法**:

```typescript
request<T>(config: RequestConfig): Promise<ResponseData<T>>
get<T>(url: string, config?: RequestConfig): Promise<ResponseData<T>>
post<T>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>>
upload<T>(url: string, file: File | Blob, options?): Promise<ResponseData<T>>
download<T>(url: string, options?): Promise<Blob>
cancelRequest(config: RequestConfig, reason?: string): void
cancelAll(reason?: string): void
```

### 2. HttpErrorHandler (error-handler.ts)

**职责**: 统一处理 HTTP 错误

**主要功能**:

- 错误标准化
- 错误分类（取消、超时、网络错误、服务器错误）
- 错误消息生成
- 重试条件判断
- 错误日志记录

**关键方法**:

```typescript
handleError(error: any): HttpError
shouldRetry(error: HttpError): boolean
```

### 3. CacheManager (cache-manager.ts)

**职责**: 管理请求缓存

**主要功能**:

- 缓存存储和检索
- 缓存过期管理
- 缓存键生成
- 批量缓存操作

**关键方法**:

```typescript
get(key: string): any
set(key: string, data: any, cacheTime?: number): void
delete(key: string): boolean
clear(): void
cleanExpired(): void
generateKey(config: any): string
```

### 4. CancelManager (cancel-manager.ts)

**职责**: 管理请求取消

**主要功能**:

- 请求取消键生成
- 待处理请求跟踪
- 单个请求取消
- 批量请求取消
- 按模式取消

**关键方法**:

```typescript
addPendingRequest(config: any, cancelTokenSource: CancelTokenSource): void
removePendingRequest(config: any): void
cancelRequest(config: any, reason?: string): void
cancelAll(reason?: string): void
cancelByPattern(pattern: RegExp, reason?: string): void
```

### 5. RetryManager (retry-manager.ts)

**职责**: 管理请求重试

**主要功能**:

- 重试逻辑实现
- 重试延迟计算（支持指数退避）
- 重试条件判断
- 可配置的重试策略

**关键方法**:

```typescript
retry<T>(fn: () => Promise<T>, error: HttpError, currentRetry?: number): Promise<T>
shouldRetry(error: HttpError): boolean
updateConfig(config: Partial<RetryConfig>): void
```

### 6. types.ts

**职责**: 定义所有类型接口

**主要类型**:

- `HttpConfig`: HTTP 客户端配置
- `RequestConfig`: 请求配置
- `ResponseData<T>`: 响应数据结构
- `HttpError`: 错误类型
- `CacheConfig`: 缓存配置
- `RetryConfig`: 重试配置
- `HttpMethod`: HTTP 方法类型

## 设计模式

### 1. 单例模式

每个 HttpClient 实例都是独立的，可以创建多个实例用于不同的 API 服务。

### 2. 策略模式

重试策略、缓存策略都可以通过配置灵活定制。

### 3. 拦截器模式

请求和响应拦截器允许在请求生命周期的各个阶段插入自定义逻辑。

### 4. 工厂模式

`createHttpClient` 函数提供了便捷的实例创建方式。

## 数据流

### 请求流程

```
用户调用 http.get()
    ↓
HttpClient.request()
    ↓
请求拦截器 (requestInterceptor)
    ↓
添加 Token (如果未跳过)
    ↓
添加取消令牌 (如果指定了 cancelKey)
    ↓
数据转换 (transformRequest)
    ↓
发送 Axios 请求
    ↓
响应拦截器 (responseInterceptor)
    ↓
数据转换 (transformResponse)
    ↓
移除取消令牌
    ↓
缓存数据 (如果启用缓存)
    ↓
返回响应数据
```

### 错误处理流程

```
请求失败
    ↓
HttpErrorHandler.handleError()
    ↓
错误标准化
    ↓
错误分类
    ↓
是否需要重试？
    ↓ 是
RetryManager.retry()
    ↓
重试成功 → 返回结果
    ↓
重试失败 → 继续错误处理
    ↓ 否
错误日志记录
    ↓
显示错误消息 (如果启用)
    ↓
抛出错误
```

## 特性说明

### 1. 类型安全

完整的 TypeScript 类型定义，提供良好的开发体验和类型检查。

### 2. 可扩展性

通过拦截器和配置选项，可以轻松扩展功能。

### 3. 错误处理

统一的错误处理机制，自动识别和处理各种错误情况。

### 4. 性能优化

- 请求缓存减少网络请求
- 智能重试提高成功率
- 请求取消避免资源浪费

### 5. 开发体验

- 清晰的 API 设计
- 详细的文档和示例
- 完善的错误提示

## 最佳实践

### 1. 创建专用实例

为不同的 API 服务创建专用的 HttpClient 实例。

```typescript
const apiClient = createHttpClient({ baseURL: 'https://api.example.com' });
const fileClient = createHttpClient({ baseURL: 'https://files.example.com' });
```

### 2. 封装 API 方法

将具体的 API 调用封装成服务方法。

```typescript
export const userService = {
  getUsers: () => apiClient.get('/users'),
  getUserById: (id) => apiClient.get(`/users/${id}`),
};
```

### 3. 合理使用缓存

对不经常变化的数据启用缓存。

```typescript
const response = await http.get('/config', { enableCache: true });
```

### 4. 及时取消请求

在组件卸载时取消未完成的请求。

```typescript
useEffect(() => {
  const fetchData = async () => {
    await http.get('/users', { cancelKey: 'users' });
  };
  fetchData();

  return () => {
    http.cancelRequest({ url: '/users', method: 'GET', cancelKey: 'users' });
  };
}, []);
```

### 5. 统一错误处理

在响应拦截器中统一处理业务错误。

```typescript
responseInterceptorCatch: (error) => {
  if (error.response?.status === 401) {
    // 跳转登录页
  }
  return Promise.reject(error);
};
```

## 性能考虑

1. **缓存**: 合理使用缓存可以显著减少网络请求
2. **取消**: 及时取消不需要的请求，避免资源浪费
3. **重试**: 适当的重试策略可以提高请求成功率，但要注意不要过度重试
4. **超时**: 设置合理的超时时间，避免长时间等待

## 安全考虑

1. **Token 管理**: 自动注入 Token，支持跳过 Token 的请求
2. **HTTPS**: 建议在生产环境使用 HTTPS
3. **敏感数据**: 避免在 URL 中传递敏感数据，使用 POST 请求体
4. **错误信息**: 生产环境避免显示详细的错误信息

## 扩展建议

1. **请求队列**: 可以扩展实现请求队列功能，控制并发请求数量
2. **Mock 数据**: 可以集成 Mock 功能，方便开发测试
3. **日志记录**: 可以集成日志系统，记录所有请求和响应
4. **性能监控**: 可以添加性能监控，统计请求耗时、成功率等指标

## 总结

这个 HTTP 模块提供了一个完整、灵活、易用的 HTTP 请求解决方案。通过合理的架构设计和丰富的功能特性，能够满足企业级应用的各种需求。模块化的设计使得各个组件职责清晰，易于维护和扩展。
