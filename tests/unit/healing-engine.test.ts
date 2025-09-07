/**
 * Unit tests for HealingEngine
 */

import { HealingEngine } from '../../src/healing/HealingEngine';
import { SimpleLocatorStrategy } from '../../src/healing/strategies/SimpleLocatorStrategy';
import { IDFallbackStrategy } from '../../src/healing/strategies/IDFallbackStrategy';
import { 
  TestFailure, 
  HealingContext, 
  SystemState, 
  UserPreferences,
  FailureType
} from '../../src/types';

describe('HealingEngine', () => {
  let healingEngine: HealingEngine;
  let mockStrategy: SimpleLocatorStrategy;

  beforeEach(() => {
    healingEngine = new HealingEngine();
    mockStrategy = new SimpleLocatorStrategy(0); // No delay for tests
  });

  afterEach(() => {
    // Clean up any registered strategies
    healingEngine = new HealingEngine();
  });

  describe('Engine Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(healingEngine).toBeDefined();
      expect(healingEngine.getStats()).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        maxAttempts: 5,
        minConfidenceThreshold: 0.5,
        strategyTimeout: 10000,
        enableMetrics: true,
        enableDetailedLogging: false
      };

      const customEngine = new HealingEngine(customConfig);
      expect(customEngine).toBeDefined();
    });
  });

  describe('Strategy Registration', () => {
    it('should register a healing strategy', () => {
      healingEngine.registerStrategy(mockStrategy);
      
      const strategies = healingEngine.getStrategies();
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBe(mockStrategy);
    });

    it('should register multiple strategies', () => {
      const strategy2 = new IDFallbackStrategy({}, 0); // No delay for tests
      healingEngine.registerStrategy(mockStrategy);
      healingEngine.registerStrategy(strategy2);
      
      const strategies = healingEngine.getStrategies();
      expect(strategies).toHaveLength(2);
    });

    it('should not register duplicate strategies', () => {
      healingEngine.registerStrategy(mockStrategy);
      healingEngine.registerStrategy(mockStrategy);
      
      const strategies = healingEngine.getStrategies();
      expect(strategies).toHaveLength(1);
    });
  });

  describe('Healing Process', () => {
    let testFailure: TestFailure;
    let healingContext: HealingContext;

    beforeEach(() => {
      healingEngine.registerStrategy(mockStrategy);
      
      testFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'element_not_found',
        message: 'Element not found: .button',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'e2e',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: {
              engine: 'playwright',
              version: '1.0.0',
              settings: {}
            },
            healingConfig: {
              enabled: true,
              confidenceThreshold: 0.6,
              maxAttempts: 3,
              strategies: ['simple-locator'],
              timeout: 10000
            },
            retryConfig: {
              maxRetries: 2,
              delay: 1000,
              backoffMultiplier: 1.5,
              maxDelay: 5000
            }
          },
          environment: {
            os: 'test',
            nodeVersion: '20.0.0',
            environment: 'test',
            availableMemory: 1024,
            cpuCount: 1
          },
          custom: {
            selector: '.button',
            description: 'Test button'
          }
        },
        previousAttempts: []
      };

      const systemState: SystemState = {
        load: 5,
        resources: {
          memory: 512,
          cpu: 25,
          disk: 1024
        },
        activeTests: 5,
        queueLength: 2
      };

      const userPreferences: UserPreferences = {
        preferredStrategies: ['simple-locator'],
        riskTolerance: 'medium',
        notifications: {
          onHealingAttempt: true,
          onHealingSuccess: true,
          onHealingFailure: true
        }
      };

      healingContext = {
        systemState,
        userPreferences,
        availableStrategies: ['simple-locator'],
        previousAttempts: []
      };
    });

    it('should successfully heal a failure', async () => {
      const result = await healingEngine.heal(testFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.actions).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle healing failure gracefully', async () => {
      // Create a failure that the strategy cannot handle
      const unsupportedFailure: TestFailure = {
        ...testFailure,
        type: 'network_error' as FailureType
      };

      const result = await healingEngine.heal(unsupportedFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should respect confidence threshold', async () => {
      const customEngine = new HealingEngine({
        minConfidenceThreshold: 0.9 // Very high threshold
      });
      customEngine.registerStrategy(mockStrategy);

      const result = await customEngine.heal(testFailure, healingContext);

      // Should fail due to low confidence
      expect(result.success).toBe(false);
    });

    it('should track healing attempts', async () => {
      await healingEngine.heal(testFailure, healingContext);

      const stats = healingEngine.getStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.successfulAttempts).toBeGreaterThan(0);
    });

    it('should handle multiple healing attempts', async () => {
      const result1 = await healingEngine.heal(testFailure, healingContext);
      const result2 = await healingEngine.heal(testFailure, healingContext);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      const stats = healingEngine.getStats();
      expect(stats.totalAttempts).toBe(2);
    });
  });

  describe('Statistics and Metrics', () => {
    beforeEach(() => {
      healingEngine.registerStrategy(mockStrategy);
    });

    it('should provide initial statistics', () => {
      const stats = healingEngine.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.successfulAttempts).toBe(0);
      expect(stats.failedAttempts).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });

    it('should update statistics after healing attempts', async () => {
      const testFailure: TestFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'element_not_found',
        message: 'Element not found',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'e2e',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: {
              engine: 'playwright',
              version: '1.0.0',
              settings: {}
            },
            healingConfig: {
              enabled: true,
              confidenceThreshold: 0.6,
              maxAttempts: 3,
              strategies: ['simple-locator'],
              timeout: 10000
            },
            retryConfig: {
              maxRetries: 2,
              delay: 1000,
              backoffMultiplier: 1.5,
              maxDelay: 5000
            }
          },
          environment: {
            os: 'test',
            nodeVersion: '20.0.0',
            environment: 'test',
            availableMemory: 1024,
            cpuCount: 1
          },
          custom: {}
        },
        previousAttempts: []
      };

      const healingContext: HealingContext = {
        systemState: {
          load: 5,
          resources: {
            memory: 512,
            cpu: 25,
            disk: 1024
          },
          activeTests: 5,
          queueLength: 2
        },
        userPreferences: {
          preferredStrategies: ['simple-locator'],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: ['simple-locator'],
        previousAttempts: []
      };

      await healingEngine.heal(testFailure, healingContext);

      const stats = healingEngine.getStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.successfulAttempts).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      healingEngine.resetStats();
      
      const stats = healingEngine.getStats();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.successfulAttempts).toBe(0);
      expect(stats.failedAttempts).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle strategy errors gracefully', async () => {
      // Mock a strategy that throws an error
      const errorStrategy = {
        name: 'error-strategy',
        version: '1.0.0',
        supportedFailureTypes: ['element_not_found'],
        heal: jest.fn().mockRejectedValue(new Error('Strategy error')),
        calculateConfidence: jest.fn().mockResolvedValue(0.5),
        canHeal: jest.fn().mockReturnValue(true)
      };

      healingEngine.registerStrategy(errorStrategy as any);

      const testFailure: TestFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'element_not_found',
        message: 'Element not found',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'e2e',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: {
              engine: 'playwright',
              version: '1.0.0',
              settings: {}
            },
            healingConfig: {
              enabled: true,
              confidenceThreshold: 0.6,
              maxAttempts: 3,
              strategies: ['error-strategy'],
              timeout: 10000
            },
            retryConfig: {
              maxRetries: 2,
              delay: 1000,
              backoffMultiplier: 1.5,
              maxDelay: 5000
            }
          },
          environment: {
            os: 'test',
            nodeVersion: '20.0.0',
            environment: 'test',
            availableMemory: 1024,
            cpuCount: 1
          },
          custom: {}
        },
        previousAttempts: []
      };

      const healingContext: HealingContext = {
        systemState: {
          load: 5,
          resources: {
            memory: 512,
            cpu: 25,
            disk: 1024
          },
          activeTests: 5,
          queueLength: 2
        },
        userPreferences: {
          preferredStrategies: ['error-strategy'],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: ['error-strategy'],
        previousAttempts: []
      };

      const result = await healingEngine.heal(testFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle no registered strategies', async () => {
      const testFailure: TestFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'element_not_found',
        message: 'Element not found',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'test',
            type: 'e2e',
            filePath: '/test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: {
              engine: 'playwright',
              version: '1.0.0',
              settings: {}
            },
            healingConfig: {
              enabled: true,
              confidenceThreshold: 0.6,
              maxAttempts: 3,
              strategies: [],
              timeout: 10000
            },
            retryConfig: {
              maxRetries: 2,
              delay: 1000,
              backoffMultiplier: 1.5,
              maxDelay: 5000
            }
          },
          environment: {
            os: 'test',
            nodeVersion: '20.0.0',
            environment: 'test',
            availableMemory: 1024,
            cpuCount: 1
          },
          custom: {}
        },
        previousAttempts: []
      };

      const healingContext: HealingContext = {
        systemState: {
          load: 5,
          resources: {
            memory: 512,
            cpu: 25,
            disk: 1024
          },
          activeTests: 5,
          queueLength: 2
        },
        userPreferences: {
          preferredStrategies: [],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: [],
        previousAttempts: []
      };

      const result = await healingEngine.heal(testFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.message).toContain('No applicable healing strategies found');
    });
  });
});
