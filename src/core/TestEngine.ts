/**
 * Abstract base class for test engines
 * 
 * This class provides common functionality for all test engines while
 * requiring implementations to define engine-specific behavior.
 */

import { 
  ITestEngine, 
  TestConfig, 
  TestResult, 
  TestFailure, 
  HealingResult, 
  EngineConfig, 
  EngineHealth,
  TestType 
} from '../types';
import { logger } from '../utils/logger';

/**
 * Abstract base class for test engines
 * 
 * This class implements common functionality that all test engines share,
 * such as logging, error handling, and lifecycle management.
 */
export abstract class TestEngine implements ITestEngine {
  public readonly name: string;
  public readonly version: string;
  public readonly testType: TestType;
  public readonly supportsHealing: boolean;
  
  protected config: EngineConfig | null = null;
  protected isInitialized: boolean = false;
  protected isHealthy: boolean = true;
  protected startTime: Date | null = null;
  
  constructor(
    name: string,
    version: string,
    testType: TestType,
    supportsHealing: boolean = false
  ) {
    this.name = name;
    this.version = version;
    this.testType = testType;
    this.supportsHealing = supportsHealing;
    
    logger.info(`Created test engine: ${name} v${version}`);
  }
  
  /**
   * Initialize the test engine
   * 
   * This method provides common initialization logic and calls the
   * engine-specific initialization method.
   */
  public async initialize(config: EngineConfig): Promise<void> {
    try {
      logger.info(`Initializing test engine: ${this.name}`);
      
      this.config = config;
      this.startTime = new Date();
      
      // Call engine-specific initialization
      await this.doInitialize(config);
      
      this.isInitialized = true;
      this.isHealthy = true;
      
      logger.info(`Test engine initialized successfully: ${this.name}`);
    } catch (error) {
      this.isHealthy = false;
      logger.error(`Failed to initialize test engine ${this.name}:`, error);
      throw new Error(`Failed to initialize test engine ${this.name}: ${error}`);
    }
  }
  
  /**
   * Execute tests using this engine
   * 
   * This method provides common execution logic and calls the
   * engine-specific execution method.
   */
  public async execute(config: TestConfig): Promise<TestResult> {
    this.ensureInitialized();
    
    try {
      logger.info(`Executing test: ${config.name} with engine: ${this.name}`);
      
      const startTime = new Date();
      
      // Call engine-specific execution
      const result = await this.doExecute(config);
      
      const endTime = new Date();
      result.duration = endTime.getTime() - startTime.getTime();
      result.endTime = endTime;
      
      logger.info(`Test execution completed: ${config.name} - Status: ${result.status}`);
      
      return result;
    } catch (error) {
      logger.error(`Test execution failed: ${config.name}`, error);
      throw new Error(`Test execution failed for ${config.name}: ${error}`);
    }
  }
  
  /**
   * Attempt to heal a failed test
   * 
   * This method provides common healing logic and calls the
   * engine-specific healing method if supported.
   */
  public async heal(failure: TestFailure): Promise<HealingResult> {
    if (!this.supportsHealing) {
      throw new Error(`Test engine ${this.name} does not support healing`);
    }
    
    this.ensureInitialized();
    
    try {
      logger.info(`Attempting to heal test failure: ${failure.testId}`);
      
      const startTime = new Date();
      
      // Call engine-specific healing
      const result = await this.doHeal(failure);
      
      const endTime = new Date();
      result.duration = endTime.getTime() - startTime.getTime();
      
      logger.info(`Healing attempt completed: ${failure.testId} - Success: ${result.success}`);
      
      return result;
    } catch (error) {
      logger.error(`Healing attempt failed: ${failure.testId}`, error);
      throw new Error(`Healing attempt failed for ${failure.testId}: ${error}`);
    }
  }
  
  /**
   * Clean up resources used by the engine
   * 
   * This method provides common cleanup logic and calls the
   * engine-specific cleanup method.
   */
  public async cleanup(): Promise<void> {
    try {
      logger.info(`Cleaning up test engine: ${this.name}`);
      
      // Call engine-specific cleanup
      await this.doCleanup();
      
      this.isInitialized = false;
      this.isHealthy = false;
      
      logger.info(`Test engine cleaned up successfully: ${this.name}`);
    } catch (error) {
      logger.error(`Failed to cleanup test engine ${this.name}:`, error);
      throw new Error(`Failed to cleanup test engine ${this.name}: ${error}`);
    }
  }
  
  /**
   * Get engine health status
   * 
   * This method provides common health checking logic and calls the
   * engine-specific health check method.
   */
  public async getHealth(): Promise<EngineHealth> {
    try {
      const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
      
      // Call engine-specific health check
      const engineHealth = await this.doGetHealth();
      
      return {
        status: this.isHealthy && engineHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        message: engineHealth.message,
        metrics: {
          uptime,
          memoryUsage: engineHealth.metrics.memoryUsage || 0,
          cpuUsage: engineHealth.metrics.cpuUsage || 0,
          errorRate: engineHealth.metrics.errorRate || 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to get health status for engine ${this.name}:`, error);
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error}`,
        metrics: {
          uptime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          errorRate: 1,
        },
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Ensure the engine is initialized
   * 
   * This is a helper method that throws an error if the engine
   * is not properly initialized.
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`Test engine ${this.name} is not initialized`);
    }
  }
  
  /**
   * Create a basic test result
   * 
   * This is a helper method that creates a test result with
   * common fields populated.
   */
  protected createTestResult(config: TestConfig, status: string): TestResult {
    return {
      id: this.generateTestId(config),
      name: config.name,
      status: status as any,
      startTime: new Date(),
      output: '',
      errors: [],
      metrics: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkRequests: 0,
        custom: {},
      },
      healingAttempts: [],
      artifacts: [],
    };
  }
  
  /**
   * Generate a unique test ID
   * 
   * This is a helper method that generates a unique identifier
   * for a test execution.
   */
  protected generateTestId(config: TestConfig): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.name}-${config.name}-${timestamp}-${random}`;
  }
  
  // Abstract methods that must be implemented by concrete engines
  
  /**
   * Engine-specific initialization
   * 
   * This method must be implemented by concrete test engines
   * to perform engine-specific initialization.
   */
  protected abstract doInitialize(config: EngineConfig): Promise<void>;
  
  /**
   * Engine-specific test execution
   * 
   * This method must be implemented by concrete test engines
   * to perform engine-specific test execution.
   */
  protected abstract doExecute(config: TestConfig): Promise<TestResult>;
  
  /**
   * Engine-specific healing
   * 
   * This method must be implemented by concrete test engines
   * that support healing to perform engine-specific healing.
   */
  protected async doHeal(_failure: TestFailure): Promise<HealingResult> {
    // Default implementation for engines that don't support healing
    throw new Error(`Test engine ${this.name} does not support healing`);
  }
  
  /**
   * Engine-specific cleanup
   * 
   * This method must be implemented by concrete test engines
   * to perform engine-specific cleanup.
   */
  protected abstract doCleanup(): Promise<void>;
  
  /**
   * Engine-specific health check
   * 
   * This method must be implemented by concrete test engines
   * to perform engine-specific health checks.
   */
  protected abstract doGetHealth(): Promise<EngineHealth>;
}
