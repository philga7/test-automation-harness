/**
 * Unit tests for AppAnalysisEngine
 * 
 * This file follows strict TDD methodology using the RED-GREEN-REFACTOR cycle.
 * All tests are written FIRST to define expected behavior before implementation.
 */

import { AppAnalysisEngine } from '../../src/analysis/AppAnalysisEngine';
import { 
  TestConfig, 
  EngineConfig, 
  TestFailure,
  FailureType,
  TestType
} from '../../src/types';

// Use unique variable names to prevent global declaration conflicts
const appAnalysisMockFetch = jest.fn();

describe('AppAnalysisEngine', () => {
  let engine: AppAnalysisEngine;
  let config: EngineConfig;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock global fetch for HTTP requests
    (global as any).fetch = appAnalysisMockFetch;
    
    // Create engine instance for testing
    engine = new AppAnalysisEngine();
    
    // Standard engine configuration
    config = {
      engine: 'app-analysis',
      version: '1.0.0',
      settings: {
        timeout: 30000,
        analysisDepth: 'comprehensive',
        outputFormat: 'json',
        includeScreenshots: true,
      },
    };
  });

  afterEach(async () => {
    // Clean up resources after each test
    if (engine) {
      try {
        await engine.cleanup();
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
    
    // Clear all timers and mocks
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Engine Properties', () => {
    it('should have correct engine properties', () => {
      // Test that AppAnalysisEngine has the expected properties
      expect(engine.name).toBe('app-analysis');
      expect(engine.version).toBe('1.0.0');
      expect(engine.testType).toBe('e2e');
      expect(engine.supportsHealing).toBe(true);
    });

    it('should be an instance of AppAnalysisEngine', () => {
      expect(engine).toBeInstanceOf(AppAnalysisEngine);
    });
  });

  describe('Engine Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Test successful initialization
      await expect(engine.initialize(config)).resolves.not.toThrow();
    });

    it('should throw error when configuration is invalid', async () => {
      const invalidConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          // Missing required timeout setting
        },
      };

      // Test that invalid configuration throws an error
      await expect(engine.initialize(invalidConfig)).rejects.toThrow('Invalid configuration');
    });

    it('should throw error when engine is not initialized before execution', async () => {
      const testConfig: TestConfig = {
        name: 'test-app-analysis',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 5000,
        environment: 'test',
        parameters: {
          url: 'http://localhost:3000',
          analysisType: 'full'
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
          maxRetries: 2,
          delay: 1000,
          backoffMultiplier: 1.5,
          maxDelay: 5000,
        },
      };

      // Test that execution fails when engine is not initialized
      await expect(engine.execute(testConfig)).rejects.toThrow('Test engine app-analysis is not initialized');
    });

    it('should set internal state correctly after initialization', async () => {
      await engine.initialize(config);
      
      // Test that initialization sets the correct internal state
      const health = await engine.getHealth();
      expect(health.status).toBe('healthy');
    });
  });

  describe('App Analysis Execution', () => {
    beforeEach(async () => {
      // Initialize engine before each test in this group
      await engine.initialize(config);
    });

    it('should execute app analysis successfully', async () => {
      const testConfig: TestConfig = {
        name: 'successful-app-analysis',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 5000,
        environment: 'test',
        parameters: {
          url: 'http://localhost:3000',
          analysisType: 'full',
          includeAccessibility: true,
          includePerformance: true,
          includeSecurity: true
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
          maxRetries: 2,
          delay: 1000,
          backoffMultiplier: 1.5,
          maxDelay: 5000,
        },
      };

      // Test successful app analysis execution
      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.name).toBe('successful-app-analysis');
      expect(result.status).toBe('passed');
      expect(result.output).toContain('App analysis completed');
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      
      // Test analysis-specific result properties
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts.length).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.custom).toBeDefined();
      expect(result.metrics.custom['elementCount']).toBeDefined();
    });

    it('should handle app analysis with minimal parameters', async () => {
      const testConfig: TestConfig = {
        name: 'minimal-app-analysis',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 5000,
        environment: 'test',
        parameters: {
          url: 'http://localhost:3000'
        },
        engineConfig: config,
        healingConfig: {
          enabled: false,
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

      // Test analysis with minimal configuration
      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.name).toBe('minimal-app-analysis');
      expect(result.status).toBe('passed');
      expect(result.artifacts).toBeDefined();
    });

    it('should fail gracefully when target application is unreachable', async () => {
      const testConfig: TestConfig = {
        name: 'unreachable-app-analysis',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 5000,
        environment: 'test',
        parameters: {
          url: 'http://unreachable-host:9999'
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
          maxRetries: 2,
          delay: 1000,
          backoffMultiplier: 1.5,
          maxDelay: 5000,
        },
      };

      // Test handling of unreachable applications
      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.name).toBe('unreachable-app-analysis');
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('Unable to reach target application');
    });

    it('should generate comprehensive analysis artifacts', async () => {
      const testConfig: TestConfig = {
        name: 'comprehensive-analysis',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 10000,
        environment: 'test',
        parameters: {
          url: 'http://localhost:3000',
          analysisType: 'comprehensive',
          includeScreenshots: true,
          includeAccessibility: true,
          includePerformance: true,
          includeSecurity: true,
          includeCodeGeneration: true
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
          maxRetries: 2,
          delay: 1000,
          backoffMultiplier: 1.5,
          maxDelay: 5000,
        },
      };

      // Test comprehensive analysis artifact generation
      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.status).toBe('passed');
      
      // Test that all expected artifacts are generated
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts.length).toBeGreaterThanOrEqual(4);
      
      const artifactTypes = result.artifacts.map((artifact: any) => artifact.type);
      expect(artifactTypes).toContain('screenshot');
      expect(artifactTypes).toContain('report'); // accessibility report
      expect(artifactTypes).toContain('report'); // performance report  
      expect(artifactTypes).toContain('report'); // security report
      expect(artifactTypes).toContain('log'); // generated tests
      
      // Verify specific report types via metadata
      const reports = result.artifacts.filter(a => a.type === 'report');
      const reportTypes = reports.map(r => r.metadata['type']);
      expect(reportTypes).toContain('accessibility-report');
      expect(reportTypes).toContain('performance-report');
      expect(reportTypes).toContain('security-report');
    });
  });

  describe('Self-Healing Capabilities', () => {
    beforeEach(async () => {
      await engine.initialize(config);
    });

    it('should support healing for element_not_found failures', async () => {
      const failure: TestFailure = {
        id: 'failure-123',
        testId: 'test-123',
        type: 'element_not_found' as FailureType,
        message: 'Element with selector "#submit-btn" not found',
        timestamp: new Date(),
        stack: 'Error: Element not found\n  at page.click',
        context: {
          testConfig: {} as TestConfig,
          environment: {} as any,
          custom: {
            selector: '#submit-btn',
            page: 'login',
            screenshot: 'failure-screenshot.png'
          }
        },
        previousAttempts: []
      };

      // Test healing capability for element not found failures
      const healingResult = await engine.heal(failure);

      expect(healingResult).toBeDefined();
      expect(healingResult.success).toBe(true);
      expect(healingResult.confidence).toBeGreaterThanOrEqual(0.6);
      expect(healingResult.actions).toBeDefined();
      expect(healingResult.actions.length).toBeGreaterThan(0);
      expect(healingResult.actions[0]?.type).toBe('update_selector');
      expect(healingResult.metadata['newSelector']).toBeDefined();
      expect(healingResult.duration).toBeGreaterThanOrEqual(0);
    });

    it('should provide alternative selectors during healing', async () => {
      const failure: TestFailure = {
        id: 'failure-456',
        testId: 'test-456',
        type: 'element_not_found' as FailureType,
        message: 'Element with selector ".old-button" not found',
        timestamp: new Date(),
        stack: 'Error: Element not found',
        context: {
          testConfig: {} as TestConfig,
          environment: {} as any,
          custom: {
            selector: '.old-button',
            page: 'dashboard',
            screenshot: 'healing-screenshot.png'
          }
        },
        previousAttempts: []
      };

      // Test that healing provides alternative selectors
      const healingResult = await engine.heal(failure);

      expect(healingResult).toBeDefined();
      expect(healingResult.success).toBe(true);
      expect(healingResult.metadata['alternatives']).toBeDefined();
      expect(healingResult.metadata['alternatives'].length).toBeGreaterThan(0);
      expect(healingResult.metadata['explanation']).toContain('Found alternative selector');
    });

    it('should fail healing when confidence is too low', async () => {
      const failure: TestFailure = {
        id: 'failure-789',
        testId: 'test-789',
        type: 'element_not_found' as FailureType,
        message: 'Element with selector "#non-existent-element" not found',
        timestamp: new Date(),
        stack: 'Error: Element not found',
        context: {
          testConfig: {} as TestConfig,
          environment: {} as any,
          custom: {
            selector: '#non-existent-element',
            page: 'unknown-page',
            screenshot: 'low-confidence-screenshot.png'
          }
        },
        previousAttempts: []
      };

      // Test that healing fails when confidence is too low
      const healingResult = await engine.heal(failure);

      expect(healingResult).toBeDefined();
      expect(healingResult.success).toBe(false);
      expect(healingResult.confidence).toBeLessThan(0.6);
      expect(healingResult.metadata['reason']).toContain('Confidence too low');
    });
  });

  describe('Engine Cleanup', () => {
    it('should cleanup resources successfully', async () => {
      await engine.initialize(config);
      
      // Test successful cleanup
      await expect(engine.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when not initialized', async () => {
      // Test cleanup when engine was never initialized
      await expect(engine.cleanup()).resolves.not.toThrow();
    });

    it('should cleanup browser resources and temporary files', async () => {
      await engine.initialize(config);
      
      // Execute a test to create resources
      const testConfig: TestConfig = {
        name: 'cleanup-test',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 5000,
        environment: 'test',
        parameters: {
          url: 'http://localhost:3000'
        },
        engineConfig: config,
        healingConfig: {
          enabled: false,
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

      await engine.execute(testConfig);

      // Test that cleanup properly handles all resources
      await expect(engine.cleanup()).resolves.not.toThrow();
      
      // Verify engine state after cleanup
      const health = await engine.getHealth();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Engine Health Monitoring', () => {
    it('should report healthy status when properly initialized', async () => {
      await engine.initialize(config);
      
      const health = await engine.getHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.metrics).toBeDefined();
      expect(health.metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeDefined();
    });

    it('should report unhealthy status when not initialized', async () => {
      const health = await engine.getHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('not initialized');
    });

    it('should include standard metrics in health report', async () => {
      await engine.initialize(config);
      
      const health = await engine.getHealth();
      
      expect(health.metrics).toBeDefined();
      expect(health.metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(health.metrics.memoryUsage).toBeGreaterThan(0);
      expect(health.metrics.cpuUsage).toBeDefined();
      expect(health.metrics.errorRate).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize(config);
    });

    it('should handle timeout errors gracefully', async () => {
      const testConfig: TestConfig = {
        name: 'timeout-test',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 100, // Very short timeout to force timeout
        environment: 'test',
        parameters: {
          url: 'http://localhost:3000',
          analysisType: 'comprehensive' // This should take longer than 100ms
        },
        engineConfig: config,
        healingConfig: {
          enabled: false,
          confidenceThreshold: 0.6,
          maxAttempts: 3,
          strategies: [],
          timeout: 10000,
        },
        retryConfig: {
          maxRetries: 0,
          delay: 1000,
          backoffMultiplier: 1.0,
          maxDelay: 5000,
        },
      };

      // Test timeout handling
      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.status).toBe('timeout');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('timeout');
    });

    it('should provide detailed error information', async () => {
      const testConfig: TestConfig = {
        name: 'error-test',
        type: 'e2e' as TestType,
        filePath: '/test-app',
        timeout: 5000,
        environment: 'test',
        parameters: {
          url: 'invalid-url-format'
        },
        engineConfig: config,
        healingConfig: {
          enabled: false,
          confidenceThreshold: 0.6,
          maxAttempts: 3,
          strategies: [],
          timeout: 10000,
        },
        retryConfig: {
          maxRetries: 0,
          delay: 1000,
          backoffMultiplier: 1.0,
          maxDelay: 5000,
        },
      };

      // Test detailed error reporting
      const result = await engine.execute(testConfig);

      expect(result).toBeDefined();
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toBeDefined();
      expect(result.errors[0]?.message).toBeDefined();
      expect(result.errors[0]?.type).toBeDefined();
      expect(result.errors[0]?.timestamp).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required analysis parameters', async () => {
      const invalidConfig: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          // Missing required analysisDepth setting
        },
      };

      // Test configuration validation
      await expect(engine.initialize(invalidConfig)).rejects.toThrow('Missing required setting: analysisDepth');
    });

    it('should validate analysis depth values', async () => {
      const invalidConfig: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'invalid-depth', // Invalid value
          outputFormat: 'json',
        },
      };

      // Test analysis depth validation
      await expect(engine.initialize(invalidConfig)).rejects.toThrow('Invalid analysisDepth value');
    });

    it('should validate output format values', async () => {
      const invalidConfig: EngineConfig = {
        engine: 'app-analysis',
        version: '1.0.0',
        settings: {
          timeout: 30000,
          analysisDepth: 'basic',
          outputFormat: 'invalid-format', // Invalid format
        },
      };

      // Test output format validation
      await expect(engine.initialize(invalidConfig)).rejects.toThrow('Invalid outputFormat value');
    });
  });
});
