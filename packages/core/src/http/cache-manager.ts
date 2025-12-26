import type { CacheConfig } from './types'

export class CacheManager {
  private cache: Map<string, CacheConfig> = new Map()
  private defaultCacheTime = 5 * 60 * 1000

  get(key: string): any {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    const now = Date.now()
    if (now > item.expireTime) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  set(key: string, data: any, cacheTime?: number): void {
    const expireTime = Date.now() + (cacheTime || this.defaultCacheTime)
    
    const item: CacheConfig = {
      key,
      data,
      expireTime,
      timestamp: Date.now()
    }
    
    this.cache.set(key, item)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }
    
    const now = Date.now()
    if (now > item.expireTime) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  cleanExpired(): void {
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireTime) {
        this.cache.delete(key)
      }
    }
  }

  generateKey(config: any): string {
    const { url, method, params, data } = config
    
    const paramsStr = params ? JSON.stringify(params) : ''
    const dataStr = data ? JSON.stringify(data) : ''
    
    return `${method}:${url}:${paramsStr}:${dataStr}`
  }

  size(): number {
    return this.cache.size
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  getAll(): Map<string, CacheConfig> {
    this.cleanExpired()
    return new Map(this.cache)
  }
}
