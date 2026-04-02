import { InternalAxiosRequestConfig } from "axios";
import { InternalExtendedRequestConfig } from "./type";

export class AbortControllerManager {
  private pendingRequests = new Map<string, AbortController>();

  // 生成请求的唯一标识
  private generateKey(config: InternalExtendedRequestConfig): string {
    if (config.requestKey) {
      return config.requestKey;
    }
    return `${config.method?.toUpperCase() || ''}:${config.url}`;
  }

  // 将请求加入到等待队列，并处理重复请求
  public add(config: InternalExtendedRequestConfig) {
    if (config.cancelRepeatRequest) {
      const key = this.generateKey(config);
      // 如果存在相同请求，先取消掉旧的
      this.remove(key, '取消重复请求'); 
      const controller = new AbortController();
      config.signal = controller.signal;
      this.pendingRequests.set(key, controller);
    }
  }

  // 根据标识移除并取消请求
  public remove(key: string, reason = '请求被手动取消') {
    if (this.pendingRequests.has(key)) {
      const controller = this.pendingRequests.get(key);
      controller?.abort(reason);
      this.pendingRequests.delete(key);
    }
  }

  // 请求完成后，从队列中正常移除（不触发abort）
  public removeByConfig(config: InternalExtendedRequestConfig) {
    if (config.cancelRepeatRequest) {
      const key = this.generateKey(config);
      this.pendingRequests.delete(key);
    }
  }

  // 取消所有挂起的请求
  public clearAll() {
    this.pendingRequests.clear();
  }
}