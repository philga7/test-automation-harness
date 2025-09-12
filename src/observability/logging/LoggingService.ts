/**
 * Enhanced logging service for the Self-Healing Test Automation Harness
 * 
 * This service provides structured logging with multiple outputs, including:
 * - Console output with colorized formatting
 * - File output with rotation
 * - JSON structured logging
 * - Context-aware logging with request tracing
 */

import fs from 'fs';
import path from 'path';
import { LogEntry, ObservabilityConfig } from '../types';

export interface LogContext {
  component: string;
  operation?: string;
  requestId?: string;
  userId?: string;
  testId?: string;
  engineId?: string;
}

export class LoggingService {
  private config: ObservabilityConfig['logging'];
  private logFileStream?: fs.WriteStream;
  private logDir?: string;

  constructor(config: ObservabilityConfig['logging']) {
    this.config = {
      ...config,
      level: config.level || 'info',
      format: config.format || 'text',
      maxFileSize: config.maxFileSize || '10MB',
      maxFiles: config.maxFiles || 5,
      includeStackTrace: config.includeStackTrace !== undefined ? config.includeStackTrace : true,
    };

    if (this.config.file) {
      this.logDir = path.dirname(this.config.file);
      this.initializeFileLogging();
    }
  }

  /**
   * Initialize file logging with rotation support
   */
  private initializeFileLogging(): void {
    try {
      // Ensure log directory exists
      if (this.logDir && !fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // Ensure the log file exists by creating it if it doesn't
      if (this.config.file && !fs.existsSync(this.config.file)) {
        fs.writeFileSync(this.config.file, '');
      }

      // Note: We now use synchronous file operations for reliability
      // No need for write streams in tests
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * Check if log rotation is needed and rotate if necessary
   */
  private checkLogRotation(): void {
    if (!this.config.file || !fs.existsSync(this.config.file)) {
      return;
    }

    const stats = fs.statSync(this.config.file);
    const maxSize = this.parseFileSize(this.config.maxFileSize);

    if (stats.size > maxSize) {
      this.rotateLog();
    }
  }

  /**
   * Parse file size string to bytes
   */
  private parseFileSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^(\d+)([A-Z]+)$/);
    if (!match) {
      return 10 * 1024 * 1024; // Default 10MB
    }

    const [, size, unit] = match;
    return parseInt(size!, 10) * (units[unit as keyof typeof units] || 1);
  }

  /**
   * Rotate log files
   */
  private rotateLog(): void {
    if (!this.config.file) return;

    try {
      // Close current stream
      if (this.logFileStream) {
        this.logFileStream.end();
      }

      // Rotate existing files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.config.file}.${i}`;
        const newFile = `${this.config.file}.${i + 1}`;

        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .1
      if (fs.existsSync(this.config.file)) {
        fs.renameSync(this.config.file, `${this.config.file}.1`);
      }

      // Create new log file
      this.initializeFileLogging();
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }

  /**
   * Get log level priority for filtering
   */
  private getLogLevelPriority(level: string): number {
    const priorities = { debug: 0, info: 1, warn: 2, error: 3 };
    return priorities[level as keyof typeof priorities] ?? 1;
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: string): boolean {
    return this.getLogLevelPriority(level) >= this.getLogLevelPriority(this.config.level);
  }

  /**
   * Format log entry for console output
   */
  private formatConsoleLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const component = entry.context.component;
    
    // Add colors for different log levels
    const colors = {
      debug: '\x1b[36m',  // Cyan
      info: '\x1b[32m',   // Green
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
      reset: '\x1b[0m',   // Reset
    };

    const color = colors[entry.level as keyof typeof colors] || '';
    const reset = colors.reset;

    let logLine = `${color}[${timestamp}] [${level}] [${component}]${reset} ${entry.message}`;

    // Add operation if present
    if (entry.context.operation) {
      logLine += ` (${entry.context.operation})`;
    }

    // Add request ID if present
    if (entry.context.requestId) {
      logLine += ` [req:${entry.context.requestId}]`;
    }

    // Add data if present and not in JSON format
    if (entry.data && this.config.format !== 'json') {
      logLine += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    // Add error details if present
    if (entry.error) {
      logLine += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (this.config.includeStackTrace && entry.error.stack) {
        logLine += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return logLine;
  }

  /**
   * Format log entry for file output
   */
  private formatFileLog(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(entry) + '\n';
    }

    return this.formatConsoleLog(entry) + '\n';
  }

  /**
   * Write log entry to all configured outputs
   */
  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Console output
    console.log(this.formatConsoleLog(entry));

    // File output - always use synchronous writes for reliability
    if (this.config.file) {
      try {
        // Ensure directory exists
        const dir = path.dirname(this.config.file);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Check for log rotation before writing
        this.checkLogRotation();
        
        // Always use synchronous file operations for reliability
        fs.appendFileSync(this.config.file, this.formatFileLog(entry));
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogContext>): LoggingService {
    const childLogger = new LoggingService(this.config);
    
    // Override writeLog to include additional context
    const originalWriteLog = childLogger.writeLog.bind(childLogger);
    childLogger.writeLog = (entry: LogEntry) => {
      const enhancedEntry: LogEntry = {
        ...entry,
        context: {
          ...entry.context,
          ...additionalContext,
        },
      };
      originalWriteLog(enhancedEntry);
    };

    return childLogger;
  }

  /**
   * Log debug message
   */
  debug(message: string, context: LogContext, data?: Record<string, any>): void {
    this.writeLog({
      level: 'debug',
      message,
      timestamp: new Date(),
      context,
      ...(data && { data }),
    });
  }

  /**
   * Log info message
   */
  info(message: string, context: LogContext, data?: Record<string, any>): void {
    this.writeLog({
      level: 'info',
      message,
      timestamp: new Date(),
      context,
      ...(data && { data }),
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, context: LogContext, data?: Record<string, any>): void {
    this.writeLog({
      level: 'warn',
      message,
      timestamp: new Date(),
      context,
      ...(data && { data }),
    });
  }

  /**
   * Log error message
   */
  error(message: string, context: LogContext, error?: Error, data?: Record<string, any>): void {
    this.writeLog({
      level: 'error',
      message,
      timestamp: new Date(),
      context,
      ...(data && { data }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          ...(error.stack && { stack: error.stack }),
        }
      }),
    });
  }

  /**
   * Get recent log entries (last N entries)
   */
  async getRecentLogs(count: number = 100): Promise<LogEntry[]> {
    if (!this.config.file || !fs.existsSync(this.config.file)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.config.file, 'utf8');
      const lines = content.trim().split('\n').slice(-count);

      if (this.config.format === 'json') {
        return lines
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      }

      // For text format, we'd need to parse the format back to LogEntry
      // This is complex, so for now return empty array for text format
      return [];
    } catch (error) {
      console.error('Failed to read recent logs:', error);
      return [];
    }
  }

  /**
   * Get log statistics
   */
  getLogStats(): { 
    totalEntries: number; 
    entriesByLevel: Record<string, number>;
    fileSize?: number;
  } {
    const stats: {
      totalEntries: number;
      entriesByLevel: Record<string, number>;
      fileSize?: number;
    } = {
      totalEntries: 0,
      entriesByLevel: { debug: 0, info: 0, warn: 0, error: 0 },
    };

    if (this.config.file && fs.existsSync(this.config.file)) {
      try {
        const fileStats = fs.statSync(this.config.file);
        stats.fileSize = fileStats.size;
        
        // Read and parse log file to count entries
        const logContent = fs.readFileSync(this.config.file, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          // Count JSON format logs
          if (this.config.format === 'json') {
            try {
              const entry = JSON.parse(line);
              if (entry.level) {
                stats.entriesByLevel[entry.level] = (stats.entriesByLevel[entry.level] || 0) + 1;
                stats.totalEntries++;
              }
            } catch {
              // Ignore invalid JSON lines
            }
          } else {
            // Count text format logs
            const levelMatch = line.match(/\[(DEBUG|INFO|WARN|ERROR)\]/);
            if (levelMatch && levelMatch[1]) {
              const level = levelMatch[1].toLowerCase();
              stats.entriesByLevel[level] = (stats.entriesByLevel[level] || 0) + 1;
              stats.totalEntries++;
            }
          }
        }
      } catch {
        // Ignore file read errors
      }
    }

    return stats;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.logFileStream) {
      this.logFileStream.end();
      this.logFileStream = undefined!;
    }
  }
}
