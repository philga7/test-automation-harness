/**
 * Logging utility for the Self-Healing Test Automation Harness
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    const level = process.env['LOG_LEVEL']?.toLowerCase() || 'info';
    this.logLevel = this.parseLogLevel(level);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (args.length > 0) {
      return `${prefix} ${message} ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`;
    }
    
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, ...args: any[]): void {
    if (level <= this.logLevel) {
      console.log(this.formatMessage(levelName, message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, 'error', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, 'warn', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, 'info', message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, 'debug', message, ...args);
  }
}

export const logger = new Logger();
