/**
 * Unit tests for configuration module
 */

import { config, initializeConfig } from '../../src/config';

describe('Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    // Initialize configuration for each test
    try {
      await initializeConfig('./config', 'development');
    } catch (error) {
      // If config files don't exist, that's okay for tests
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should have default values when no environment variables are set', async () => {
      // Clear environment variables
      delete process.env['API_PORT'];
      delete process.env['APP_ENVIRONMENT'];
      delete process.env['LOG_LEVEL'];
      
      // Re-initialize config
      await initializeConfig('./config', 'development');
      
      expect(config.port).toBe(3000);
      expect(config.nodeEnv).toBe('development');
      expect(config.logLevel).toBe('debug'); // Development config has debug level
    });

    it('should have default API configuration', () => {
      expect(config.api.timeout).toBe(30000);
      expect(config.api.retries).toBe(3);
    });

    it('should have default test engine configurations', () => {
      expect(config.testEngines.playwright.enabled).toBe(true);
      expect(config.testEngines.playwright.timeout).toBe(30000);
      expect(config.testEngines.jest.enabled).toBe(true);
      expect(config.testEngines.jest.timeout).toBe(10000);
      expect(config.testEngines.k6.enabled).toBe(true);
      expect(config.testEngines.k6.timeout).toBe(60000);
      expect(config.testEngines.zap.enabled).toBe(true);
      expect(config.testEngines.zap.timeout).toBe(120000);
    });

    it('should have default healing configuration', () => {
      expect(config.healing.enabled).toBe(true);
      expect(config.healing.confidenceThreshold).toBe(0.5); // Development config has 0.5
      expect(config.healing.maxRetries).toBe(5); // Development config has 5
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should override port from environment', async () => {
      process.env['API_PORT'] = '8080';
      await initializeConfig('./config', 'development');
      expect(config.port).toBe(8080);
    });

    it('should override node environment', async () => {
      process.env['APP_ENVIRONMENT'] = 'production';
      await initializeConfig('./config', 'production');
      expect(config.nodeEnv).toBe('production');
    });

    it('should override log level', async () => {
      process.env['LOG_LEVEL'] = 'warn';
      await initializeConfig('./config', 'development');
      expect(config.logLevel).toBe('warn');
    });

    it('should override API configuration', async () => {
      process.env['API_TIMEOUT'] = '60000';
      process.env['API_RETRIES'] = '5';
      await initializeConfig('./config', 'development');
      expect(config.api.timeout).toBe(60000);
      expect(config.api.retries).toBe(5);
    });

    it('should override test engine configurations', async () => {
      process.env['PLAYWRIGHT_ENABLED'] = 'false';
      process.env['PLAYWRIGHT_TIMEOUT'] = '45000';
      await initializeConfig('./config', 'development');
      expect(config.testEngines.playwright.enabled).toBe(false);
      expect(config.testEngines.playwright.timeout).toBe(45000);
    });

    it('should override healing configuration', async () => {
      process.env['HEALING_ENABLED'] = 'false';
      process.env['HEALING_CONFIDENCE_THRESHOLD'] = '0.8';
      process.env['HEALING_MAX_RETRIES'] = '5';
      await initializeConfig('./config', 'development');
      expect(config.healing.enabled).toBe(false);
      expect(config.healing.confidenceThreshold).toBe(0.8);
      expect(config.healing.maxRetries).toBe(5);
    });
  });

  describe('Configuration Type Safety', () => {
    it('should have correct TypeScript interface structure', () => {
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('nodeEnv');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('api');
      expect(config).toHaveProperty('testEngines');
      expect(config).toHaveProperty('healing');

      expect(typeof config.port).toBe('number');
      expect(typeof config.nodeEnv).toBe('string');
      expect(typeof config.logLevel).toBe('string');
      expect(typeof config.api).toBe('object');
      expect(typeof config.testEngines).toBe('object');
      expect(typeof config.healing).toBe('object');
    });

    it('should have correct API configuration structure', () => {
      expect(config.api).toHaveProperty('timeout');
      expect(config.api).toHaveProperty('retries');
      expect(typeof config.api.timeout).toBe('number');
      expect(typeof config.api.retries).toBe('number');
    });

    it('should have correct test engines configuration structure', () => {
      expect(config.testEngines).toHaveProperty('playwright');
      expect(config.testEngines).toHaveProperty('jest');
      expect(config.testEngines).toHaveProperty('k6');
      expect(config.testEngines).toHaveProperty('zap');

      Object.values(config.testEngines).forEach(engine => {
        expect(engine).toHaveProperty('enabled');
        expect(engine).toHaveProperty('timeout');
        expect(typeof engine.enabled).toBe('boolean');
        expect(typeof engine.timeout).toBe('number');
      });
    });

    it('should have correct healing configuration structure', () => {
      expect(config.healing).toHaveProperty('enabled');
      expect(config.healing).toHaveProperty('confidenceThreshold');
      expect(config.healing).toHaveProperty('maxRetries');
      expect(typeof config.healing.enabled).toBe('boolean');
      expect(typeof config.healing.confidenceThreshold).toBe('number');
      expect(typeof config.healing.maxRetries).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string environment variables', async () => {
      process.env['API_PORT'] = '';
      // Empty string gets converted to 0, which fails validation
      await expect(initializeConfig('./config', 'development')).rejects.toThrow();
    });

    it('should handle invalid number environment variables', async () => {
      process.env['API_PORT'] = 'invalid';
      // Invalid number should be treated as string, which fails validation
      await expect(initializeConfig('./config', 'development')).rejects.toThrow();
    });

    it('should handle invalid boolean environment variables', async () => {
      process.env['PLAYWRIGHT_ENABLED'] = 'maybe';
      // Invalid boolean should be treated as string, not boolean
      await initializeConfig('./config', 'development');
      expect(config.testEngines.playwright.enabled).toBe('maybe'); // String value, not boolean
    });
  });
});
