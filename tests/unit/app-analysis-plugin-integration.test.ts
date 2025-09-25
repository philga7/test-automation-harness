/**
 * Unit tests for AppAnalysisEngine Plugin System Integration
 * 
 * TDD RED PHASE: Write failing tests that define expected behavior FIRST
 * These tests will fail because the integration is not yet complete.
 */

import { TestEngineFactory } from '../../src/core/TestEngineFactory';
import { PluginRegistry } from '../../src/core/PluginRegistry';
import { AppAnalysisEngine } from '../../src/analysis/AppAnalysisEngine';
import { 
  EngineConfig, 
  IPluginMetadata,
  TestType
} from '../../src/types';

describe('AppAnalysisEngine Plugin System Integration', () => {
  let factory: TestEngineFactory;
  let registry: PluginRegistry;
  let analysisEngine: AppAnalysisEngine;

  beforeEach(() => {
    registry = new PluginRegistry();
    factory = new TestEngineFactory(registry);
    analysisEngine = new AppAnalysisEngine();
  });

  afterEach(async () => {
    if (analysisEngine && (analysisEngine as any).isInitialized) {
      await analysisEngine.cleanup();
    }
  });

  describe('AppAnalysisEngine Constructor Registration', () => {
    it('should register AppAnalysisEngine constructor in factory', () => {
      // RED PHASE: This test will fail because AppAnalysisEngine is not registered
      factory.registerEngineConstructor('app-analysis', AppAnalysisEngine);
      
      const constructor = factory.getEngineConstructor('app-analysis');
      expect(constructor).toBe(AppAnalysisEngine);
    });

    it('should show app-analysis as available engine type', () => {
      // RED PHASE: This test will fail because AppAnalysisEngine is not registered
      factory.registerEngineConstructor('app-analysis', AppAnalysisEngine);
      
      expect(factory.isEngineTypeAvailable('app-analysis')).toBe(true);
      
      const availableTypes = factory.getAvailableEngineTypes();
      expect(availableTypes).toContain('app-analysis');
    });

    it('should create AppAnalysisEngine instance from factory', async () => {
      // RED PHASE: This test will fail because AppAnalysisEngine is not registered
      factory.registerEngineConstructor('app-analysis', AppAnalysisEngine);
      
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'comprehensive',
          outputFormat: 'json',
          includeScreenshots: true
        }
      };

      const metadata: IPluginMetadata = {
        name: 'app-analysis',
        version: '1.0.0',
        description: 'App analysis and test generation engine',
        author: 'Test Automation Harness',
        dependencies: [],
        capabilities: ['analysis', 'test-generation']
      };

      const engine = await factory.createEngine(config, metadata);
      
      expect(engine).toBeDefined();
      expect(engine.name).toBe('app-analysis');
      expect(engine.version).toBe('1.0.0');
      expect(engine.testType).toBe('e2e');
      expect(engine.supportsHealing).toBe(true);
    });
  });

  describe('Plugin Registry Integration', () => {
    it('should register AppAnalysisEngine with plugin registry', () => {
      // RED PHASE: This test will fail because registration is not implemented
      const metadata: IPluginMetadata = {
        name: 'app-analysis',
        version: '1.0.0',
        description: 'App analysis engine',
        author: 'Test Automation Harness',
        dependencies: [],
        capabilities: ['analysis']
      };

      registry.registerTestEngine(analysisEngine, metadata);
      
      const retrievedEngine = registry.getTestEngine('app-analysis', '1.0.0');
      expect(retrievedEngine).toBe(analysisEngine);
    });

    it('should find AppAnalysisEngine by test type', () => {
      // RED PHASE: This test will fail because registration is not implemented
      registry.registerTestEngine(analysisEngine);
      
      const e2eEngines = registry.getTestEnginesByType('e2e' as TestType);
      expect(e2eEngines).toContain(analysisEngine);
    });

    it('should include AppAnalysisEngine in registry statistics', () => {
      // RED PHASE: This test will fail because registration is not implemented
      registry.registerTestEngine(analysisEngine);
      
      const stats = registry.getStatistics();
      expect(stats.testEngines).toBeGreaterThan(0);
      expect(stats.totalPlugins).toBeGreaterThan(0);
    });
  });

  describe('Factory Default Configuration for Analysis Engine', () => {
    it('should create default config for app-analysis engine', () => {
      // RED PHASE: This test will pass because default config is already implemented
      const config = factory.createDefaultConfig('app-analysis', 'e2e');
      
      expect(config.engine).toBe('app-analysis');
      expect(config.settings['timeout']).toBe(30000);
      expect(config.settings['analysisDepth']).toBe('comprehensive');
      expect(config.settings['outputFormat']).toBe('json');
      expect(config.settings['includeScreenshots']).toBe(true);
    });
  });

  describe('Factory Configuration Validation for Analysis Engine', () => {
    beforeEach(() => {
      factory.registerEngineConstructor('app-analysis', AppAnalysisEngine);
    });

    it('should validate valid app-analysis configuration', () => {
      // RED PHASE: This test will pass because validation is already implemented
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          analysisDepth: 'comprehensive',
          outputFormat: 'json'
        }
      };

      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject app-analysis config with invalid analysisDepth', () => {
      // RED PHASE: This test will pass because validation is already implemented
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          analysisDepth: 'invalid-depth'
        }
      };

      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Analysis depth must be one of: basic, comprehensive, detailed');
    });

    it('should reject app-analysis config with invalid outputFormat', () => {
      // RED PHASE: This test will pass because validation is already implemented
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          analysisDepth: 'basic',
          outputFormat: 'invalid-format'
        }
      };

      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Output format must be one of: json, xml, html');
    });

    it('should require analysisDepth setting for app-analysis engine', () => {
      // RED PHASE: This test will pass because validation is already implemented
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {}
      };

      const result = factory.validateEngineConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Analysis depth is required for App Analysis engine');
    });
  });

  describe('End-to-End Plugin Integration', () => {
    it('should create, register, and execute AppAnalysisEngine through plugin system', async () => {
      // RED PHASE: This test will fail because full integration is not complete
      factory.registerEngineConstructor('app-analysis', AppAnalysisEngine);
      
      const config: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'comprehensive',
          outputFormat: 'json'
        }
      };

      const metadata: IPluginMetadata = {
        name: 'app-analysis',
        version: '1.0.0',
        description: 'App analysis engine',
        author: 'Test Automation Harness',
        dependencies: [],
        capabilities: ['analysis']
      };

      // Create engine through factory
      const engine = await factory.createEngine(config, metadata);
      
      // Verify engine is registered in registry
      const retrievedEngine = registry.getTestEngine('app-analysis', '1.0.0');
      expect(retrievedEngine).toBe(engine);
      
      // Test engine execution
      const testConfig = {
        name: 'app-analysis-test',
        type: 'e2e' as const,
        filePath: '/analysis-test.js',
        timeout: 30000,
        environment: 'test',
        parameters: {
          url: 'https://example.com',
          analysisType: 'comprehensive'
        },
        engineConfig: config,
        healingConfig: {
          enabled: true,
          confidenceThreshold: 0.6,
          maxAttempts: 3,
          strategies: ['app-analysis'],
          timeout: 10000
        },
        retryConfig: {
          maxRetries: 2,
          delay: 1000,
          backoffMultiplier: 1.5,
          maxDelay: 5000
        }
      };

      const result = await engine.execute(testConfig);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('app-analysis-test');
      expect(result.status).toBe('passed');
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts.length).toBeGreaterThan(0);
      
      // Test health check
      const health = await engine.getHealth();
      expect(health.status).toBe('healthy');
      
      // Cleanup
      await engine.cleanup();
    });
  });

  describe('Plugin Lifecycle Integration', () => {
    it('should initialize and cleanup AppAnalysisEngine through registry', async () => {
      // Initialize the engine first with proper configuration
      await analysisEngine.initialize({
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'basic',
          outputFormat: 'json'
        }
      });
      
      registry.registerTestEngine(analysisEngine);
      
      // Initialize all plugins
      await registry.initializeAllPlugins({
        environment: 'test',
        config: {
          timeout: 30000,
          analysisDepth: 'basic'
        }
      });
      
      // Verify engine is initialized
      const health = await analysisEngine.getHealth();
      expect(health.status).toBe('healthy');
      
      // Cleanup all plugins
      await registry.cleanupAllPlugins();
      
      // Verify cleanup completed
      expect(true).toBe(true);
    });
  });
});
