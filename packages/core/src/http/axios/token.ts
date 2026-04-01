import type { TokenProvider } from './types';

export class TokenManager implements TokenProvider {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpAt: number | null = null;

  private refreshingPromise: Promise<void> | null = null;
  private refreshQueue: ((tokens: { accessToken: string; refreshToken?: string } | undefined) => void)[] = [];

  constructor(
    private accessTokenKey: string = 'http_access_token',
    private refreshTokenKey: string = 'http_refresh_token',
    private tokenExpKey: string = 'http_token_exp_at'
  ) {
    this.loadFromStorage();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    this.saveToStorage();
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpAt = null;
    this.clearStorage();
  }

  isAccessTokenExpired(): boolean {
    if (!this.accessToken) return true;
    if (!this.tokenExpAt) return false;
    return Date.now() >= this.tokenExpAt - 5000;
  }

  setExpiration(expiresInSeconds: number): void {
    this.tokenExpAt = Date.now() + expiresInSeconds * 1000;
  }

  async withRefreshLock(refreshFn: () => Promise<{ accessToken: string; refreshToken?: string }>): Promise<{ accessToken: string; refreshToken?: string }> {
    if (this.refreshingPromise) {
      return new Promise<{ accessToken: string; refreshToken?: string }>((resolve, reject) => {
        this.refreshQueue.push((tokens) => {
          if (tokens) {
            resolve(tokens);
          } else {
            reject(new Error('Token refresh failed'));
          }
        });
      });
    }

    this.refreshingPromise = (async () => {
      try {
        const tokens = await refreshFn();
        this.setTokens(tokens.accessToken, tokens.refreshToken);
        this.refreshQueue.forEach((cb) => cb(tokens));
      } catch (err) {
        this.refreshQueue.forEach((cb) => cb(undefined));
        throw err;
      } finally {
        this.refreshQueue = [];
        this.refreshingPromise = null;
      }
    })();

    return this.refreshingPromise.then(() => ({
      accessToken: this.accessToken!,
      refreshToken: this.refreshToken ?? undefined,
    }));
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        this.accessToken = localStorage.getItem(this.accessTokenKey);
        this.refreshToken = localStorage.getItem(this.refreshTokenKey);
        const expStr = localStorage.getItem(this.tokenExpKey);
        if (expStr) {
          this.tokenExpAt = parseInt(expStr, 10);
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        if (this.accessToken) {
          localStorage.setItem(this.accessTokenKey, this.accessToken);
        } else {
          localStorage.removeItem(this.accessTokenKey);
        }
        if (this.refreshToken) {
          localStorage.setItem(this.refreshTokenKey, this.refreshToken);
        } else {
          localStorage.removeItem(this.refreshTokenKey);
        }
        if (this.tokenExpAt) {
          localStorage.setItem(this.tokenExpKey, String(this.tokenExpAt));
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private clearStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.accessTokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.tokenExpKey);
      }
    } catch {
      // ignore storage errors
    }
  }
}
