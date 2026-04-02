import axios from "axios";
import { AppError, ErrorType } from "./type";

export class ErrorManager {
  private showToast(message: string) {
    console.warn(`[UI Toast]: ${message}`);
  }
  private reportToMonitor(error: AppError) {
    console.log(`[Monitor Report] 上报错误类型: ${error.type}`, error);
  }
  /**
   * 处理 HTTP 状态码引发的网络错误
   */
  public handleHttpError(status: number, message?: string): AppError {
    let msg = '网络请求异常，请稍后再试';
    switch (status) {
      case 400:
        msg = '请求参数错误';
        break;
      case 401:
        msg = '登录已过期，请重新登录';
        // 可以在这里触发登出操作，如: store.dispatch('logout');
        break;
      case 403:
        msg = '没有权限访问该资源';
        break;
      case 404:
        msg = '请求的接口或资源不存在';
        break;
      case 408:
        msg = '请求超时';
        break;
      case 500:
        msg = '服务器内部错误';
        break;
      case 502:
        msg = '网关错误';
        break;
      case 503:
        msg = '服务不可用';
        break;
      case 504:
        msg = '网关超时';
        break;
      default:
        msg = message || `网络错误 (${status})`;
    }

    const appError: AppError = { type: ErrorType.HTTP, code: status, message: msg };
    this.showToast(msg);
    this.reportToMonitor(appError);
    return appError;
  }

  /**
   * 处理后端接口返回的业务逻辑错误 ( HTTP 200，但业务 code != 200)
   */
  public handleBusinessError(code: number | string, message: string): AppError {
    const msg = message || '业务处理失败';
    const appError: AppError = { type: ErrorType.BUSINESS, code, message: msg };
    if (code == 401 || code === '401') {
      this.showToast('登录已过期，请重新登录');
    } else {
      this.showToast(msg);
    }
    return appError;
  }
  /**
   * 统一的错误入口处理函数（可直接在 catch 中调用）
   */
  public process(error: any): AppError {
    let appError: AppError;
    if (axios.isCancel(error)) {
      // 1. 请求被主动取消
      appError = { type: ErrorType.CANCEL, message: '请求已被主动取消', originalError: error };
    } else if (error.request || error.response || error.isAxiosError) {
      // 2. Axios 捕获的 HTTP/网络错误
      if (error.response) {
        // 请求发出了，并且服务器回复了状态码 (不在 2xx 范围内)
        appError = this.handleHttpError(error.response.status, error.response.data?.message);
        appError.originalError = error;
      } else if (error.request) {
        // 请求发出了，但没有收到响应 (比如断网、服务器宕机)
        const msg = error.message.includes('timeout')
          ? '请求超时，请检查网络连接'
          : '网络连接异常，无法连接到服务器';
        appError = { type: ErrorType.HTTP, message: msg, originalError: error };
        this.showToast(msg);
      } else {
        // 配置请求时发生了一些事情，触发了一个错误
        appError = {
          type: ErrorType.SYSTEM,
          message: `请求配置错误: ${error.message}`,
          originalError: error,
        };
        this.showToast('系统请求配置异常');
      }
    } else if (error.type === ErrorType.BUSINESS) {
      // 3. 拦截器抛出的业务错误 (透传)
      appError = error;
    } else if (error instanceof Error) {
      // 4. 其他代码执行产生的 TypeError / ReferenceError 等系统错误
      appError = { type: ErrorType.SYSTEM, message: error.message, originalError: error };
      this.showToast('系统发生未知异常');
      this.reportToMonitor(appError); // 这种错误必须上报
    } else {
      // 5. 兜底未知错误
      appError = { type: ErrorType.UNKNOWN, message: '发生未知错误', originalError: error };
      this.showToast('发生未知错误');
      this.reportToMonitor(appError);
    }

    return appError;
  }
}

// 导出一个单例供全局使用
export const errorHandler = new ErrorManager();
