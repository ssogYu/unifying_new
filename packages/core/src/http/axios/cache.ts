import type { CacheEntry } from './types';

export class MemoryCache<T = unknown> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    if (entry) {
      this.touch(key);
    }
    return entry;
  }

  set(key: string, value: T, ttl: number, meta?: { etag?: string; lastModified?: string }): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl: Math.max(0, ttl),
      etag: meta?.etag,
      lastModified: meta?.lastModified,
      isFresh: function (): boolean {
        return Date.now() - this.timestamp < this.ttl;
      },
      isStale: function (): boolean {
        return Date.now() - this.timestamp >= this.ttl;
      },
    };
    this.store.set(key, entry);
    this.touch(key);
  }

  delete(key: string): void {
    this.store.delete(key);
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
  }

  clear(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  private touch(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    const oldest = this.accessOrder.shift();
    if (oldest) {
      this.store.delete(oldest);
    }
  }
}
