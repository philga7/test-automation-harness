/**
 * Tests for LoggingService
 * 
 * Tests the structured logging functionality including:
 * - Log level filtering
 * - File output and rotation
 * - JSON and text formatting
 * - Context and metadata handling
 * - Error logging with stack traces
 */

import fs from 'fs';
import path from 'path';
import { LoggingService } from '../../../src/observability/logging/LoggingService';
import { ObservabilityConfig } from '../../../src/config/schemas';

describe('LoggingService', () => {
  let loggingService: LoggingService;
  let tempLogFile: string;
  let tempLogDir: string;

  beforeEach(() => {
    // Create temporary directory for test logs
    tempLogDir = path.join(__dirname, '../../temp-logs');
    tempLogFile = path.join(tempLogDir, 'test.log');
    
    // Clean up any existing temp directory
    if (fs.existsSync(tempLogDir)) {
      fs.rmSync(tempLogDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempLogDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up logging service
    if (loggingService) {
      loggingService.destroy();
    }
    
    // Clean up temp directory
    if (fs.existsSync(tempLogDir)) {
      fs.rmSync(tempLogDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'info',
        format: 'text',
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      
      loggingService = new LoggingService(config);
      
      expect(loggingService).toBeDefined();
    });

    it('should initialize with file logging when file path provided', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'info',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '1MB',
        maxFiles: 3,
        includeStackTrace: true,
      };
      
      loggingService = new LoggingService(config);
      
      expect(loggingService).toBeDefined();
      expect(fs.existsSync(tempLogFile)).toBe(true);
    });

    it('should create log directory if it does not exist', () => {
      const nestedLogFile = path.join(tempLogDir, 'nested', 'test.log');
      const config: ObservabilityConfig['logging'] = {
        level: 'info',
        format: 'text',
        file: nestedLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      
      loggingService = new LoggingService(config);
      
      expect(fs.existsSync(path.dirname(nestedLogFile))).toBe(true);
    });
  });

  describe('Log Level Filtering', () => {
    beforeEach(() => {
      const config: ObservabilityConfig['logging'] = {
        level: 'warn',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
    });

    it('should filter out debug and info logs when level is warn', () => {
      const context = { component: 'test', operation: 'test' };
      
      loggingService.debug('Debug message', context);
      loggingService.info('Info message', context);
      loggingService.warn('Warning message', context);
      loggingService.error('Error message', context);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      
      expect(logContent).not.toContain('Debug message');
      expect(logContent).not.toContain('Info message');
      expect(logContent).toContain('Warning message');
      expect(logContent).toContain('Error message');
    });

    it('should log all levels when level is debug', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
      
      const context = { component: 'test', operation: 'test' };
      
      loggingService.debug('Debug message', context);
      loggingService.info('Info message', context);
      loggingService.warn('Warning message', context);
      loggingService.error('Error message', context);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      
      expect(logContent).toContain('Debug message');
      expect(logContent).toContain('Info message');
      expect(logContent).toContain('Warning message');
      expect(logContent).toContain('Error message');
    });
  });

  describe('Text Format Logging', () => {
    beforeEach(() => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
    });

    it('should format logs in text format', () => {
      const context = { component: 'test', operation: 'test' };
      const data = { userId: 123, action: 'login' };
      
      loggingService.info('Test message', context, data);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      
      expect(logContent).toContain('[INFO');
      expect(logContent).toContain('Test message');
      expect(logContent).toContain('[test]'); // component in brackets
      expect(logContent).toContain('(test)'); // operation in parentheses
    });

    it('should include timestamp in text format', () => {
      const context = { component: 'test' };
      const beforeTime = new Date();
      
      loggingService.info('Test message', context);
      
      const afterTime = new Date();
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      
      // Extract timestamp from log
      const timestampMatch = logContent.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      expect(timestampMatch).toBeTruthy();
      
      if (timestampMatch && timestampMatch[1]) {
        const logTime = new Date(timestampMatch[1]);
        expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      }
    });
  });

  describe('JSON Format Logging', () => {
    beforeEach(() => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'json',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
    });

    it('should format logs in JSON format', () => {
      const context = { component: 'test', operation: 'test' };
      const data = { userId: 123, action: 'login' };
      
      loggingService.info('Test message', context, data);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      const logLine = logContent.trim();
      
      expect(() => JSON.parse(logLine)).not.toThrow();
      
      const logEntry = JSON.parse(logLine);
      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.context).toEqual(context);
      expect(logEntry.data).toEqual(data);
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should include error details in JSON format', () => {
      const context = { component: 'test' };
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      
      loggingService.error('Error occurred', context, error);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      
      expect(logEntry.error).toBeDefined();
      expect(logEntry.error.name).toBe('Error');
      expect(logEntry.error.message).toBe('Test error');
      expect(logEntry.error.stack).toBeDefined();
    });
  });

  describe('Error Logging', () => {
    beforeEach(() => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'json',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
    });

    it('should log error with stack trace when includeStackTrace is true', () => {
      const context = { component: 'test' };
      const error = new Error('Test error');
      
      loggingService.error('Error occurred', context, error);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      
      expect(logEntry.error).toBeDefined();
      expect(logEntry.error.stack).toBeDefined();
    });

    it('should handle errors without stack trace', () => {
      const context = { component: 'test' };
      const error = new Error('Test error');
      delete error.stack;
      
      loggingService.error('Error occurred', context, error);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      
      expect(logEntry.error).toBeDefined();
      expect(logEntry.error.name).toBe('Error');
      expect(logEntry.error.message).toBe('Test error');
    });

    it('should handle non-Error objects in error parameter', () => {
      const context = { component: 'test' };
      const errorObj = { message: 'Custom error', code: 500 };
      
      loggingService.error('Error occurred', context, errorObj as any);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      
      expect(logEntry.error).toBeDefined();
      expect(logEntry.error.message).toBe('Custom error');
    });
  });

  describe('File Rotation', () => {
    beforeEach(() => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '1KB', // Small size for testing
        maxFiles: 3,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
    });

    it('should rotate log files when size limit is exceeded', () => {
      // Generate enough content to exceed 1KB
      const context = { component: 'test' };
      const longMessage = 'A'.repeat(200); // 200 character message
      
      // Write multiple log entries to exceed 1KB
      for (let i = 0; i < 10; i++) {
        loggingService.info(`${longMessage} ${i}`, context);
      }
      
      // Check if rotation occurred
      const files = fs.readdirSync(tempLogDir).filter(f => f.startsWith('test.log'));
      expect(files.length).toBeGreaterThan(1);
    });

    it('should maintain maximum number of log files', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '500B', // Very small size
        maxFiles: 2,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
      
      const context = { component: 'test' };
      const longMessage = 'A'.repeat(100);
      
      // Generate enough logs to create multiple files
      for (let i = 0; i < 20; i++) {
        loggingService.info(`${longMessage} ${i}`, context);
      }
      
      const files = fs.readdirSync(tempLogDir).filter(f => f.startsWith('test.log'));
      expect(files.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Log Statistics', () => {
    beforeEach(() => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'json',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
    });

    it('should provide log statistics', () => {
      const context = { component: 'test' };
      
      loggingService.debug('Debug message', context);
      loggingService.info('Info message', context);
      loggingService.warn('Warning message', context);
      loggingService.error('Error message', context);
      
      const stats = loggingService.getLogStats();
      
      expect(stats.totalEntries).toBe(4);
      expect(stats.entriesByLevel['debug']).toBe(1);
      expect(stats.entriesByLevel['info']).toBe(1);
      expect(stats.entriesByLevel['warn']).toBe(1);
      expect(stats.entriesByLevel['error']).toBe(1);
      expect(stats.fileSize).toBeGreaterThan(0);
    });

    it('should handle missing log file gracefully', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'json',
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
        // No file specified
      };
      loggingService = new LoggingService(config);
      
      const stats = loggingService.getLogStats();
      
      expect(stats.totalEntries).toBe(0);
      expect(stats.entriesByLevel['debug']).toBe(0);
      expect(stats.fileSize).toBeUndefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
      
      expect(() => loggingService.destroy()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined data parameter', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'json',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
      
      const context = { component: 'test' };
      
      expect(() => {
        loggingService.info('Test message', context, undefined);
      }).not.toThrow();
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      
      expect(logEntry.data).toBeUndefined();
    });

    it('should handle empty context', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'json',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
      
      expect(() => {
        loggingService.info('Test message', { component: 'test' });
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      const config: ObservabilityConfig['logging'] = {
        level: 'debug',
        format: 'text',
        file: tempLogFile,
        maxFileSize: '10MB',
        maxFiles: 5,
        includeStackTrace: true,
      };
      loggingService = new LoggingService(config);
      
      const longMessage = 'A'.repeat(10000);
      const context = { component: 'test' };
      
      expect(() => {
        loggingService.info(longMessage, context);
      }).not.toThrow();
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      expect(logContent).toContain(longMessage);
    });
  });
});