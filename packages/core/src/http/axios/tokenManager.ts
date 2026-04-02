export class TokenManager {
  private token: string | null = null;
  private localStorageKey: string;

  constructor(localStorageKey: string = 'APP_ACCESS_TOKEN') {
    this.localStorageKey = localStorageKey;
    try {
      this.token = localStorage.getItem(this.localStorageKey) ?? null;
    } catch {
      console.warn(`[TokenManager] localStorage unavailable (e.g., SSR, private mode), token only stored in memory`);
      this.token = null;
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string): void {
    this.token = token;
      try {
        localStorage.setItem(this.localStorageKey, token);
      } catch {
        // localStorage unavailable (e.g., SSR, private mode) — keep in memory only
      }
  }

  public removeToken(): void {
    this.token = null;
    try {
      localStorage.removeItem(this.localStorageKey);
    } catch {
      // ignore
    }
  }
}
