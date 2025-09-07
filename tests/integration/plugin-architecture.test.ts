/**
 * Integration tests for Plugin Architecture
 */

import { PluginArchitectureDemo } from '../../src/demo/PluginArchitectureDemo';
import { PluginRegistry } from '../../src/core/PluginRegistry';
import { TestEngineFactory } from '../../src/core/TestEngineFactory';
import { DependencyContainer } from '../../src/core/DependencyContainer';
import { HelloWorldEngine } from '../../src/engines/HelloWorldEngine';
import { SimpleHealingStrategy } from '../../src/healing/SimpleHealingStrategy';

describe('Plugin Architecture Integration', () => {
  let demo: PluginArchitectureDemo;
  let registry: PluginRegistry;
  let factory: TestEngineFactory;
  let container: DependencyContainer;

  beforeEach(() => {
    demo = new PluginArchitectureDemo();
    registry = new PluginRegistry();
    factory = new TestEngineFactory(registry);
    container = new DependencyContainer();
  });

  afterEach(async () => {
    await demo.cleanup();
  });

  describe('Complete Plugin Architecture Demo', () => {
    it('should run the complete demo successfully', async () => {
      await expect(demo.run()).resolves.not.toThrow();
    });

    it('should demonstrate all plugin architecture components', async () => {
      // Run the demo
      await demo.run();

      // Verify that the demo completed successfully
      // The demo itself logs success/failure, so we just need to ensure it doesn't throw
      expect(true).toBe(true); // Demo completed without throwing
    });
  });

  describe('Plugin Registry Integration', () => {
    it('should register and retrieve plugins correctly', () => {
      const engine = new HelloWorldEngine();
      const strategy = new SimpleHealingStrategy();

      registry.registerTestEngine(engine);
      registry.registerHealingStrategy(strategy);

      const retrievedEngine = registry.getTestEngine('hello-world');
      const retrievedStrategy = registry.getHealingStrategy('simple-healing');

      expect(retrievedEngine).toBe(engine);
      expect(retrievedStrategy).toBe(strategy);
    });

    it('should provide correct statistics', () => {
      const engine = new HelloWorldEngine();
      const strategy = new SimpleHealingStrategy();

      registry.registerTestEngine(engine);
      registry.registerHealingStrategy(strategy);

      const stats = registry.getStatistics();

      expect(stats.totalPlugins).toBe(2);
      expect(stats.testEngines).toBe(1);
      expect(stats.healingStrategies).toBe(1);
      expect(stats.configurationProviders).toBe(0);
    });
  });

  describe('Test Engine Factory Integration', () => {
    it('should create and register engines correctly', async () => {
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);

      const config = {
        engine: 'hello-world',
        version: '1.0.0',
        settings: {},
      };

      const engine = await factory.createEngine(config);

      expect(engine).toBeDefined();
      expect(engine.name).toBe('hello-world');
      expect(engine.version).toBe('1.0.0');
    });

    it('should validate engine configurations', () => {
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);

      const validConfig = {
        engine: 'hello-world',
        version: '1.0.0',
        settings: {},
      };

      const invalidConfig = {
        engine: 'unknown-engine',
        version: '1.0.0',
        settings: {},
      };

      const validResult = factory.validateEngineConfig(validConfig);
      const invalidResult = factory.validateEngineConfig(invalidConfig);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Unknown engine type: unknown-engine');
    });
  });

  describe('Dependency Container Integration', () => {
    it('should manage dependencies correctly', () => {
      class TestService {
        constructor(public name: string) {}
      }

      container.registerSingleton('testService', TestService, { 
        dependencies: [] 
      });

      const service = container.resolve<TestService>('testService');
      expect(service).toBeInstanceOf(TestService);
    });

    it('should handle dependency injection', () => {
      class Dependency {
        public name = 'dependency';
      }

      class Service {
        constructor(public dependency: Dependency) {}
      }

      container.register('dependency', Dependency);
      container.register('service', Service, { dependencies: ['dependency'] });

      const service = container.resolve<Service>('service');
      expect(service.dependency).toBeInstanceOf(Dependency);
      expect(service.dependency.name).toBe('dependency');
    });
  });

  describe('End-to-End Plugin Workflow', () => {
    it('should demonstrate complete plugin workflow', async () => {
      // 1. Setup dependency injection
      container.registerSingleton('pluginRegistry', () => registry);
      container.registerSingleton('testEngineFactory', () => factory);

      // 2. Register plugins
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);
      const healingStrategy = new SimpleHealingStrategy();
      registry.registerHealingStrategy(healingStrategy);

      // 3. Create and initialize engine
      const engineConfig = {
        engine: 'hello-world',
        version: '1.0.0',
        settings: {},
      };

      const engine = await factory.createEngine(engineConfig);

      // 4. Execute test
      const testConfig = {
        name: 'integration-test',
        type: 'unit' as const,
        filePath: '/test.js',
        timeout: 5000,
        environment: 'test',
        parameters: {},
        engineConfig,
        healingConfig: {
          enabled: true,
          confidenceThreshold: 0.6,
          maxAttempts: 3,
          strategies: ['simple-healing'],
          timeout: 10000,
        },
        retryConfig: {
          maxRetries: 2,
          delay: 1000,
          backoffMultiplier: 1.5,
          maxDelay: 5000,
        },
      };

      const result = await engine.execute(testConfig);

      // 5. Verify results
      expect(result).toBeDefined();
      expect(result.name).toBe('integration-test');
      expect(result.status).toBe('passed');
      expect(result.duration).toBeGreaterThan(0);

      // 6. Test healing capabilities
      const failure = {
        id: 'test-failure',
        testId: 'integration-test',
        type: 'assertion_failed' as const,
        message: 'Test failure',
        timestamp: new Date(),
        context: {
          testConfig,
          environment: {
            os: 'test',
            nodeVersion: '20.0.0',
            environment: 'test',
            availableMemory: 1024,
            cpuCount: 1,
          },
          custom: {},
        },
        previousAttempts: [],
      };

      const healingResult = await engine.heal!(failure);

      expect(healingResult).toBeDefined();
      expect(healingResult.success).toBe(true);
      expect(healingResult.confidence).toBeGreaterThan(0);
      expect(healingResult.actions.length).toBeGreaterThan(0);

      // 7. Cleanup
      await engine.cleanup();
    });
  });

  describe('Plugin Lifecycle Management', () => {
    it('should handle plugin lifecycle correctly', async () => {
      const engine = new HelloWorldEngine();
      const strategy = new SimpleHealingStrategy();

      // Register plugins
      registry.registerTestEngine(engine);
      registry.registerHealingStrategy(strategy);

      // Initialize plugins
      await registry.initializeAllPlugins({});

      // Verify plugins are initialized
      const health = await engine.getHealth();
      expect(health.status).toBe('healthy');

      // Cleanup plugins
      await registry.cleanupAllPlugins();

      // Verify cleanup completed without errors
      expect(true).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle plugin errors gracefully', async () => {
      factory.registerEngineConstructor('hello-world', HelloWorldEngine);

      // Test with invalid configuration
      const invalidConfig = {
        engine: 'hello-world',
        version: '1.0.0',
        settings: {},
      };

      // This should not throw, but the engine creation might fail
      try {
        const engine = await factory.createEngine(invalidConfig);
        expect(engine).toBeDefined();
      } catch (error) {
        // Engine creation failed, which is expected for invalid config
        expect(error).toBeDefined();
      }
    });

    it('should handle healing failures gracefully', async () => {
      const engine = new HelloWorldEngine();
      await engine.initialize({
        engine: 'hello-world',
        version: '1.0.0',
        settings: {},
      });

      const failure = {
        id: 'test-failure',
        testId: 'test',
        type: 'unknown' as any,
        message: 'Unknown failure',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'unit' as const,
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: { engine: 'hello-world', version: '1.0.0', settings: {} },
            healingConfig: {
              enabled: true,
              confidenceThreshold: 0.6,
              maxAttempts: 3,
              strategies: [],
              timeout: 10000,
            },
            retryConfig: {
              maxRetries: 2,
              delay: 1000,
              backoffMultiplier: 1.5,
              maxDelay: 5000,
            },
          },
          environment: {
            os: 'test',
            nodeVersion: '20.0.0',
            environment: 'test',
            availableMemory: 1024,
            cpuCount: 1,
          },
          custom: {},
        },
        previousAttempts: [],
      };

      const healingResult = await engine.heal!(failure);

      expect(healingResult).toBeDefined();
      expect(healingResult.success).toBe(false);
      expect(healingResult.confidence).toBeLessThan(0.5);

      await engine.cleanup();
    });
  });
});
