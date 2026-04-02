import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
export enum ErrorType {
  HTTP = 'HTTP_ERROR',
  BUSINESS = 'BUSINESS_ERROR',
  SYSTEM = 'SYSTEM_ERROR',
  CANCEL = 'CANCEL_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  code?: number | string;
  message: string;
  originalError?: any;
}

// 后端统一返回格式
export interface BaseResponse<T = any> {
  code: number;
  message: string;
  data: T;
}
export type HttpRequestInterceptorHook<T = unknown> = (config: InternalAxiosRequestConfig<T>) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
export type HttpResponseInterceptorHook<T = unknown> = (response: AxiosResponse<BaseResponse<T>>) => AxiosResponse<BaseResponse<T>> | Promise<AxiosResponse<BaseResponse<T>>>;
export type HttpErrorInterceptorHook = (error: AppError) => unknown | Promise<unknown>;



export interface RequestConfig extends AxiosRequestConfig {
  // 是否开启重复请求取消，默认为 true
  cancelRepeatRequest?: boolean;
  // 请求重试次数
  retry?: number;
  // 重试延迟
  retryDelay?: number;
  // 自定义请求标记，用于手动取消
  requestKey?: string;
  // 自定义token键名，默认为 APP_ACCESS_TOKEN
  tokenKey?: string;
}

export interface InternalExtendedRequestConfig extends InternalAxiosRequestConfig {
  cancelRepeatRequest?: boolean;
  requestKey?: string;
}

