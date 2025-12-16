import { http } from "../http"
import { ApiResponse, LoginRequest, LoginResponse, UserInfo } from "../types"

/**
 * 用户相关 API
 */
export class UserApiService {
  /**
   * 用户登录
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await http.post<ApiResponse<LoginResponse>>('/auth/login', credentials)
    return response.data.data
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<UserInfo> {
    const response = await http.get<ApiResponse<UserInfo>>('/user/me')
    return response.data.data
  }

  /**
   * 更新用户信息
   */
  static async updateProfile(userData: Partial<UserInfo>): Promise<UserInfo> {
    const response = await http.put<ApiResponse<UserInfo>>('/user/profile', userData)
    return response.data.data
  }

  /**
   * 获取用户列表
   */
  static async getUserList(page = 1, limit = 10): Promise<{ users: UserInfo[]; total: number }> {
    const response = await http.get<ApiResponse<{ users: UserInfo[]; total: number }>>('/users', {
      params: { page, limit },
    })
    return response.data.data
  }
}