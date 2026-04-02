import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { AbortControllerManager } from './abortController';
import {
  BaseResponse,
  HttpErrorInterceptorHook,
  HttpRequestInterceptorHook,
  HttpResponseInterceptorHook,
  InternalExtendedRequestConfig,
  RequestConfig,
} from './type';
import { TokenManager } from './tokenManager';
import { ErrorManager } from './errorManager';

export class httpRequest {
  private instance: AxiosInstance;
  public cancelManager: AbortControllerManager;
  public tokenManager: TokenManager;
  public errorManager: ErrorManager;
  private errorInterceptors: HttpErrorInterceptorHook[] = [];
  constructor(private config: RequestConfig) {
    this.instance = axios.create(this.config);
    this.cancelManager = new AbortControllerManager();
    this.tokenManager = new TokenManager(this.config.tokenKey);
    this.errorManager = new ErrorManager();
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      async (config: InternalExtendedRequestConfig) => {
        if (config.cancelRepeatRequest) {
          this.cancelManager.add(config);
        }
        const token = this.tokenManager.getToken();
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );
    this.instance.interceptors.response.use(
      async (response: AxiosResponse<BaseResponse>) => {
        this.cancelManager.removeByConfig(response.config);
        const resData = response.data as BaseResponse<any>;
        if (resData.code !== 200) {
          // 1. 交给 errorHandler 处理业务错误
          const businessError = this.errorManager.handleBusinessError(
            resData.code,
            resData.message
          );
          // 2. 将错误包装抛出，中断当前的 Promise 链
          return Promise.reject(businessError);
        }
        return response.data as any;
      },
      async (error: AxiosError) => {
        if (error.config) {
          this.cancelManager.removeByConfig(error.config);
        }
        const processedError = this.errorManager.process(error);

        // 执行所有错误拦截器（透传）
        for (const interceptor of this.errorInterceptors) {
          await interceptor(processedError);
        }
        return Promise.reject(processedError);
      }
    );
  }

  private doRequest = async <T>(config: RequestConfig): Promise<BaseResponse<T>> => {
    try {
      const axiosResp: AxiosResponse<T> = await this.instance.request<T>(config);
      return axiosResp.data as BaseResponse<T>;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  public addRequestInterceptor(
    fulfilled: HttpRequestInterceptorHook,
    rejected?: HttpErrorInterceptorHook
  ) {
    this.instance.interceptors.request.use(fulfilled, rejected);
  }
  public addResponseInterceptor(
    fulfilled: HttpResponseInterceptorHook,
    rejected?: HttpErrorInterceptorHook
  ) {
    this.instance.interceptors.response.use(fulfilled, rejected);
  }

  public addErrorInterceptor(rejected: HttpErrorInterceptorHook) {
    this.errorInterceptors.push(rejected);
  }

  public request<T = unknown>(config: RequestConfig): Promise<BaseResponse<T>> {
    return this.doRequest<T>(config);
  }

  public get<T = unknown>(url: string, config?: RequestConfig): Promise<BaseResponse<T>> {
    return this.doRequest<T>({
      url,
      method: 'GET',
      ...config,
    });
  }

  public post<T = unknown>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>> {
    return this.doRequest<T>({
      url,
      method: 'POST',
      data,
      ...config,
    });
  }

  public put<T = unknown>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>> {
    return this.doRequest<T>({
      url,
      method: 'PUT',
      data,
      ...config,
    });
  }

  public delete<T = unknown>(url: string, config?: RequestConfig): Promise<BaseResponse<T>> {
    return this.doRequest<T>({
      url,
      method: 'DELETE',
      ...config,
    });
  }
}
