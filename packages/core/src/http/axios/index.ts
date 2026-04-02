import { httpRequest } from "./request";
import { RequestConfig } from "./type";

export function createHttpRequest(config: RequestConfig = {}) {
  const defaultConfig: RequestConfig = {
    baseURL: process?.env?.APP_BASE_API || '', 
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
    cancelRepeatRequest: true,
    ...config,
  };

  return new httpRequest(defaultConfig);
}

// 导出一个默认实例供大部分场景直接使用
export const http = createHttpRequest();