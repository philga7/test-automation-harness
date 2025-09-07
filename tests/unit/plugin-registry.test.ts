/**
 * Unit tests for PluginRegistry
 */

import { PluginRegistry } from '../../src/core/PluginRegistry';
import { HelloWorldEngine } from '../../src/engines/HelloWorldEngine';
import { SimpleHealingStrategy } from '../../src/healing/SimpleHealingStrategy';
import { 
  ITestEngine, 
  IHealingStrategy, 
  IConfigurationProvider,
  IPluginMetadata
} from '../../src/types';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  let testEngine: ITestEngine;
  let healingStrategy: IHealingStrategy;
  let configProvider: IConfigurationProvider;

  beforeEach(() => {
    registry = new PluginRegistry();
    testEngine = new HelloWorldEngine(0); // No delay for tests
    healingStrategy = new SimpleHealingStrategy();
    
    // Mock configuration provider
    configProvider = {
      name: 'mock-config',
      version: '1.0.0',
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      validateConfig: jest.fn(),
      watchConfig: jest.fn(),
    };
  });

  afterEach(() => {
    // Note: PluginRegistry doesn't have a clear method, so we'll just create a new instance
  });

  describe('Test Engine Registration', () => {
    it('should register a test engine', () => {
      const metadata: IPluginMetadata = {
        name: 'hello-world',
        version: '1.0.0',
        description: 'Test engine',
        author: 'Test',
        dependencies: [],
        capabilities: ['unit'],
      };

      registry.registerTestEngine(testEngine, metadata);

      const retrieved = registry.getTestEngine('hello-world');
      expect(retrieved).toBe(testEngine);
    });

    it('should register a test engine without metadata', () => {
      registry.registerTestEngine(testEngine);

      const retrieved = registry.getTestEngine('hello-world');
      expect(retrieved).toBe(testEngine);
    });

    it('should not register duplicate test engines', () => {
      registry.registerTestEngine(testEngine);
      registry.registerTestEngine(testEngine); // Should not throw

      const engines = registry.getAllTestEngines();
      expect(engines).toHaveLength(1);
    });

    it('should get test engine by name and version', () => {
      registry.registerTestEngine(testEngine);

      const retrieved = registry.getTestEngine('hello-world', '1.0.0');
      expect(retrieved).toBe(testEngine);
    });

    it('should get latest version when no version specified', () => {
      registry.registerTestEngine(testEngine);

      const retrieved = registry.getTestEngine('hello-world');
      expect(retrieved).toBe(testEngine);
    });

    it('should return undefined for non-existent engine', () => {
      const retrieved = registry.getTestEngine('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all test engines', () => {
      registry.registerTestEngine(testEngine);

      const engines = registry.getAllTestEngines();
      expect(engines).toHaveLength(1);
      expect(engines[0]).toBe(testEngine);
    });

    it('should get test engines by type', () => {
      registry.registerTestEngine(testEngine);

      const engines = registry.getTestEnginesByType('unit');
      expect(engines).toHaveLength(1);
      expect(engines[0]).toBe(testEngine);
    });
  });

  describe('Healing Strategy Registration', () => {
    it('should register a healing strategy', () => {
      const metadata: IPluginMetadata = {
        name: 'simple-healing',
        version: '1.0.0',
        description: 'Healing strategy',
        author: 'Test',
        dependencies: [],
        capabilities: ['assertion_failed'],
      };

      registry.registerHealingStrategy(healingStrategy, metadata);

      const retrieved = registry.getHealingStrategy('simple-healing');
      expect(retrieved).toBe(healingStrategy);
    });

    it('should get healing strategies by failure type', () => {
      registry.registerHealingStrategy(healingStrategy);

      const strategies = registry.getHealingStrategiesByFailureType('assertion_failed');
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBe(healingStrategy);
    });

    it('should get all healing strategies', () => {
      registry.registerHealingStrategy(healingStrategy);

      const strategies = registry.getAllHealingStrategies();
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBe(healingStrategy);
    });
  });

  describe('Configuration Provider Registration', () => {
    it('should register a configuration provider', () => {
      const metadata: IPluginMetadata = {
        name: 'mock-config',
        version: '1.0.0',
        description: 'Config provider',
        author: 'Test',
        dependencies: [],
        capabilities: ['yaml'],
      };

      registry.registerConfigurationProvider(configProvider, metadata);

      const retrieved = registry.getConfigurationProvider('mock-config');
      expect(retrieved).toBe(configProvider);
    });

    it('should get all configuration providers', () => {
      registry.registerConfigurationProvider(configProvider);

      const providers = registry.getAllConfigurationProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0]).toBe(configProvider);
    });
  });

  describe('Plugin Metadata', () => {
    it('should store and retrieve plugin metadata', () => {
      const metadata: IPluginMetadata = {
        name: 'hello-world',
        version: '1.0.0',
        description: 'Test engine',
        author: 'Test',
        dependencies: [],
        capabilities: ['unit'],
      };

      registry.registerTestEngine(testEngine, metadata);

      const retrieved = registry.getPluginMetadata('hello-world', '1.0.0');
      expect(retrieved).toEqual(metadata);
    });

    it('should return undefined for non-existent metadata', () => {
      const retrieved = registry.getPluginMetadata('non-existent', '1.0.0');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Plugin Unregistration', () => {
    it('should unregister a test engine', () => {
      registry.registerTestEngine(testEngine);
      expect(registry.getTestEngine('hello-world')).toBe(testEngine);

      registry.unregisterPlugin('hello-world', '1.0.0', 'testEngine');
      expect(registry.getTestEngine('hello-world')).toBeUndefined();
    });

    it('should unregister a healing strategy', () => {
      registry.registerHealingStrategy(healingStrategy);
      expect(registry.getHealingStrategy('simple-healing')).toBe(healingStrategy);

      registry.unregisterPlugin('simple-healing', '1.0.0', 'healingStrategy');
      expect(registry.getHealingStrategy('simple-healing')).toBeUndefined();
    });

    it('should unregister a configuration provider', () => {
      registry.registerConfigurationProvider(configProvider);
      expect(registry.getConfigurationProvider('mock-config')).toBe(configProvider);

      registry.unregisterPlugin('mock-config', '1.0.0', 'configurationProvider');
      expect(registry.getConfigurationProvider('mock-config')).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should provide correct statistics', () => {
      registry.registerTestEngine(testEngine);
      registry.registerHealingStrategy(healingStrategy);
      registry.registerConfigurationProvider(configProvider);

      const stats = registry.getStatistics();
      expect(stats.totalPlugins).toBe(3);
      expect(stats.testEngines).toBe(1);
      expect(stats.healingStrategies).toBe(1);
      expect(stats.configurationProviders).toBe(1);
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should initialize plugins with lifecycle support', async () => {
      const mockContext = { test: 'context' };
      
      // Mock lifecycle methods
      (testEngine as any).initialize = jest.fn().mockResolvedValue(undefined);
      (testEngine as any).destroy = jest.fn().mockResolvedValue(undefined);

      registry.registerTestEngine(testEngine);
      
      await registry.initializeAllPlugins(mockContext);
      expect((testEngine as any).initialize).toHaveBeenCalledWith(mockContext);
    });

    it('should cleanup plugins with lifecycle support', async () => {
      // Mock lifecycle methods
      (testEngine as any).initialize = jest.fn().mockResolvedValue(undefined);
      (testEngine as any).destroy = jest.fn().mockResolvedValue(undefined);

      registry.registerTestEngine(testEngine);
      
      await registry.cleanupAllPlugins();
      expect((testEngine as any).destroy).toHaveBeenCalled();
    });
  });
});
