# HTTP 模块快速参考

## 快速开始

```typescript
import { createHttpClient } from '@unifying/core'

const http = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000
})
```

## 常用方法

### GET 请求
```typescript
const response = await http.get('/users')
const response = await http.get('/users', { params: { page: 1 } })
```

### POST 请求
```typescript
const response = await http.post('/users', { name: 'John' })
```

### PUT 请求
```typescript
const response = await http.put('/users/1', { name: 'Jane' })
```

### DELETE 请求
```typescript
const response = await http.delete('/users/1')
```

### 文件上传
```typescript
const response = await http.upload('/upload', file, {
  onProgress: (p) => console.log(`${p}%`)
})
```

### 文件下载
```typescript
const blob = await http.download('/file.pdf', { filename: 'doc.pdf' })
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| baseURL | string | '' | 基础 URL |
| timeout | number | 30000 | 超时时间（毫秒） |
| retryCount | number | 3 | 重试次数 |
| retryDelay | number \| function | 1000 | 重试延迟 |
| enableCache | boolean | false | 启用缓存 |
| cacheTime | number | 300000 | 缓存时间（毫秒） |
| showErrorMessage | boolean | true | 显示错误消息 |

## 请求取消

```typescript
// 发送请求时指定 cancelKey
http.get('/users', { cancelKey: 'users' })

// 取消请求
http.cancelRequest({ url: '/users', method: 'GET', cancelKey: 'users' })

// 取消所有请求
http.cancelAll()

// 按模式取消
http.cancelByPattern(/^GET:/)
```

## 缓存管理

```typescript
// 清除缓存
http.clearCache()

// 清除过期缓存
http.cleanExpiredCache()

// 获取缓存大小
const size = http.getCacheSize()

// 获取缓存键
const keys = http.getCacheKeys()
```

## 错误处理

```typescript
try {
  const response = await http.get('/users')
} catch (error) {
  console.log(error.message)      // 错误信息
  console.log(error.isAxiosError) // 是否 Axios 错误
  console.log(error.isCancel)     // 是否被取消
  console.log(error.isTimeout)    // 是否超时
  console.log(error.isNetworkError) // 是否网络错误
}
```

## 拦截器

```typescript
const http = createHttpClient({
  requestInterceptor: (config) => {
    config.headers.Authorization = `Bearer ${token}`
    return config
  },
  responseInterceptor: (response) => {
    return response
  },
  responseInterceptorCatch: (error) => {
    if (error.response?.status === 401) {
      // 处理未授权
    }
    return Promise.reject(error)
  }
})
```

## 封装 API 服务

```typescript
const api = createHttpClient({ baseURL: 'https://api.example.com' })

export const userService = {
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`)
}
```

## 完整示例

```typescript
import { createHttpClient } from '@unifying/core'

const http = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  retryCount: 3,
  enableCache: true,
  cacheTime: 5 * 60 * 1000,
  requestInterceptor: (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }
})

async function fetchUsers() {
  try {
    const response = await http.get('/users', {
      params: { page: 1, pageSize: 10 },
      enableCache: true
    })
    return response.data
  } catch (error) {
    console.error('获取用户失败:', error.message)
    throw error
  }
}
```

## 文件结构

```
packages/core/src/http/
├── types.ts              # 类型定义
├── http-client.ts        # 核心 HTTP 客户端
├── error-handler.ts      # 错误处理器
├── cache-manager.ts      # 缓存管理器
├── cancel-manager.ts     # 取消管理器
├── retry-manager.ts      # 重试管理器
├── index.ts              # 导出入口
├── example.ts            # 使用示例
└── README.md             # 详细文档
```
