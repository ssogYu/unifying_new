import { createHttpClient } from '@unifying/core'

// 示例 1: 基础使用
const http = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000
})

// GET 请求
async function getUsers() {
  try {
    const response = await http.get('/users')
    console.log(response.data)
  } catch (error: any) {
    console.error('获取用户列表失败:', error.message)
  }
}

// POST 请求
async function createUser(userData: any) {
  try {
    const response = await http.post('/users', userData)
    console.log('用户创建成功:', response.data)
  } catch (error: any) {
    console.error('创建用户失败:', error.message)
  }
}

// 示例 2: 带缓存的请求
const httpWithCache = createHttpClient({
  baseURL: 'https://api.example.com',
  enableCache: true,
  cacheTime: 5 * 60 * 1000 // 5分钟
})

async function getCachedUsers() {
  const response = await httpWithCache.get('/users', {
    enableCache: true
  })
  return response.data
}

// 示例 3: 文件上传
async function uploadFile(file: File) {
  try {
    const response = await http.upload('/upload', file, {
      fieldName: 'file',
      data: { userId: '123' },
      onProgress: (progress) => {
        console.log(`上传进度: ${progress}%`)
      }
    })
    console.log('文件上传成功:', response.data)
  } catch (error: any) {
    console.error('文件上传失败:', error.message)
  }
}

// 示例 4: 文件下载
async function downloadFile(url: string, filename: string) {
  try {
    const blob = await http.download(url, {
      filename,
      onProgress: (progress) => {
        console.log(`下载进度: ${progress}%`)
      }
    })
    console.log('文件下载成功:', blob)
  } catch (error: any) {
    console.error('文件下载失败:', error.message)
  }
}

// 示例 5: 请求取消
async function fetchWithCancel() {
  const requestConfig = {
    url: '/users',
    method: 'GET' as const,
    cancelKey: 'get-users'
  }

  // 发送请求
  const request = http.get('/users', { cancelKey: 'get-users' })

  // 2秒后取消请求
  setTimeout(() => {
    http.cancelRequest(requestConfig, '手动取消请求')
  }, 2000)

  try {
    const response = await request
    console.log(response.data)
  } catch (error: any) {
    if (error.isCancel) {
      console.log('请求已取消')
    } else {
      console.error('请求失败:', error.message)
    }
  }
}

// 示例 6: 自定义拦截器
const httpWithInterceptors = createHttpClient({
  baseURL: 'https://api.example.com',
  requestInterceptor: (config) => {
    console.log('发送请求:', config.url)
    return config
  },
  responseInterceptor: (response) => {
    console.log('收到响应:', response.status)
    return response
  },
  responseInterceptorCatch: (error) => {
    if (error.response?.status === 401) {
      console.log('未授权，请重新登录')
    }
    return Promise.reject(error)
  }
})

// 示例 7: 封装 API 服务
const apiClient = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000
})

export const userService = {
  getUsers: (params?: any) => apiClient.get('/users', { params }),
  getUserById: (id: string) => apiClient.get(`/users/${id}`),
  createUser: (data: any) => apiClient.post('/users', data),
  updateUser: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`)
}

export const productService = {
  getProducts: (params?: any) => apiClient.get('/products', { params }),
  getProductById: (id: string) => apiClient.get(`/products/${id}`),
  createProduct: (data: any) => apiClient.post('/products', data),
  updateProduct: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id: string) => apiClient.delete(`/products/${id}`)
}

// 示例 8: 使用封装的 API 服务
async function exampleUsage() {
  // 获取用户列表
  const users = await userService.getUsers({ page: 1, pageSize: 10 })
  console.log('用户列表:', users.data)

  // 创建用户
  const newUser = await userService.createUser({
    name: 'John Doe',
    email: 'john@example.com'
  })
  console.log('新用户:', newUser.data)

  // 获取产品列表
  const products = await productService.getProducts()
  console.log('产品列表:', products.data)
}

// 示例 9: 错误处理
async function handleError() {
  try {
    const response = await http.get('/non-existent')
    console.log(response.data)
  } catch (error: any) {
    if (error.isAxiosError) {
      console.log('Axios 错误')
      if (error.isCancel) {
        console.log('请求被取消')
      } else if (error.isTimeout) {
        console.log('请求超时')
      } else if (error.isNetworkError) {
        console.log('网络错误')
      } else if (error.response) {
        console.log('服务器返回错误:', error.response.status)
      }
    } else {
      console.log('其他错误:', error.message)
    }
  }
}

// 示例 10: 缓存管理
async function cacheExample() {
  // 启用缓存
  const httpCache = createHttpClient({
    baseURL: 'https://api.example.com',
    enableCache: true,
    cacheTime: 10 * 60 * 1000 // 10分钟
  })

  // 第一次请求 - 会发送网络请求
  const response1 = await httpCache.get('/users', { enableCache: true })
  console.log('第一次请求:', response1.data)

  // 第二次请求 - 会从缓存读取
  const response2 = await httpCache.get('/users', { enableCache: true })
  console.log('第二次请求（缓存）:', response2.data)

  // 获取缓存大小
  const cacheSize = httpCache.getCacheSize()
  console.log('缓存大小:', cacheSize)

  // 获取所有缓存键
  const cacheKeys = httpCache.getCacheKeys()
  console.log('缓存键:', cacheKeys)

  // 清除缓存
  httpCache.clearCache()
  console.log('缓存已清除')
}

// 导出示例函数
export {
  getUsers,
  createUser,
  getCachedUsers,
  uploadFile,
  downloadFile,
  fetchWithCancel,
  exampleUsage,
  handleError,
  cacheExample
}
