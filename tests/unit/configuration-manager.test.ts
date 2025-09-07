/**
 * Configuration Manager Tests
 * Tests for the YAML-based configuration management system
 */

import { ConfigurationManager, ConfigurationError } from '../../src/config/ConfigurationManager';
import { DEFAULT_CONFIG } from '../../src/config/schemas';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  const testConfigPath = './test-config';

  beforeEach(() => {
    configManager = new ConfigurationManager(testConfigPath, 'test');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      const manager = new ConfigurationManager('./config', 'development');
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });

    it('should use default parameters', () => {
      const manager = new ConfigurationManager();
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });
  });

  describe('loadConfig', () => {
    it('should load default configuration when no files exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = await configManager.loadConfig();

      expect(config).toBeDefined();
      expect(config.app.name).toBe(DEFAULT_CONFIG.app?.name);
      expect(config.app.version).toBe(DEFAULT_CONFIG.app?.version);
    });

    it('should load and merge YAML files', async () => {
      const defaultYaml = `
app:
  name: "test-app"
  version: "1.0.0"
api:
  port: 3000
`;

      const envYaml = `
app:
  debug: true
api:
  port: 4000
`;

      mockedFs.existsSync
        .mockReturnValueOnce(true)  // default.yaml exists
        .mockReturnValueOnce(true); // test.yaml exists

      mockedFs.readFileSync
        .mockReturnValueOnce(defaultYaml)
        .mockReturnValueOnce(envYaml);

      const config = await configManager.loadConfig();

      expect(config.app.name).toBe('test-app');
      expect(config.app.debug).toBe(true);
      expect(config.api.port).toBe(4000); // Environment config overrides default
    });

    it('should handle missing environment file gracefully', async () => {
      const defaultYaml = `
app:
  name: "test-app"
api:
  port: 3000
`;

      mockedFs.existsSync
        .mockReturnValueOnce(true)  // default.yaml exists
        .mockReturnValueOnce(false); // test.yaml doesn't exist

      mockedFs.readFileSync.mockReturnValueOnce(defaultYaml);

      const config = await configManager.loadConfig();

      expect(config.app.name).toBe('test-app');
      expect(config.api.port).toBe(3000);
    });

    it('should throw error for invalid YAML', async () => {
      const invalidYaml = 'invalid: yaml: content: [';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });

    it('should apply environment variable overrides', async () => {
      const originalEnv = process.env;
      
      try {
        process.env = {
          ...originalEnv,
          API_PORT: '8080',
          HEALING_CONFIDENCE_THRESHOLD: '0.9',
          PLAYWRIGHT_HEADLESS: 'false'
        };

        mockedFs.existsSync.mockReturnValue(false);

        const config = await configManager.loadConfig();

        expect(config.api.port).toBe(8080);
        expect(config.healing.confidenceThreshold).toBe(0.9);
        expect(config.engines.playwright.headless).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('getConfig', () => {
    it('should return loaded configuration', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      await configManager.loadConfig();

      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config.app.name).toBe(DEFAULT_CONFIG.app?.name);
    });

    it('should throw error if configuration not loaded', () => {
      expect(() => configManager.getConfig()).toThrow(ConfigurationError);
    });
  });

  describe('getSection', () => {
    it('should return specific configuration section', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      await configManager.loadConfig();

      const apiConfig = configManager.getSection('api') as any;
      const healingConfig = configManager.getSection('healing') as any;

      expect(apiConfig).toBeDefined();
      expect(apiConfig.port).toBeDefined();
      expect(healingConfig).toBeDefined();
      expect(healingConfig.enabled).toBeDefined();
    });
  });

  describe('setEnvironment', () => {
    it('should change environment', () => {
      configManager.setEnvironment('production');
      // This is tested indirectly through loadConfig behavior
    });
  });

  describe('reloadConfig', () => {
    it('should reload configuration', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      await configManager.loadConfig();

      const config1 = configManager.getConfig();
      const config2 = await configManager.reloadConfig();

      expect(config1).toEqual(config2);
    });
  });

  describe('validation', () => {
    it('should validate required fields', async () => {
      const invalidYaml = `
app:
  # Missing required fields
api:
  port: 3000
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });

    it('should validate numeric ranges', async () => {
      const invalidYaml = `
app:
  name: "test"
  version: "1.0.0"
  environment: "development"
  debug: false
api:
  port: 99999  # Invalid port range
healing:
  confidenceThreshold: 0.6
  maxRetries: 3
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });

    it('should validate enum values', async () => {
      const invalidYaml = `
app:
  name: "test"
  version: "1.0.0"
  environment: "invalid-env"  # Invalid environment
  debug: false
api:
  port: 3000
healing:
  confidenceThreshold: 0.6
  maxRetries: 3
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });
  });

  describe('exportToYaml', () => {
    it('should export configuration to YAML file', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      await configManager.loadConfig();

      const outputPath = './test-output.yaml';

      configManager.exportToYaml(outputPath);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(outputPath, expect.any(String), 'utf8');
    });

    it('should throw error if no configuration loaded', () => {
      expect(() => configManager.exportToYaml('./test.yaml')).toThrow(ConfigurationError);
    });
  });

  describe('getConfigSummary', () => {
    it('should return configuration summary', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      await configManager.loadConfig();

      const summary = configManager.getConfigSummary();

      expect(summary).toBeDefined();
      expect(summary.environment).toBe('test');
      expect(summary.app).toBeDefined();
      expect(summary.engines).toBeDefined();
      expect(summary.healing).toBeDefined();
    });

    it('should return error if no configuration loaded', () => {
      const summary = configManager.getConfigSummary();
      expect(summary.error).toBe('Configuration not loaded');
    });
  });
});
