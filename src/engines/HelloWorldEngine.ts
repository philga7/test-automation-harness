/**
 * Hello World Test Engine
 * 
 * This is a simple test engine that demonstrates the plugin architecture.
 * It can execute basic tests and supports simple healing strategies.
 */

import { 
  TestConfig, 
  TestResult, 
  TestFailure, 
  HealingResult, 
  EngineConfig, 
  EngineHealth,
  TestType,
  HealingAction
} from '../types';
import { TestEngine } from '../core/TestEngine';
import { logger } from '../utils/logger';

/**
 * Hello World Test Engine
 * 
 * This engine demonstrates the plugin architecture by providing a simple
 * test execution environment that can run basic tests and attempt healing.
 */
export class HelloWorldEngine extends TestEngine {
  private testCounter: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;
  private delay: number = 100; // Default delay for demo purposes
  
  constructor(delay: number = 100) {
    super('hello-world', '1.0.0', 'unit', true);
    this.delay = delay;
    logger.info('Created HelloWorldEngine');
  }
  
  /**
   * Initialize the Hello World engine
   */
  protected async doInitialize(_config: EngineConfig): Promise<void> {
    logger.info('Initializing HelloWorldEngine');
    
    // Simulate initialization delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    // Reset counters
    this.testCounter = 0;
    this.successCount = 0;
    this.failureCount = 0;
    
    logger.info('HelloWorldEngine initialized successfully');
  }
  
  /**
   * Execute a test using the Hello World engine
   */
  protected async doExecute(config: TestConfig): Promise<TestResult> {
    logger.info(`Executing test: ${config.name}`);
    
    const result = this.createTestResult(config, 'running');
    this.testCounter++;
    
    try {
      // Simulate test execution delay
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay * 2));
      }
      
      // Simple test logic - check if test name contains "fail"
      if (config.name.toLowerCase().includes('fail')) {
        result.status = 'failed';
        result.errors.push({
          message: `Test ${config.name} failed as expected`,
          type: 'assertion_failed',
          timestamp: new Date(),
          context: { testName: config.name },
        });
        this.failureCount++;
      } else {
        result.status = 'passed';
        result.output = `Hello World! Test ${config.name} passed successfully.`;
        this.successCount++;
      }
      
      logger.info(`Test ${config.name} completed with status: ${result.status}`);
      return result;
    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        message: `Test ${config.name} failed with error: ${error}`,
        type: 'unknown',
        timestamp: new Date(),
        context: { testName: config.name, error: String(error) },
      });
      this.failureCount++;
      
      logger.error(`Test ${config.name} failed:`, error);
      return result;
    }
  }
  
  /**
   * Attempt to heal a failed test
   */
  protected override async doHeal(failure: TestFailure): Promise<HealingResult> {
    logger.info(`Attempting to heal test failure: ${failure.testId}`);
    
    const healingId = this.generateHealingId(failure);
    const startTime = new Date();
    
    try {
      // Simulate healing delay
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay * 1.5));
      }
      
      const actions: HealingAction[] = [];
      let success = false;
      let confidence = 0;
      let message = '';
      
      // Simple healing logic based on failure type
      switch (failure.type) {
        case 'assertion_failed':
          // Try to fix assertion failures by retrying
          actions.push(this.createHealingAction(
            'retry',
            'Retrying failed assertion',
            { retryCount: 1 },
            'success',
            'Retry attempt completed'
          ));
          success = true;
          confidence = 0.8;
          message = 'Successfully healed assertion failure by retrying';
          break;
          
        case 'timeout':
          // Try to fix timeouts by increasing timeout
          actions.push(this.createHealingAction(
            'update_configuration',
            'Increasing timeout value',
            { newTimeout: 60000 },
            'success',
            'Timeout increased successfully'
          ));
          success = true;
          confidence = 0.7;
          message = 'Successfully healed timeout by increasing timeout value';
          break;
          
        case 'element_not_found':
          // Try to fix element not found by waiting
          actions.push(this.createHealingAction(
            'wait_for_element',
            'Waiting for element to appear',
            { waitTime: 5000 },
            'success',
            'Element found after waiting'
          ));
          success = true;
          confidence = 0.6;
          message = 'Successfully healed element not found by waiting';
          break;
          
        default:
          // For unknown failures, try a generic retry
          actions.push(this.createHealingAction(
            'retry',
            'Generic retry for unknown failure',
            { retryCount: 1 },
            'failure',
            'Generic retry failed'
          ));
          success = false;
          confidence = 0.3;
          message = 'Could not heal unknown failure type';
      }
      
      const duration = Date.now() - startTime.getTime();
      
      const result: HealingResult = {
        id: healingId,
        success,
        actions,
        confidence,
        duration,
        message,
        metadata: {
          strategy: 'hello-world-healing',
          version: '1.0.0',
          timestamp: new Date(),
        },
      };
      
      logger.info(`Healing attempt completed: ${failure.testId} - Success: ${success}`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      
      logger.error(`Healing attempt failed: ${failure.testId}`, error);
      return this.createFailureResult(
        healingId,
        `Healing attempt failed: ${error}`,
        duration
      );
    }
  }
  
  /**
   * Generate a unique healing ID
   */
  private generateHealingId(failure: TestFailure): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.name}-${failure.id}-${timestamp}-${random}`;
  }
  
  /**
   * Create a healing action
   */
  private createHealingAction(
    type: string,
    description: string,
    parameters: Record<string, any> = {},
    result: 'success' | 'failure' | 'skipped' = 'success',
    message?: string
  ): HealingAction {
    return {
      type: type as any,
      description,
      parameters,
      timestamp: new Date(),
      result,
      message: message || '',
    };
  }
  
  /**
   * Create a failure healing result
   */
  private createFailureResult(
    healingId: string,
    message: string,
    duration: number
  ): HealingResult {
    return {
      id: healingId,
      success: false,
      actions: [],
      confidence: 0,
      duration,
      message,
      metadata: {
        strategy: 'hello-world-healing',
        version: '1.0.0',
        timestamp: new Date(),
      },
    };
  }
  
  /**
   * Clean up the Hello World engine
   */
  protected async doCleanup(): Promise<void> {
    logger.info('Cleaning up HelloWorldEngine');
    
    // Simulate cleanup delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay / 2));
    }
    
    // Reset counters
    this.testCounter = 0;
    this.successCount = 0;
    this.failureCount = 0;
    
    logger.info('HelloWorldEngine cleaned up successfully');
  }
  
  /**
   * Get engine health status
   */
  protected async doGetHealth(): Promise<EngineHealth> {
    const totalTests = this.successCount + this.failureCount;
    const successRate = totalTests > 0 ? this.successCount / totalTests : 1;
    const errorRate = totalTests > 0 ? this.failureCount / totalTests : 0;
    
    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      message: `HelloWorldEngine is ${this.isHealthy ? 'healthy' : 'unhealthy'}. Executed ${totalTests} tests with ${(successRate * 100).toFixed(1)}% success rate.`,
      metrics: {
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: 0, // Would need actual CPU monitoring
        errorRate,
      },
      timestamp: new Date(),
    };
  }
  
  /**
   * Get engine statistics
   */
  public getStatistics(): HelloWorldEngineStatistics {
    return {
      name: this.name,
      version: this.version,
      testType: this.testType,
      supportsHealing: this.supportsHealing,
      totalTests: this.testCounter,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.testCounter > 0 ? this.successCount / this.testCounter : 0,
      isInitialized: this.isInitialized,
      isHealthy: this.isHealthy,
    };
  }
  
  /**
   * Reset engine statistics
   */
  public resetStatistics(): void {
    this.testCounter = 0;
    this.successCount = 0;
    this.failureCount = 0;
    logger.info('Reset HelloWorldEngine statistics');
  }
}

/**
 * Interface for Hello World engine statistics
 */
export interface HelloWorldEngineStatistics {
  name: string;
  version: string;
  testType: TestType;
  supportsHealing: boolean;
  totalTests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  isInitialized: boolean;
  isHealthy: boolean;
}
