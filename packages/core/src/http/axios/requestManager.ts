import type { InternalAxiosRequestConfig } from 'axios';

interface PendingRequest {
  config: InternalAxiosRequestConfig;
  abortController: AbortController;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export class RequestManager {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter = 0;
  private maxConcurrent = 50;

  generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  getDeduplicationKey(config: InternalAxiosRequestConfig): string {
    const method = (config.method?.toUpperCase() ?? 'GET') as string;
    const url = config.url ?? '';
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.data ? JSON.stringify(config.data) : '';
    return `${method}:${url}:${params}:${data}`;
  }

  addRequest(requestId: string, config: InternalAxiosRequestConfig, resolve: (value: unknown) => void, reject: (reason: unknown) => void): AbortController {
    const controller = new AbortController();
    const entry: PendingRequest = {
      config,
      abortController: controller,
      resolve,
      reject,
    };
    this.pendingRequests.set(requestId, entry);
    this.enforceConcurrencyLimit();
    return controller;
  }

  removeRequest(requestId: string): void {
    this.pendingRequests.delete(requestId);
  }

  getRequest(requestId: string): PendingRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  abortRequest(requestId: string): void {
    const entry = this.pendingRequests.get(requestId);
    if (entry) {
      entry.abortController.abort();
      this.pendingRequests.delete(requestId);
    }
  }

  abortByKey(key: string): void {
    const toRemove: string[] = [];
    for (const [id, entry] of this.pendingRequests) {
      const entryKey = this.getDeduplicationKey(entry.config);
      if (entryKey === key) {
        entry.abortController.abort();
        toRemove.push(id);
      }
    }
    toRemove.forEach((id) => this.pendingRequests.delete(id));
  }

  abortAll(): void {
    for (const entry of this.pendingRequests.values()) {
      entry.abortController.abort();
    }
    this.pendingRequests.clear();
  }

  hasPending(): boolean {
    return this.pendingRequests.size > 0;
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  private enforceConcurrencyLimit(): void {
    while (this.pendingRequests.size > this.maxConcurrent) {
      const oldest = this.pendingRequests.keys().next().value;
      if (oldest) {
        this.abortRequest(oldest);
      } else {
        break;
      }
    }
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    this.enforceConcurrencyLimit();
  }
}
