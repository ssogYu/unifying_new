/**
 * HTTP Service - 统一的 HTTP 请求服务
 * 基于 @unifying/core 实现，确保单一实例和最佳实践
 */

import {
  createHttpClient,
  getDefaultHttpClient,
  setDefaultHttpClient,
  type HttpClientConfig,
  type HttpClient,
  type HttpResponse,
  type HttpError,
} from '@unifying/core';

const defaultBaseUrl = (import.meta.env as any).VITE_API_BASE_URL || '/api';
const isDev = (import.meta.env as any).DEV || false;

/**
 * HTTP 服务配置
 */
const HTTP_CONFIG: HttpClientConfig = {
  baseURL: defaultBaseUrl,
  timeout: 10000,
  enableLogging: isDev,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * HTTP 服务类 - 单例模式
 */
class HttpService {
  private static instance: HttpService;
  private client: HttpClient;

  private constructor() {
    this.client = createHttpClient(HTTP_CONFIG);
    this.setupInterceptors();
    // 设置为默认客户端，确保整个应用使用同一个实例
    setDefaultHttpClient(this.client);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): HttpService {
    if (!HttpService.instance) {
      HttpService.instance = new HttpService();
    }
    return HttpService.instance;
  }

  /**
   * 获取 HTTP 客户端实例
   */
  public getClient(): HttpClient {
    return this.client;
  }

  /**
   * 配置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.client.use({
      request: async (config: any) => {
        // 添加认证 token（如果存在）
        const token = this.getAuthToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加请求 ID
        config.headers = config.headers || {};
        config.headers['X-Custom-Request-ID'] = this.generateRequestId();

        // 开发环境下打印请求信息
        if (isDev) {
          console.log(`🚀 HTTP Request: ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      response: async (response: any) => {
        // 开发环境下打印响应信息
        if (isDev) {
          console.log(
            `✅ HTTP Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
            {
              status: response.status,
              data: response.data,
            }
          );
        }
        // 处理业务状态码
        if (response.data && typeof response.data === 'object' && 'code' in response.data) {
          const businessCode = response.data.code;

          // 业务错误处理
          if (businessCode !== 0 && businessCode !== 200) {
            const errorMessage = response.data.message || '业务处理失败';
            this.handleBusinessError(businessCode, errorMessage);
            throw new Error(errorMessage);
          }
        }
        return response;
      },
      error: (error: any) => {
        console.error('❌ HTTP Response Error:', error);
        // 统一错误处理
        this.handleHttpError(error);

        return Promise.reject(error);
      },
    });
  }

  /**
   * 获取认证 token
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 处理业务错误
   */
  private handleBusinessError(code: number, message: string): void {
    // 根据业务错误码进行特殊处理
    switch (code) {
      case 401:
        // 未授权，跳转到登录页
        console.warn('用户未授权，需要重新登录');
        this.clearAuthToken();
        // window.location.href = '/login'
        break;
      case 403:
        // 权限不足
        console.warn('用户权限不足');
        break;
      case 1001:
        // 其他业务错误
        console.warn('业务错误:', message);
        break;
      default:
        console.warn('未知业务错误:', { code, message });
    }
  }

  /**
   * 处理 HTTP 错误
   */
  private handleHttpError(error: any): void {
    if (error.response) {
      // 服务器响应的错误
      const { status, data } = error.response;
      let message = '请求失败';

      switch (status) {
        case 400:
          message = '请求参数错误';
          break;
        case 401:
          message = '未授权，请重新登录';
          this.clearAuthToken();
          break;
        case 403:
          message = '权限不足';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        case 502:
          message = '网关错误';
          break;
        case 503:
          message = '服务不可用';
          break;
        default:
          message = data?.message || `请求失败 (${status})`;
      }

      console.error(`HTTP Error ${status}:`, message);
    } else if (error.request) {
      // 网络错误
      console.error('Network Error: 网络连接失败，请检查网络设置');
    } else {
      // 其他错误
      console.error('Error:', error.message);
    }
  }

  /**
   * 清除认证 token
   */
  private clearAuthToken(): void {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
  }

  /**
   * 更新认证 token
   */
  public updateAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * 清除所有认证信息
   */
  public clearAuth(): void {
    this.clearAuthToken();
  }
}

// 导出单例实例
export const httpService = HttpService.getInstance();

// 导出便捷方法，直接使用单例
export const http = httpService.getClient();

// 导出类型
export type { HttpClientConfig, HttpResponse, HttpError };

// 导出默认客户端（兼容其他可能使用默认客户端的代码）
export const defaultHttpClient = getDefaultHttpClient();
