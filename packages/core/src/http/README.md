# HTTP 模块使用文档

基于 Axios 的企业级 HTTP 请求二次封装模块，提供完善的错误处理、请求取消、重试机制、缓存功能等。

## 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [核心功能](#核心功能)
  - [请求方法](#请求方法)
  - [错误处理](#错误处理)
  - [请求取消](#请求取消)
  - [请求重试](#请求重试)
  - [请求缓存](#请求缓存)
  - [文件上传](#文件上传)
  - [文件下载](#文件下载)
- [配置选项](#配置选项)
- [拦截器](#拦截器)
- [类型定义](#类型定义)
- [最佳实践](#最佳实践)
- [API 参考](#api-参考)

## 特性

- ✅ 基于 Axios 的二次封装，完全兼容 Axios API
- ✅ TypeScript 支持，完整的类型定义
- ✅ 统一的错误处理机制
- ✅ 请求拦截器和响应拦截器
- ✅ 请求取消功能，支持按模式批量取消
- ✅ 智能重试机制，可配置重试次数和延迟
- ✅ 请求缓存功能，支持自定义缓存时间
- ✅ 文件上传和下载，支持进度回调
- ✅ 自动 Token 注入
- ✅ 请求队列管理
- ✅ 环境区分（开发/生产）

## 安装

```bash
npm install @unifying/core
# 或
yarn add @unifying/core
# 或
pnpm add @unifying/core
```

## 快速开始

### 基础使用

```typescript
import { createHttpClient } from '@unifying/core';

// 创建 HTTP 客户端实例
const http = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
});

// 发送 GET 请求
const response = await http.get('/users');
console.log(response.data);

// 发送 POST 请求
const result = await http.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
console.log(result.data);
```

### 完整配置

```typescript
import { createHttpClient } from '@unifying/core';

const http = createHttpClient({
  // 基础 URL
  baseURL: 'https://api.example.com',

  // 请求超时时间（毫秒）
  timeout: 30000,

  // 重试配置
  retryCount: 3,
  retryDelay: 1000,

  // 缓存配置
  enableCache: true,
  cacheTime: 5 * 60 * 1000, // 5分钟

  // 错误提示配置
  showErrorMessage: true,
  showErrorDetail: false,

  // 请求头
  headers: {
    'Content-Type': 'application/json',
  },

  // 数据转换
  transformRequest: (data) => {
    // 请求前转换数据
    return JSON.stringify(data);
  },

  transformResponse: (data) => {
    // 响应后转换数据
    return data;
  },

  // 请求拦截器
  requestInterceptor: (config) => {
    // 在发送请求之前做些什么
    console.log('Request:', config);
    return config;
  },

  // 响应拦截器
  responseInterceptor: (response) => {
    // 对响应数据做点什么
    console.log('Response:', response);
    return response;
  },
});
```

## 核心功能

### 请求方法

#### GET 请求

```typescript
// 基础 GET 请求
const response = await http.get('/users');

// 带查询参数
const response = await http.get('/users', {
  params: {
    page: 1,
    pageSize: 10,
  },
});

// 启用缓存
const response = await http.get('/users', {
  enableCache: true,
  cacheTime: 10 * 60 * 1000, // 10分钟
});
```

#### POST 请求

```typescript
// 基础 POST 请求
const response = await http.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// 带配置的 POST 请求
const response = await http.post('/users', data, {
  headers: {
    'Content-Type': 'application/json',
  },
  skipErrorHandler: false,
});
```

#### PUT 请求

```typescript
const response = await http.put('/users/1', {
  name: 'Jane Doe',
  email: 'jane@example.com',
});
```

#### DELETE 请求

```typescript
const response = await http.delete('/users/1');
```

#### PATCH 请求

```typescript
const response = await http.patch('/users/1', {
  email: 'newemail@example.com',
});
```

### 错误处理

HTTP 模块提供了统一的错误处理机制，自动处理各种错误情况。

```typescript
try {
  const response = await http.get('/users');
  console.log(response.data);
} catch (error) {
  // 错误对象包含以下属性
  console.log(error.message); // 错误信息
  console.log(error.isAxiosError); // 是否为 Axios 错误
  console.log(error.isCancel); // 是否被取消
  console.log(error.isTimeout); // 是否超时
  console.log(error.isNetworkError); // 是否网络错误
  console.log(error.response); // 响应对象
}
```

#### 自定义错误处理

```typescript
const http = createHttpClient({
  responseInterceptorCatch: (error) => {
    // 自定义错误处理逻辑
    if (error.response?.status === 401) {
      // 处理未授权
      console.log('请重新登录');
    } else if (error.response?.status === 403) {
      // 处理禁止访问
      console.log('没有权限访问');
    }

    // 返回处理后的错误或抛出
    return Promise.reject(error);
  },
});
```

#### 跳过错误处理

```typescript
// 跳过全局错误处理器
const response = await http.get('/users', {
  skipErrorHandler: true,
});
```

### 请求取消

#### 取消单个请求

```typescript
// 发送请求时指定 cancelKey
const request1 = http.get('/users', {
  cancelKey: 'get-users',
});

// 取消请求
http.cancelRequest({ url: '/users', method: 'GET', cancelKey: 'get-users' });
```

#### 取消所有请求

```typescript
// 取消所有进行中的请求
http.cancelAll('用户取消了请求');
```

#### 按模式批量取消

```typescript
// 取消所有 /api/users 开头的请求
http.cancelByPattern(/^GET:\/api\/users:/, '批量取消用户请求');
```

### 请求重试

HTTP 模块支持自动重试失败的请求。

```typescript
const http = createHttpClient({
  retryCount: 3, // 重试次数
  retryDelay: 1000, // 重试延迟（毫秒）
});

// 自定义重试延迟策略
const http = createHttpClient({
  retryCount: 3,
  retryDelay: (retryCount) => {
    // 指数退避策略
    return Math.pow(2, retryCount) * 1000;
  },
});

// 自定义重试条件
const http = createHttpClient({
  retryCount: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // 只在网络错误或 5xx 错误时重试
    return error.isNetworkError || (error.response?.status && error.response.status >= 500);
  },
});
```

### 请求缓存

GET 请求支持缓存功能，可以显著提高性能。

```typescript
// 启用全局缓存
const http = createHttpClient({
  enableCache: true,
  cacheTime: 5 * 60 * 1000, // 5分钟
});

// 单个请求启用缓存
const response = await http.get('/users', {
  enableCache: true,
  cacheTime: 10 * 60 * 1000, // 10分钟
});

// 清除缓存
http.clearCache();

// 清除过期缓存
http.cleanExpiredCache();

// 获取缓存大小
const size = http.getCacheSize();

// 获取所有缓存键
const keys = http.getCacheKeys();
```

### 文件上传

```typescript
// 基础文件上传
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const response = await http.upload('/upload', file);

// 带进度回调的文件上传
const response = await http.upload('/upload', file, {
  fieldName: 'file',
  data: {
    userId: '123',
    description: 'Avatar image',
  },
  onProgress: (progress) => {
    console.log(`上传进度: ${progress}%`);
  },
});
```

### 文件下载

```typescript
// 基础文件下载
const blob = await http.download('/download/file.pdf');

// 带进度回调的文件下载
const blob = await http.download('/download/file.pdf', {
  onProgress: (progress) => {
    console.log(`下载进度: ${progress}%`);
  },
  filename: 'document.pdf', // 自动触发下载
});
```

## 配置选项

### HttpConfig

| 配置项              | 类型               | 默认值 | 说明                 |
| ------------------- | ------------------ | ------ | -------------------- |
| baseURL             | string             | ''     | 基础 URL             |
| timeout             | number             | 30000  | 请求超时时间（毫秒） |
| retryCount          | number             | 3      | 重试次数             |
| retryDelay          | number \| function | 1000   | 重试延迟（毫秒）     |
| enableCache         | boolean            | false  | 是否启用缓存         |
| cacheTime           | number             | 300000 | 缓存时间（毫秒）     |
| showErrorMessage    | boolean            | true   | 是否显示错误消息     |
| showErrorDetail     | boolean            | false  | 是否显示错误详情     |
| headers             | object             | -      | 默认请求头           |
| transformRequest    | function           | -      | 请求转换函数         |
| transformResponse   | function           | -      | 响应转换函数         |
| requestInterceptor  | function           | -      | 请求拦截器           |
| responseInterceptor | function           | -      | 响应拦截器           |

### RequestConfig

| 配置项             | 类型    | 默认值 | 说明                |
| ------------------ | ------- | ------ | ------------------- |
| skipErrorHandler   | boolean | false  | 是否跳过错误处理    |
| skipAuth           | boolean | false  | 是否跳过 Token 注入 |
| skipLoading        | boolean | false  | 是否跳过加载状态    |
| loadingText        | string  | -      | 加载提示文本        |
| customErrorMessage | string  | -      | 自定义错误消息      |
| cancelKey          | string  | -      | 请求取消键          |
| enableCache        | boolean | false  | 是否启用缓存        |
| cacheTime          | number  | -      | 缓存时间            |

## 拦截器

### 请求拦截器

```typescript
const http = createHttpClient({
  requestInterceptor: (config) => {
    // 添加时间戳
    config.params = {
      ...config.params,
      _t: Date.now(),
    };

    // 添加 Token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  requestInterceptorCatch: (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  },
});
```

### 响应拦截器

```typescript
const http = createHttpClient({
  responseInterceptor: (response) => {
    // 统一处理响应数据
    const { data } = response;

    if (data.code === 0) {
      return response;
    } else {
      // 业务错误
      return Promise.reject(new Error(data.message));
    }
  },

  responseInterceptorCatch: (error) => {
    // 统一错误处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 跳转到登录页
          window.location.href = '/login';
          break;
        case 403:
          console.error('没有权限');
          break;
        case 404:
          console.error('资源不存在');
          break;
        case 500:
          console.error('服务器错误');
          break;
      }
    }

    return Promise.reject(error);
  },
});
```

## 类型定义

### ResponseData

```typescript
interface ResponseData<T = any> {
  code: number; // 响应码
  data: T; // 响应数据
  message: string; // 响应消息
  success: boolean; // 是否成功
  timestamp?: number; // 时间戳
}
```

### HttpError

```typescript
interface HttpError extends Error {
  config?: AxiosRequestConfig;
  code?: string;
  request?: any;
  response?: AxiosResponse<ResponseData>;
  isAxiosError: boolean; // 是否为 Axios 错误
  isCancel: boolean; // 是否被取消
  isTimeout: boolean; // 是否超时
  isNetworkError: boolean; // 是否网络错误
}
```

### HttpMethod

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
```

## 最佳实践

### 1. 创建多个实例

```typescript
// API 客户端
const apiClient = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
});

// 文件服务客户端
const fileClient = createHttpClient({
  baseURL: 'https://files.example.com',
  timeout: 60000,
});

// 第三方服务客户端
const thirdPartyClient = createHttpClient({
  baseURL: 'https://third-party.example.com',
  timeout: 10000,
  skipAuth: true,
});
```

### 2. 封装 API 方法

```typescript
// services/user.ts
import { createHttpClient } from '@unifying/core';

const http = createHttpClient({
  baseURL: 'https://api.example.com',
});

export const userService = {
  // 获取用户列表
  getUsers: (params: any) => http.get('/users', { params }),

  // 获取用户详情
  getUserById: (id: string) => http.get(`/users/${id}`),

  // 创建用户
  createUser: (data: any) => http.post('/users', data),

  // 更新用户
  updateUser: (id: string, data: any) => http.put(`/users/${id}`, data),

  // 删除用户
  deleteUser: (id: string) => http.delete(`/users/${id}`),
};
```

### 3. 请求取消的最佳实践

```typescript
// 在组件卸载时取消请求
import { useEffect } from 'react'

function UserList() {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await http.get('/users', {
          cancelKey: 'user-list'
        })
        // 处理数据
      } catch (error) {
        if (!error.isCancel) {
          // 处理非取消错误
        }
      }
    }

    fetchData()

    // 组件卸载时取消请求
    return () => {
      http.cancelRequest({
        url: '/users',
        method: 'GET',
        cancelKey: 'user-list'
      })
    }
  }, [])

  return <div>User List</div>
}
```

### 4. 错误边界处理

```typescript
// 创建错误边界组件
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
  }

  render() {
    return this.props.children
  }
}

// 在应用中使用
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## API 参考

### HttpClient

#### 方法

| 方法              | 参数                                            | 返回值                   | 说明            |
| ----------------- | ----------------------------------------------- | ------------------------ | --------------- |
| request           | config: RequestConfig                           | Promise<ResponseData<T>> | 通用请求方法    |
| get               | url: string, config?: RequestConfig             | Promise<ResponseData<T>> | GET 请求        |
| post              | url: string, data?: any, config?: RequestConfig | Promise<ResponseData<T>> | POST 请求       |
| put               | url: string, data?: any, config?: RequestConfig | Promise<ResponseData<T>> | PUT 请求        |
| delete            | url: string, config?: RequestConfig             | Promise<ResponseData<T>> | DELETE 请求     |
| patch             | url: string, data?: any, config?: RequestConfig | Promise<ResponseData<T>> | PATCH 请求      |
| upload            | url: string, file: File \| Blob, options?       | Promise<ResponseData<T>> | 文件上传        |
| download          | url: string, options?                           | Promise<Blob>            | 文件下载        |
| cancelRequest     | config: RequestConfig, reason?: string          | void                     | 取消请求        |
| cancelAll         | reason?: string                                 | void                     | 取消所有请求    |
| cancelByPattern   | pattern: RegExp, reason?: string                | void                     | 按模式取消请求  |
| clearCache        | -                                               | void                     | 清除缓存        |
| cleanExpiredCache | -                                               | void                     | 清除过期缓存    |
| getCacheSize      | -                                               | number                   | 获取缓存大小    |
| getCacheKeys      | -                                               | string[]                 | 获取缓存键      |
| updateConfig      | config: Partial<HttpConfig>                     | void                     | 更新配置        |
| getConfig         | -                                               | HttpConfig               | 获取配置        |
| getAxiosInstance  | -                                               | AxiosInstance            | 获取 Axios 实例 |

### 工具类

#### HttpErrorHandler

错误处理器，用于统一处理 HTTP 错误。

```typescript
const errorHandler = new HttpErrorHandler();
const httpError = errorHandler.handleError(error);
const shouldRetry = errorHandler.shouldRetry(httpError);
```

#### CacheManager

缓存管理器，用于管理请求缓存。

```typescript
const cacheManager = new CacheManager();
cacheManager.set('key', data, 60000);
const data = cacheManager.get('key');
cacheManager.delete('key');
cacheManager.clear();
```

#### CancelManager

取消管理器，用于管理请求取消。

```typescript
const cancelManager = new CancelManager();
cancelManager.addPendingRequest(config, cancelTokenSource);
cancelManager.cancelRequest(config);
cancelManager.cancelAll();
```

#### RetryManager

重试管理器，用于管理请求重试。

```typescript
const retryManager = new RetryManager({ count: 3, delay: 1000 });
await retryManager.retry(fn, error);
const shouldRetry = retryManager.shouldRetry(error);
```

## 许可证

MIT
