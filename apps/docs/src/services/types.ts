// 定义接口返回类型
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

export interface UserInfo {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: UserInfo
}