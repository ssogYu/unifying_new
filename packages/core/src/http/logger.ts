/**
 * Logger for HTTP client
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel
  timestamp: string
  message: string
  data?: any
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void
  info(message: string, data?: any): void
  warn(message: string, data?: any): void
  error(message: string, data?: any): void
}

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements ILogger {
  private minLevel: LogLevel

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel
  }

  private shouldLog(level: LogLevel): boolean {
    const levelMap = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    }
    return levelMap[level] >= levelMap[this.minLevel]
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level}]`

    if (data) {
      console.log(`${prefix} ${message}`, data)
    } else {
      console.log(`${prefix} ${message}`)
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data)
  }
}

/**
 * No-op logger implementation
 */
export class NoOpLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
