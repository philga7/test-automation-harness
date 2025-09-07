/**
 * Abstract base class for healing strategies
 * 
 * This class provides common functionality for all healing strategies while
 * requiring implementations to define strategy-specific behavior.
 */

import { 
  IHealingStrategy, 
  TestFailure, 
  HealingResult, 
  HealingContext,
  FailureType,
  HealingAction,
  HealingActionType
} from '../types';
import { logger } from '../utils/logger';

/**
 * Abstract base class for healing strategies
 * 
 * This class implements common functionality that all healing strategies share,
 * such as logging, error handling, and confidence calculation.
 */
export abstract class HealingStrategy implements IHealingStrategy {
  public readonly name: string;
  public readonly version: string;
  public readonly supportedFailureTypes: FailureType[];
  
  protected isInitialized: boolean = false;
  protected healingAttempts: Map<string, number> = new Map();
  protected successCount: number = 0;
  protected failureCount: number = 0;
  
  constructor(
    name: string,
    version: string,
    supportedFailureTypes: FailureType[]
  ) {
    this.name = name;
    this.version = version;
    this.supportedFailureTypes = supportedFailureTypes;
    
    logger.info(`Created healing strategy: ${name} v${version}`);
  }
  
  /**
   * Attempt to heal a test failure
   * 
   * This method provides common healing logic and calls the
   * strategy-specific healing method.
   */
  public async heal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    try {
      logger.info(`Attempting to heal failure: ${failure.id} with strategy: ${this.name}`);
      
      const startTime = new Date();
      const healingId = this.generateHealingId(failure);
      
      // Check if we can handle this failure type
      if (!this.canHeal(failure)) {
        return this.createFailureResult(
          healingId,
          `Strategy ${this.name} cannot handle failure type: ${failure.type}`,
          Date.now() - startTime.getTime()
        );
      }
      
      // Check if we've exceeded max attempts for this test
      const attemptCount = this.healingAttempts.get(failure.testId) || 0;
      if (attemptCount >= context.systemState.load) { // Using load as max attempts for now
        return this.createFailureResult(
          healingId,
          `Maximum healing attempts exceeded for test: ${failure.testId}`,
          Date.now() - startTime.getTime()
        );
      }
      
      // Increment attempt count
      this.healingAttempts.set(failure.testId, attemptCount + 1);
      
      // Call strategy-specific healing
      const result = await this.doHeal(failure, context);
      
      // Update statistics
      if (result.success) {
        this.successCount++;
        logger.info(`Healing successful: ${failure.id} with strategy: ${this.name}`);
      } else {
        this.failureCount++;
        logger.warn(`Healing failed: ${failure.id} with strategy: ${this.name}`);
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      logger.error(`Healing strategy error: ${failure.id}`, error);
      return this.createFailureResult(
        this.generateHealingId(failure),
        `Healing strategy error: ${error}`,
        0
      );
    }
  }
  
  /**
   * Calculate confidence score for healing attempt
   * 
   * This method provides common confidence calculation logic and calls the
   * strategy-specific confidence calculation method.
   */
  public async calculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    try {
      // Check if we can handle this failure type
      if (!this.canHeal(failure)) {
        return 0;
      }
      
      // Get base confidence from strategy-specific implementation
      const baseConfidence = await this.doCalculateConfidence(failure, context);
      
      // Apply common confidence adjustments
      const adjustedConfidence = this.adjustConfidence(baseConfidence, failure, context);
      
      // Ensure confidence is between 0 and 1
      return Math.max(0, Math.min(1, adjustedConfidence));
    } catch (error) {
      logger.error(`Failed to calculate confidence for strategy ${this.name}:`, error);
      return 0;
    }
  }
  
  /**
   * Check if this strategy can handle the given failure
   * 
   * This method checks if the failure type is supported by this strategy.
   */
  public canHeal(failure: TestFailure): boolean {
    return this.supportedFailureTypes.includes(failure.type);
  }
  
  /**
   * Get strategy statistics
   * 
   * This method returns statistics about the strategy's performance.
   */
  public getStatistics(): StrategyStatistics {
    const totalAttempts = this.successCount + this.failureCount;
    const successRate = totalAttempts > 0 ? this.successCount / totalAttempts : 0;
    
    return {
      name: this.name,
      version: this.version,
      totalAttempts,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate,
      supportedFailureTypes: this.supportedFailureTypes,
    };
  }
  
  /**
   * Reset strategy statistics
   * 
   * This method resets all statistics for the strategy.
   */
  public resetStatistics(): void {
    this.successCount = 0;
    this.failureCount = 0;
    this.healingAttempts.clear();
    logger.info(`Reset statistics for healing strategy: ${this.name}`);
  }
  
  /**
   * Generate a unique healing ID
   * 
   * This is a helper method that generates a unique identifier
   * for a healing attempt.
   */
  protected generateHealingId(failure: TestFailure): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.name}-${failure.id}-${timestamp}-${random}`;
  }
  
  /**
   * Create a success healing result
   * 
   * This is a helper method that creates a successful healing result.
   */
  protected createSuccessResult(
    healingId: string,
    actions: HealingAction[],
    confidence: number,
    duration: number,
    message: string = 'Healing successful'
  ): HealingResult {
    return {
      id: healingId,
      success: true,
      actions,
      confidence,
      duration,
      message,
      metadata: {
        strategy: this.name,
        version: this.version,
        timestamp: new Date(),
      },
    };
  }
  
  /**
   * Create a failure healing result
   * 
   * This is a helper method that creates a failed healing result.
   */
  protected createFailureResult(
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
        strategy: this.name,
        version: this.version,
        timestamp: new Date(),
      },
    };
  }
  
  /**
   * Create a healing action
   * 
   * This is a helper method that creates a healing action.
   */
  protected createHealingAction(
    type: HealingActionType,
    description: string,
    parameters: Record<string, any> = {},
    result: 'success' | 'failure' | 'skipped' = 'success',
    message?: string
  ): HealingAction {
    return {
      type,
      description,
      parameters,
      timestamp: new Date(),
      result,
      message: message || '',
    };
  }
  
  /**
   * Adjust confidence based on common factors
   * 
   * This method applies common confidence adjustments based on
   * system state, previous attempts, and other factors.
   */
  protected adjustConfidence(
    baseConfidence: number,
    failure: TestFailure,
    context: HealingContext
  ): number {
    let adjustedConfidence = baseConfidence;
    
    // Reduce confidence based on previous attempts
    const attemptCount = this.healingAttempts.get(failure.testId) || 0;
    if (attemptCount > 0) {
      adjustedConfidence *= Math.pow(0.8, attemptCount); // Reduce by 20% per attempt
    }
    
    // Reduce confidence based on system load
    if (context.systemState.load > 0.8) {
      adjustedConfidence *= 0.9; // Reduce by 10% under high load
    }
    
    // Increase confidence based on success rate
    const statistics = this.getStatistics();
    if (statistics.successRate > 0.8) {
      adjustedConfidence *= 1.1; // Increase by 10% for high success rate
    } else if (statistics.successRate < 0.3) {
      adjustedConfidence *= 0.8; // Reduce by 20% for low success rate
    }
    
    return adjustedConfidence;
  }
  
  // Abstract methods that must be implemented by concrete strategies
  
  /**
   * Strategy-specific healing implementation
   * 
   * This method must be implemented by concrete healing strategies
   * to perform strategy-specific healing.
   */
  protected abstract doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult>;
  
  /**
   * Strategy-specific confidence calculation
   * 
   * This method must be implemented by concrete healing strategies
   * to calculate strategy-specific confidence scores.
   */
  protected abstract doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number>;
}

/**
 * Interface for strategy statistics
 */
export interface StrategyStatistics {
  name: string;
  version: string;
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  supportedFailureTypes: FailureType[];
}
