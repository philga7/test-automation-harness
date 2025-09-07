/**
 * Unit tests for TestEngineFactory
 */

import { TestEngineFactory } from '../../src/core/TestEngineFactory';
import { PluginRegistry } from '../../src/core/PluginRegistry';
import { HelloWorldEngine } from '../../src/engines/HelloWorldEngine';
import { 
  EngineConfig, 
  IPluginMetadata
} from '../../src/types';

describe('TestEngineFactory', () => {
  let factory: TestEngineFactory;
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
    factory = new TestEngineFactory(registry);
  });

  afterEach(() => {
    // Note: PluginRegistry doesn't have a clear method
  });

  describe('Engine Constructor Registration', () => {
    it('should register an engine constructor', () => {
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);
      
      const constructor = factory.getEngineConstructor('hello-world');
      expect(constructor).toBe(HelloWorldEngine);
    });

    it('should check if engine type is available', () => {
      expect(factory.isEngineTypeAvailable('hello-world')).toBe(false);
      
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);
      
      expect(factory.isEngineTypeAvailable('hello-world')).toBe(true);
    });

    it('should get available engine types', () => {
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);
      factory.registerEngineConstructor('mock-engine', HelloWorldEngine);
      
      const types = factory.getAvailableEngineTypes();
      expect(types).toContain('hello-world');
      expect(types).toContain('mock-engine');
    });
  });

  describe('Engine Creation', () => {
    beforeEach(() => {
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);
    });

    it('should create an engine from configuration', async () => {
      const config: EngineConfig = {
        engine: 'hello-world',
        version: '1.0.0',
        settings: {
          timeout: 30000,
        },
      };

      const metadata: IPluginMetadata = {
        name: 'hello-world',
        version: '1.0.0',
        description: 'Test engine',
        author: 'Test',
        dependencies: [],
        capabilities: ['unit'],
      };

      const engine = await factory.createEngine(config, metadata);
      
      expect(engine).toBeDefined();
      expect(engine.name).toBe('hello-world');
      expect(engine.version).toBe('1.0.0');
      expect(engine.testType).toBe('unit');
      expect(engine.supportsHealing).toBe(true);
    });

    it('should create an engine without metadata', async () => {
      const config: EngineConfig = {
        engine: 'hello-world',
        version: '1.0.0',
        settings: {},
      };

      const engine = await factory.createEngine(config);
      
      expect(engine).toBeDefined();
      expect(engine.name).toBe('hello-world');
    });

    it('should throw error for unknown engine type', async () => {
      const config: EngineConfig = {
        engine: 'unknown-engine',
        version: '1.0.0',
        settings: {},
      };

      await expect(factory.createEngine(config)).rejects.toThrow('Unknown engine type: unknown-engine');
    });

    it('should create multiple engines', async () => {
      const configs: EngineConfig[] = [
        {
          engine: 'hello-world',
          version: '1.0.0',
          settings: {},
        },
        {
          engine: 'hello-world',
          version: '1.0.0',
          settings: {},
        },
      ];

      const engines = await factory.createEngines(configs);
      
      expect(engines).toHaveLength(2);
      engines.forEach(engine => {
        expect(engine.name).toBe('hello-world');
      });
    });

    it('should continue creating engines even if one fails', async () => {
      const configs: EngineConfig[] = [
        {
          engine: 'hello-world',
          version: '1.0.0',
          settings: {},
        },
        {
          engine: 'unknown-engine',
          version: '1.0.0',
          settings: {},
        },
      ];

      const engines = await factory.createEngines(configs);
      
      expect(engines).toHaveLength(1);
      expect(engines[0]?.name).toBe('hello-world');
    });
  });

  describe('Engine Creation by Type', () => {
    beforeEach(() => {
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);
    });

    it('should create engine by type', async () => {
      const engine = await factory.createEngineByType(
        'hello-world',
        'unit',
        true,
        { settings: { custom: 'value' } }
      );
      
      expect(engine).toBeDefined();
      expect(engine.name).toBe('hello-world');
      expect(engine.testType).toBe('unit');
      expect(engine.supportsHealing).toBe(true);
    });
  });

  describe('Default Configuration', () => {
    it('should create default config for playwright', () => {
      const config = factory.createDefaultConfig('playwright', 'e2e');
      
      expect(config.engine).toBe('playwright');
      expect(config.settings['headless']).toBe(true);
      expect(config.settings['timeout']).toBe(30000);
      expect(config.browser).toBeDefined();
      expect(config.browser?.type).toBe('chromium');
    });

    it('should create default config for jest', () => {
      const config = factory.createDefaultConfig('jest', 'unit');
      
      expect(config.engine).toBe('jest');
      expect(config.settings['timeout']).toBe(10000);
      expect(config.settings['verbose']).toBe(true);
    });

    it('should create default config for k6', () => {
      const config = factory.createDefaultConfig('k6', 'performance');
      
      expect(config.engine).toBe('k6');
      expect(config.settings['vus']).toBe(1);
      expect(config.settings['duration']).toBe('30s');
    });

    it('should create default config for zap', () => {
      const config = factory.createDefaultConfig('zap', 'security');
      
      expect(config.engine).toBe('zap');
      expect(config.settings['timeout']).toBe(120000);
      expect(config.settings['context']).toBe('default');
    });

    it('should create default config for unknown engine', () => {
      const config = factory.createDefaultConfig('unknown', 'unit');
      
      expect(config.engine).toBe('unknown');
      expect(config.settings).toEqual({});
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const config: EngineConfig = {
        engine: 'hello-world',
        version: '1.0.0',
        settings: {},
      };

      factory.registerEngineConstructor('hello-world', HelloWorldEngine);
      
      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration with missing engine', () => {
      const config: EngineConfig = {
        engine: '',
        version: '1.0.0',
        settings: {},
      };

      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Engine type is required');
    });

    it('should validate configuration with unknown engine', () => {
      const config: EngineConfig = {
        engine: 'unknown-engine',
        version: '1.0.0',
        settings: {},
      };

      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown engine type: unknown-engine');
    });

    it('should validate playwright configuration', () => {
      const config: EngineConfig = {
        engine: 'playwright',
        version: '1.0.0',
        settings: {},
        browser: {
          type: 'chromium',
          headless: true,
          viewport: { width: 1280, height: 720 },
        },
      };

      factory.registerEngineConstructor('playwright', HelloWorldEngine);
      
      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should validate playwright configuration with missing browser', () => {
      const config: EngineConfig = {
        engine: 'playwright',
        version: '1.0.0',
        settings: {},
      };

      factory.registerEngineConstructor('playwright', HelloWorldEngine);
      
      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Browser configuration is required for Playwright engine');
    });

    it('should validate jest configuration with low timeout', () => {
      const config: EngineConfig = {
        engine: 'jest',
        version: '1.0.0',
        settings: {
          timeout: 500,
        },
      };

      factory.registerEngineConstructor('jest', HelloWorldEngine);
      
      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Jest timeout should be at least 1000ms');
    });

    it('should validate k6 configuration with low VUs', () => {
      const config: EngineConfig = {
        engine: 'k6',
        version: '1.0.0',
        settings: {
          vus: 0,
        },
      };

      factory.registerEngineConstructor('k6', HelloWorldEngine);
      
      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('K6 virtual users should be at least 1');
    });

    it('should validate zap configuration with low timeout', () => {
      const config: EngineConfig = {
        engine: 'zap',
        version: '1.0.0',
        settings: {
          timeout: 10000,
        },
      };

      factory.registerEngineConstructor('zap', HelloWorldEngine);
      
      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ZAP timeout should be at least 30000ms');
    });
  });
});
