/**
 * Unit tests for logger utility
 */

import { logger } from '../../src/utils/logger';

describe('Logger', () => {
  describe('Logger Initialization', () => {
    it('should be properly initialized', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Logger Methods', () => {
    it('should have all required logging methods', () => {
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should call logging methods without throwing errors', () => {
      expect(() => {
        logger.info('Test info message');
        logger.error('Test error message');
        logger.warn('Test warn message');
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should handle additional arguments', () => {
      expect(() => {
        logger.info('Test message', { key: 'value' }, 'extra');
        logger.error('Test error', new Error('test error'));
      }).not.toThrow();
    });
  });

  describe('Logger Configuration', () => {
    it('should handle invalid log levels gracefully', () => {
      const originalEnv = process.env['LOG_LEVEL'];
      process.env['LOG_LEVEL'] = 'invalid';
      
      // Re-import to get fresh logger with new env
      jest.resetModules();
      const { logger: freshLogger } = require('../../src/utils/logger');
      expect(freshLogger).toBeDefined();
      
      process.env['LOG_LEVEL'] = originalEnv;
    });
  });
});
