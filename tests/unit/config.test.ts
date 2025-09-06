/**
 * Unit tests for configuration module
 */

import { config } from '../../src/config';

describe('Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should have default values when no environment variables are set', () => {
      // Clear environment variables
      delete process.env['PORT'];
      delete process.env['NODE_ENV'];
      delete process.env['LOG_LEVEL'];
      
      // Re-import to get fresh config
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      
      expect(freshConfig.port).toBe(3000);
      expect(freshConfig.nodeEnv).toBe('development');
      expect(freshConfig.logLevel).toBe('info');
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
      expect(config.healing.confidenceThreshold).toBe(0.6);
      expect(config.healing.maxRetries).toBe(3);
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should override port from environment', () => {
      process.env['PORT'] = '8080';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.port).toBe(8080);
    });

    it('should override node environment', () => {
      process.env['NODE_ENV'] = 'production';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.nodeEnv).toBe('production');
    });

    it('should override log level', () => {
      process.env['LOG_LEVEL'] = 'debug';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.logLevel).toBe('debug');
    });

    it('should override API configuration', () => {
      process.env['API_TIMEOUT'] = '60000';
      process.env['API_RETRIES'] = '5';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.api.timeout).toBe(60000);
      expect(freshConfig.api.retries).toBe(5);
    });

    it('should override test engine configurations', () => {
      process.env['PLAYWRIGHT_ENABLED'] = 'false';
      process.env['PLAYWRIGHT_TIMEOUT'] = '45000';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.testEngines.playwright.enabled).toBe(false);
      expect(freshConfig.testEngines.playwright.timeout).toBe(45000);
    });

    it('should override healing configuration', () => {
      process.env['HEALING_ENABLED'] = 'false';
      process.env['HEALING_CONFIDENCE_THRESHOLD'] = '0.8';
      process.env['HEALING_MAX_RETRIES'] = '5';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.healing.enabled).toBe(false);
      expect(freshConfig.healing.confidenceThreshold).toBe(0.8);
      expect(freshConfig.healing.maxRetries).toBe(5);
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
    it('should handle empty string environment variables', () => {
      process.env['PORT'] = '';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.port).toBe(3000); // Should fall back to default
    });

    it('should handle invalid number environment variables', () => {
      process.env['PORT'] = 'invalid';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.port).toBeNaN(); // parseInt('invalid') returns NaN
    });

    it('should handle invalid boolean environment variables', () => {
      process.env['PLAYWRIGHT_ENABLED'] = 'maybe';
      jest.resetModules();
      const { config: freshConfig } = require('../../src/config');
      expect(freshConfig.testEngines.playwright.enabled).toBe(true); // Should fall back to default
    });
  });
});
