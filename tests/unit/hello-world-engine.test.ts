/**
 * Unit tests for HelloWorldEngine
 */

import { HelloWorldEngine } from '../../src/engines/HelloWorldEngine';
import { 
  TestConfig, 
  EngineConfig, 
  TestFailure,
  FailureType
} from '../../src/types';

describe('HelloWorldEngine', () => {
  let engine: HelloWorldEngine;
  let config: EngineConfig;

  beforeEach(() => {
    engine = new HelloWorldEngine();
    config = {
      engine: 'hello-world',
      version: '1.0.0',
      settings: {
        timeout: 30000,
      },
    };
  });

  afterEach(async () => {
    if (engine) {
      await engine.cleanup();
    }
  });

  describe('Engine Properties', () => {
    it('should have correct properties', () => {
      expect(engine.name).toBe('hello-world');
      expect(engine.version).toBe('1.0.0');
      expect(engine.testType).toBe('unit');
      expect(engine.supportsHealing).toBe(true);
    });
  });

  describe('Engine Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(engine.initialize(config)).resolves.not.toThrow();
    });

    it('should throw error when not initialized', async () => {
      const testConfig: TestConfig = {
        name: 'test',
        type: 'unit',
        filePath: '/test.js',
        timeout: 5000,
        environment: 'test',
        parameters: {},
        engineConfig: config,
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
      };

      await expect(engine.execute(testConfig)).rejects.toThrow('Test engine hello-world is not initialized');
    });
  });

  describe('Test Execution', () => {
    beforeEach(async () => {
      await engine.initialize(config);
    });

    it('should execute a successful test', async () => {
      const testConfig: TestConfig = {
        name: 'successful-test',
        type: 'unit',
        filePath: '/test.js',
        timeout: 5000,
        environment: 'test',
        parameters: {},
        engineConfig: config,
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
      };

      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.name).toBe('successful-test');
      expect(result.status).toBe('passed');
      expect(result.output).toContain('Hello World!');
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should execute a failing test', async () => {
      const testConfig: TestConfig = {
        name: 'failing-test',
        type: 'unit',
        filePath: '/test.js',
        timeout: 5000,
        environment: 'test',
        parameters: {},
        engineConfig: config,
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
      };

      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.name).toBe('failing-test');
      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('failed as expected');
      expect(result.errors[0]?.type).toBe('assertion_failed');
    });

    it('should throw error when test execution fails', async () => {
      const testConfig: TestConfig = {
        name: 'error-test',
        type: 'unit',
        filePath: '/test.js',
        timeout: 5000,
        environment: 'test',
        parameters: {},
        engineConfig: config,
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
      };

      // Mock the doExecute method to throw an error
      const originalDoExecute = (engine as any).doExecute;
      (engine as any).doExecute = jest.fn().mockRejectedValue(new Error('Test execution error'));

      await expect(engine.execute(testConfig)).rejects.toThrow('Test execution failed for error-test');

      // Restore original method
      (engine as any).doExecute = originalDoExecute;
    });
  });

  describe('Healing Capabilities', () => {
    beforeEach(async () => {
      await engine.initialize(config);
    });

    it('should heal assertion failures', async () => {
      const failure: TestFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'assertion_failed',
        message: 'Assertion failed',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'unit',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: config,
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

      const result = await engine.heal(failure);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.8);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]?.type).toBe('retry');
      expect(result.message).toContain('Successfully healed assertion failure');
    });

    it('should heal timeout failures', async () => {
      const failure: TestFailure = {
        id: 'test-failure-2',
        testId: 'test-2',
        type: 'timeout',
        message: 'Test timeout',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'unit',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: config,
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

      const result = await engine.heal(failure);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.7);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]?.type).toBe('update_configuration');
      expect(result.message).toContain('Successfully healed timeout');
    });

    it('should heal element not found failures', async () => {
      const failure: TestFailure = {
        id: 'test-failure-3',
        testId: 'test-3',
        type: 'element_not_found',
        message: 'Element not found',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'unit',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: config,
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

      const result = await engine.heal(failure);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.6);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]?.type).toBe('wait_for_element');
      expect(result.message).toContain('Successfully healed element not found');
    });

    it('should handle unknown failure types', async () => {
      const failure: TestFailure = {
        id: 'test-failure-4',
        testId: 'test-4',
        type: 'unknown' as FailureType,
        message: 'Unknown failure',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'unit',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: config,
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

      const result = await engine.heal(failure);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0.3);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]?.type).toBe('retry');
      expect(result.message).toContain('Could not heal unknown failure type');
    });

    it('should throw error when healing fails', async () => {
      const failure: TestFailure = {
        id: 'test-failure-5',
        testId: 'test-5',
        type: 'assertion_failed',
        message: 'Assertion failed',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'unit',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: config,
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

      // Mock the doHeal method to throw an error
      const originalDoHeal = (engine as any).doHeal;
      (engine as any).doHeal = jest.fn().mockRejectedValue(new Error('Healing error'));

      await expect(engine.heal(failure)).rejects.toThrow('Healing attempt failed for test-5');

      // Restore original method
      (engine as any).doHeal = originalDoHeal;
    });
  });

  describe('Health Status', () => {
    beforeEach(async () => {
      await engine.initialize(config);
    });

    it('should return health status', async () => {
      const health = await engine.getHealth();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.message).toContain('HelloWorldEngine is healthy');
      expect(health.metrics).toBeDefined();
      expect(health.metrics.uptime).toBeGreaterThan(0);
      expect(health.metrics.memoryUsage).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await engine.initialize(config);
    });

    it('should provide statistics', () => {
      const stats = engine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.name).toBe('hello-world');
      expect(stats.version).toBe('1.0.0');
      expect(stats.testType).toBe('unit');
      expect(stats.supportsHealing).toBe(true);
      expect(stats.totalTests).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.isInitialized).toBe(true);
      expect(stats.isHealthy).toBe(true);
    });

    it('should update statistics after test execution', async () => {
      const testConfig: TestConfig = {
        name: 'successful-test',
        type: 'unit',
        filePath: '/test.js',
        timeout: 5000,
        environment: 'test',
        parameters: {},
        engineConfig: config,
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
      };

      await engine.execute(testConfig);

      const stats = engine.getStatistics();
      expect(stats.totalTests).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(1);
    });

    it('should reset statistics', () => {
      engine.resetStatistics();

      const stats = engine.getStatistics();
      expect(stats.totalTests).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup successfully', async () => {
      await engine.initialize(config);
      await expect(engine.cleanup()).resolves.not.toThrow();
    });
  });
});
