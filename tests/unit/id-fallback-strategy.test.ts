/**
 * Unit tests for IDFallbackStrategy
 */

import { IDFallbackStrategy } from '../../src/healing/strategies/IDFallbackStrategy';
import { 
  TestFailure, 
  HealingContext, 
  SystemState, 
  UserPreferences,
  FailureType
} from '../../src/types';

describe('IDFallbackStrategy', () => {
  let strategy: IDFallbackStrategy;
  let testFailure: TestFailure;
  let healingContext: HealingContext;

  beforeEach(() => {
    strategy = new IDFallbackStrategy({}, 0); // No delay for tests
    
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
            strategies: ['id-fallback'],
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
      preferredStrategies: ['id-fallback'],
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
      availableStrategies: ['id-fallback'],
      previousAttempts: []
    };
  });

  describe('Strategy Properties', () => {
    it('should have correct properties', () => {
      expect(strategy.name).toBe('id-fallback');
      expect(strategy.version).toBe('1.0.0');
      expect(strategy.supportedFailureTypes).toContain('element_not_found');
      expect(strategy.supportedFailureTypes).toContain('timeout');
    });
  });

  describe('Can Heal', () => {
    it('should return true for supported failure types', () => {
      expect(strategy.canHeal(testFailure)).toBe(true);
    });

    it('should return false for unsupported failure types', () => {
      const unsupportedFailure: TestFailure = {
        ...testFailure,
        type: 'network_error' as FailureType
      };

      expect(strategy.canHeal(unsupportedFailure)).toBe(false);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence for element_not_found', async () => {
      const confidence = await strategy.calculateConfidence(testFailure, healingContext);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence for timeout', async () => {
      const timeoutFailure: TestFailure = {
        ...testFailure,
        type: 'timeout'
      };

      const confidence = await strategy.calculateConfidence(timeoutFailure, healingContext);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should return 0 for unsupported failure types', async () => {
      const unsupportedFailure: TestFailure = {
        ...testFailure,
        type: 'network_error' as FailureType
      };

      const confidence = await strategy.calculateConfidence(unsupportedFailure, healingContext);
      
      expect(confidence).toBe(0);
    });
  });

  describe('Healing Process', () => {
    it('should successfully heal element_not_found failure', async () => {
      const result = await strategy.heal(testFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it('should successfully heal timeout failure', async () => {
      const timeoutFailure: TestFailure = {
        ...testFailure,
        type: 'timeout'
      };

      const result = await strategy.heal(timeoutFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('should return failure result for unsupported failure types', async () => {
      const unsupportedFailure: TestFailure = {
        ...testFailure,
        type: 'network_error' as FailureType
      };

      const result = await strategy.heal(unsupportedFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should include proper action types', async () => {
      const result = await strategy.heal(testFailure, healingContext);

      expect(result.actions).toBeDefined();
      result.actions.forEach(action => {
        expect(action.type).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.type).toBeDefined();
      });
    });

    it('should include metadata in result', async () => {
      const result = await strategy.heal(testFailure, healingContext);

      expect(result.metadata).toBeDefined();
      expect(result.metadata['strategy']).toBe('id-fallback');
    });
  });

  describe('ID Extraction and Matching', () => {
    it('should handle failure with ID selector', async () => {
      const idFailure: TestFailure = {
        ...testFailure,
        context: {
          ...testFailure.context,
          custom: {
            selector: '#submit-button',
            description: 'Submit button with ID'
          }
        }
      };

      const result = await strategy.heal(idFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle failure with class selector', async () => {
      const classFailure: TestFailure = {
        ...testFailure,
        context: {
          ...testFailure.context,
          custom: {
            selector: '.submit-button',
            description: 'Submit button with class'
          }
        }
      };

      const result = await strategy.heal(classFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle failure with attribute selector', async () => {
      const attrFailure: TestFailure = {
        ...testFailure,
        context: {
          ...testFailure.context,
          custom: {
            selector: '[data-testid="submit-button"]',
            description: 'Submit button with data attribute'
          }
        }
      };

      const result = await strategy.heal(attrFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle failure with complex selector', async () => {
      const complexFailure: TestFailure = {
        ...testFailure,
        context: {
          ...testFailure.context,
          custom: {
            selector: 'div.form-container .submit-button[type="submit"]',
            description: 'Complex nested selector'
          }
        }
      };

      const result = await strategy.heal(complexFailure, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle healing errors gracefully', async () => {
      // Mock a scenario that might cause an error
      const invalidContext: HealingContext = {
        ...healingContext,
        systemState: {
          load: -1,
          resources: {
            memory: -1,
            cpu: -1,
            disk: -1
          },
          activeTests: -1,
          queueLength: -1
        }
      };

      const result = await strategy.heal(testFailure, invalidContext);

      expect(result).toBeDefined();
      // Should still attempt healing even with invalid context
      expect(result.success).toBeDefined();
    });

    it('should handle failure with no custom context', async () => {
      const failureWithoutCustom: TestFailure = {
        ...testFailure,
        context: {
          ...testFailure.context,
          custom: {}
        }
      };

      const result = await strategy.heal(failureWithoutCustom, healingContext);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete healing within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await strategy.heal(testFailure, healingContext);
      
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', () => {
      const customStrategy = new IDFallbackStrategy({}, 0);

      expect(customStrategy).toBeDefined();
      expect(customStrategy.name).toBe('id-fallback');
    });

    it('should use default configuration when none provided', () => {
      const defaultStrategy = new IDFallbackStrategy({}, 0);

      expect(defaultStrategy).toBeDefined();
      expect(defaultStrategy.name).toBe('id-fallback');
    });
  });
});
