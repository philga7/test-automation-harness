/**
 * Integration tests for AppAnalysisEngine with PluginRegistry and TestEngineFactory
 * 
 * This test verifies that the AppAnalysisEngine integrates properly with the 
 * plugin architecture and can be created through the factory.
 */

import { AppAnalysisEngine } from '../../src/analysis/AppAnalysisEngine';
import { PluginRegistry } from '../../src/core/PluginRegistry';
import { TestEngineFactory } from '../../src/core/TestEngineFactory';
import { EngineConfig, IPluginMetadata } from '../../src/types';

// Use unique variable names to prevent global declaration conflicts
const appAnalysisIntegrationMockFetch = jest.fn();

describe('AppAnalysisEngine Integration', () => {
  let registry: PluginRegistry;
  let factory: TestEngineFactory;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock global fetch
    (global as any).fetch = appAnalysisIntegrationMockFetch;
    
    // Create fresh instances
    registry = new PluginRegistry();
    factory = new TestEngineFactory(registry);
    
    // Register the AppAnalysisEngine constructor
    factory.registerEngineConstructor('app-analysis', AppAnalysisEngine);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Factory Integration', () => {
    it('should create AppAnalysisEngine through factory', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'comprehensive',
          outputFormat: 'json',
          includeScreenshots: true,
        },
      };

      const metadata: IPluginMetadata = {
        name: 'app-analysis',
        version: '1.0.0',
        description: 'App Analysis Engine for automated app analysis',
        author: 'Test Automation Harness',
        dependencies: [],
        capabilities: ['app-analysis', 'test-generation'],
      };

      // Create engine through factory
      const engine = await factory.createEngine(config, metadata);

      expect(engine).toBeDefined();
      expect(engine.name).toBe('app-analysis');
      expect(engine.version).toBe('1.0.0');
      expect(engine.testType).toBe('e2e');
      expect(engine.supportsHealing).toBe(true);
    });

    it('should register engine with plugin registry', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'basic',
          outputFormat: 'json',
        },
      };

      // Create and register engine
      await factory.createEngine(config);

      // Verify engine is registered
      const registeredEngine = registry.getTestEngine('app-analysis', '1.0.0');
      expect(registeredEngine).toBeDefined();
      expect(registeredEngine?.name).toBe('app-analysis');
    });

    it('should validate engine configuration', () => {
      const validConfig: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'comprehensive',
          outputFormat: 'json',
        },
      };

      const result = factory.validateEngineConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid configuration', () => {
      const invalidConfig: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          // Missing required analysisDepth
          outputFormat: 'invalid-format',
        },
      };

      const result = factory.validateEngineConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Analysis depth is required for App Analysis engine');
      expect(result.errors).toContain('Output format must be one of: json, xml, html');
    });

    it('should create default configuration', () => {
      const defaultConfig = factory.createDefaultConfig('app-analysis', 'e2e');
      
      expect(defaultConfig.engine).toBe('app-analysis');
      expect(defaultConfig.settings['timeout']).toBe(30000);
      expect(defaultConfig.settings['analysisDepth']).toBe('comprehensive');
      expect(defaultConfig.settings['outputFormat']).toBe('json');
      expect(defaultConfig.settings['includeScreenshots']).toBe(true);
    });

    it('should list app-analysis as available engine type', () => {
      const availableTypes = factory.getAvailableEngineTypes();
      expect(availableTypes).toContain('app-analysis');
      
      expect(factory.isEngineTypeAvailable('app-analysis')).toBe(true);
    });
  });

  describe('Registry Integration', () => {
    it('should retrieve engines by type', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'basic',
          outputFormat: 'json',
        },
      };

      await factory.createEngine(config);

      // Get engines by test type
      const e2eEngines = registry.getTestEnginesByType('e2e');
      expect(e2eEngines.length).toBeGreaterThan(0);
      expect(e2eEngines.some(engine => engine.name === 'app-analysis')).toBe(true);
    });

    it('should provide registry statistics', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'comprehensive',
          outputFormat: 'json',
        },
      };

      await factory.createEngine(config);

      const stats = registry.getStatistics();
      expect(stats.testEngines).toBeGreaterThanOrEqual(1);
      expect(stats.totalPlugins).toBeGreaterThanOrEqual(1);
    });

    it('should handle plugin metadata', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'basic',
          outputFormat: 'json',
        },
      };

      const metadata: IPluginMetadata = {
        name: 'app-analysis',
        version: '1.0.0',
        description: 'Advanced app analysis engine',
        author: 'Test Suite',
        dependencies: [],
        capabilities: ['analysis', 'healing'],
      };

      await factory.createEngine(config, metadata);

      const retrievedMetadata = registry.getPluginMetadata('app-analysis', '1.0.0');
      expect(retrievedMetadata).toBeDefined();
      expect(retrievedMetadata?.description).toBe('Advanced app analysis engine');
      expect(retrievedMetadata?.capabilities).toContain('analysis');
    });
  });

  describe('End-to-End Integration', () => {
    it('should create, register, and execute engine through factory', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'basic',
          outputFormat: 'json',
          includeScreenshots: false,
        },
      };

      // Create engine through factory
      const engine = await factory.createEngine(config);

      // Execute a test
      const testConfig = {
        name: 'integration-test',
        type: 'e2e' as any,
        filePath: '/test-app',
        timeout: 5000,
        environment: 'test',
        parameters: {
          url: 'http://localhost:3000',
          analysisType: 'basic'
        },
        engineConfig: config,
        healingConfig: {
          enabled: true,
          confidenceThreshold: 0.6,
          maxAttempts: 3,
          strategies: [],
          timeout: 10000,
        },
        retryConfig: {
          maxRetries: 1,
          delay: 1000,
          backoffMultiplier: 1.0,
          maxDelay: 5000,
        },
      };

      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.name).toBe('integration-test');
      expect(result.status).toBe('passed');
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts.length).toBeGreaterThan(0);
    });

    it('should handle engine cleanup through factory', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'basic',
          outputFormat: 'json',
        },
      };

      const engine = await factory.createEngine(config);

      // Test cleanup
      await expect(engine.cleanup()).resolves.not.toThrow();

      // Verify health after cleanup
      const health = await engine.getHealth();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown engine type', async () => {
      const config: EngineConfig = {
        engine: 'unknown-engine',
        version: '1.0.0',
        settings: {},
      };

      await expect(factory.createEngine(config)).rejects.toThrow('Unknown engine type: unknown-engine');
    });

    it('should handle invalid configuration during creation', async () => {
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          // Missing required analysisDepth
          timeout: 30000,
        },
      };

      await expect(factory.createEngine(config)).rejects.toThrow('Missing required setting: analysisDepth');
    });
  });
});
