/**
 * Integration tests for HealingEngine with multiple strategies
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

describe('HealingEngine Integration', () => {
  let healingEngine: HealingEngine;
  let simpleStrategy: SimpleLocatorStrategy;
  let idStrategy: IDFallbackStrategy;

  beforeEach(() => {
    healingEngine = new HealingEngine();
    simpleStrategy = new SimpleLocatorStrategy(0); // No delay for tests
    idStrategy = new IDFallbackStrategy({}, 0); // No delay for tests
    
    // Register multiple strategies
    healingEngine.registerStrategy(simpleStrategy);
    healingEngine.registerStrategy(idStrategy);
  });

  afterEach(() => {
    healingEngine = new HealingEngine();
  });

  describe('Multi-Strategy Healing', () => {
    let testFailure: TestFailure;
    let healingContext: HealingContext;

    beforeEach(() => {
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
              strategies: ['simple-locator', 'id-fallback'],
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
        preferredStrategies: ['simple-locator', 'id-fallback'],
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
        availableStrategies: ['simple-locator', 'id-fallback'],
        previousAttempts: []
      };
    });

    it('should attempt healing with multiple strategies', async () => {
      const result = await healingEngine.heal(testFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.actions).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should select the best strategy based on confidence', async () => {
      const result = await healingEngine.heal(testFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata['strategy']).toBeDefined();
      expect(['simple-locator', 'id-fallback']).toContain(result.metadata.strategy);
    });

    it('should track statistics across multiple strategies', async () => {
      // Perform multiple healing attempts
      await healingEngine.heal(testFailure, healingContext);
      await healingEngine.heal(testFailure, healingContext);

      const stats = healingEngine.getStats();
      expect(stats.totalAttempts).toBe(2);
      expect(stats.successfulAttempts).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
    });
  });

  describe('Strategy Fallback Behavior', () => {
    it('should fallback to second strategy if first fails', async () => {
      // Create a failure that might be better handled by ID strategy
      const idFailure: TestFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'element_not_found',
        message: 'Element not found: #submit-button',
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
              strategies: ['simple-locator', 'id-fallback'],
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
            selector: '#submit-button',
            description: 'Submit button with ID'
          }
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
          preferredStrategies: ['simple-locator', 'id-fallback'],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: ['simple-locator', 'id-fallback'],
        previousAttempts: []
      };

      const result = await healingEngine.heal(idFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.metadata['strategy']).toBeDefined();
    });
  });

  describe('Different Failure Types', () => {
    it('should handle element_not_found failures', async () => {
      const elementNotFoundFailure: TestFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'element_not_found',
        message: 'Element not found: .missing-element',
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
              strategies: ['simple-locator', 'id-fallback'],
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
            selector: '.missing-element',
            description: 'Missing element'
          }
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
          preferredStrategies: ['simple-locator', 'id-fallback'],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: ['simple-locator', 'id-fallback'],
        previousAttempts: []
      };

      const result = await healingEngine.heal(elementNotFoundFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle timeout failures', async () => {
      const timeoutFailure: TestFailure = {
        id: 'test-failure-1',
        testId: 'test-1',
        type: 'timeout',
        message: 'Timeout waiting for element: .slow-element',
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
              strategies: ['simple-locator', 'id-fallback'],
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
            selector: '.slow-element',
            description: 'Slow loading element'
          }
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
          preferredStrategies: ['simple-locator', 'id-fallback'],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: ['simple-locator', 'id-fallback'],
        previousAttempts: []
      };

      const result = await healingEngine.heal(timeoutFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent healing attempts', async () => {
      const failures = Array.from({ length: 5 }, (_, i) => ({
        id: `test-failure-${i}`,
        testId: `test-${i}`,
        type: 'element_not_found' as FailureType,
        message: `Element not found: .button-${i}`,
        timestamp: new Date(),
        context: {
          testConfig: {
            name: `test-${i}`,
            type: 'e2e' as const,
            filePath: `/test-${i}.js`,
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
              strategies: ['simple-locator', 'id-fallback'],
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
            selector: `.button-${i}`,
            description: `Test button ${i}`
          }
        },
        previousAttempts: []
      }));

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
          preferredStrategies: ['simple-locator', 'id-fallback'],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: ['simple-locator', 'id-fallback'],
        previousAttempts: []
      };

      // Execute all healing attempts concurrently
      const results = await Promise.all(
        failures.map(failure => healingEngine.heal(failure, healingContext))
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      const stats = healingEngine.getStats();
      expect(stats.totalAttempts).toBe(5);
      expect(stats.successfulAttempts).toBe(5);
      expect(stats.successRate).toBe(1.0);
    });
  });

  describe('Error Recovery', () => {
    it('should continue working after strategy errors', async () => {
      // First, cause an error with invalid context
      const invalidFailure: TestFailure = {
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
              strategies: ['simple-locator', 'id-fallback'],
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

      const invalidContext: HealingContext = {
        systemState: {
          resources: {
            memory: { used: -1, total: 0, percentage: 0 },
            cpu: { used: -1, total: 0, percentage: 0 },
            disk: { used: -1, total: 0, percentage: 0 }
          },
          network: { latency: -1, bandwidth: -1 },
          load: { activeTests: -1, queuedTests: -1 }
        },
        userPreferences: {
          preferredStrategies: ['simple-locator', 'id-fallback'],
          riskTolerance: 'medium',
          notifications: {
            onHealingSuccess: true,
            onHealingFailure: true,
            onConfidenceLow: true
          }
        },
        availableStrategies: ['simple-locator', 'id-fallback'],
        previousAttempts: [],
        testEnvironment: 'test'
      };

      // This might cause an error, but should not crash the engine
      await healingEngine.heal(invalidFailure, invalidContext);

      // Now try a normal healing attempt
      const normalFailure: TestFailure = {
        id: 'test-failure-2',
        testId: 'test-2',
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
              strategies: ['simple-locator', 'id-fallback'],
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

      const normalContext: HealingContext = {
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
          preferredStrategies: ['simple-locator', 'id-fallback'],
          riskTolerance: 'medium',
          notifications: {
            onHealingAttempt: true,
            onHealingSuccess: true,
            onHealingFailure: true
          }
        },
        availableStrategies: ['simple-locator', 'id-fallback'],
        previousAttempts: []
      };

      const result = await healingEngine.heal(normalFailure, normalContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
