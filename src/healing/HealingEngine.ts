/**
 * Main Self-Healing Engine
 * 
 * This is the core orchestrator that coordinates multiple healing strategies
 * to recover from test failures. It implements a sophisticated fallback system
 * with confidence scoring and success rate tracking.
 */

import { 
  TestFailure, 
  HealingResult, 
  HealingContext,
  FailureType,
  IHealingStrategy
} from '../types';
import { logger } from '../utils/logger';

/**
 * Configuration for the healing engine
 */
export interface HealingEngineConfig {
  /** Maximum number of healing attempts per test */
  maxAttempts: number;
  
  /** Minimum confidence threshold for attempting healing */
  minConfidenceThreshold: number;
  
  /** Timeout for individual healing strategies (ms) */
  strategyTimeout: number;
  
  /** Whether to enable success rate tracking */
  enableMetrics: boolean;
  
  /** Whether to log detailed healing information */
  enableDetailedLogging: boolean;
}

/**
 * Healing engine statistics
 */
export interface HealingEngineStats {
  /** Total healing attempts */
  totalAttempts: number;
  
  /** Successful healing attempts */
  successfulAttempts: number;
  
  /** Failed healing attempts */
  failedAttempts: number;
  
  /** Overall success rate (0-1) */
  successRate: number;
  
  /** Success rate by failure type */
  successRateByType: Record<FailureType, number>;
  
  /** Success rate by strategy */
  successRateByStrategy: Record<string, number>;
  
  /** Average healing duration (ms) */
  averageDuration: number;
  
  /** Most common failure types */
  topFailureTypes: Array<{ type: FailureType; count: number }>;
}

/**
 * Main Self-Healing Engine
 * 
 * This class orchestrates multiple healing strategies to recover from test failures.
 * It implements a sophisticated fallback system with confidence scoring and
 * comprehensive success rate tracking.
 */
export class HealingEngine {
  private strategies: Map<string, IHealingStrategy> = new Map();
  private config: HealingEngineConfig;
  private stats: HealingEngineStats;
  private attemptHistory: Map<string, HealingAttempt[]> = new Map();
  
  constructor(config: Partial<HealingEngineConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      minConfidenceThreshold: 0.3,
      strategyTimeout: 30000,
      enableMetrics: true,
      enableDetailedLogging: true,
      ...config
    };
    
    this.stats = this.initializeStats();
    
    logger.info('HealingEngine initialized', {
      config: this.config,
      strategies: this.strategies.size
    });
  }
  
  /**
   * Register a healing strategy
   */
  public registerStrategy(strategy: IHealingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    logger.info(`Registered healing strategy: ${strategy.name} v${strategy.version}`);
  }
  
  /**
   * Unregister a healing strategy
   */
  public unregisterStrategy(strategyName: string): void {
    if (this.strategies.delete(strategyName)) {
      logger.info(`Unregistered healing strategy: ${strategyName}`);
    }
  }
  
  /**
   * Get all registered strategies
   */
  public getStrategies(): IHealingStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  /**
   * Attempt to heal a test failure using multiple strategies
   */
  public async heal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    const startTime = Date.now();
    const healingId = this.generateHealingId(failure);
    
    logger.info(`Starting healing process for failure: ${failure.id}`, {
      failureType: failure.type,
      testId: failure.testId,
      healingId
    });
    
    try {
      // Check if we've exceeded max attempts
      const attempts = this.attemptHistory.get(failure.testId) || [];
      if (attempts.length >= this.config.maxAttempts) {
        const result = this.createFailureResult(
          healingId,
          `Maximum healing attempts (${this.config.maxAttempts}) exceeded for test: ${failure.testId}`,
          Date.now() - startTime
        );
        
        this.recordAttempt(failure.testId, {
          healingId,
          strategy: 'max-attempts-exceeded',
          success: false,
          confidence: 0,
          duration: Date.now() - startTime,
          message: result.message
        });
        
        return result;
      }
      
      // Find applicable strategies
      const applicableStrategies = this.findApplicableStrategies(failure);
      
      if (applicableStrategies.length === 0) {
        const result = this.createFailureResult(
          healingId,
          `No applicable healing strategies found for failure type: ${failure.type}`,
          Date.now() - startTime
        );
        
        this.recordAttempt(failure.testId, {
          healingId,
          strategy: 'no-strategies',
          success: false,
          confidence: 0,
          duration: Date.now() - startTime,
          message: result.message
        });
        
        return result;
      }
      
      // Try strategies in order of confidence
      const strategyResults = await this.tryStrategiesInOrder(applicableStrategies, failure, context);
      
      // Find the best result
      const bestResult = this.selectBestResult(strategyResults);
      
      // Record the attempt
      this.recordAttempt(failure.testId, {
        healingId,
        strategy: bestResult.metadata?.['strategy'] || 'unknown',
        success: bestResult.success,
        confidence: bestResult.confidence,
        duration: bestResult.duration,
        message: bestResult.message
      });
      
      // Update statistics
      this.updateStats(bestResult, failure);
      
      logger.info(`Healing process completed for failure: ${failure.id}`, {
        success: bestResult.success,
        confidence: bestResult.confidence,
        duration: bestResult.duration,
        strategy: bestResult.metadata?.['strategy']
      });
      
      return bestResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Healing process failed for failure: ${failure.id}`, error);
      
      const result = this.createFailureResult(
        healingId,
        `Healing process failed: ${error}`,
        duration
      );
      
      this.recordAttempt(failure.testId, {
        healingId,
        strategy: 'error',
        success: false,
        confidence: 0,
        duration,
        message: result.message
      });
      
      return result;
    }
  }
  
  /**
   * Calculate overall confidence for healing a failure
   */
  public async calculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    const applicableStrategies = this.findApplicableStrategies(failure);
    
    if (applicableStrategies.length === 0) {
      return 0;
    }
    
    // Calculate confidence for each strategy
    const confidenceScores = await Promise.all(
      applicableStrategies.map(strategy => 
        strategy.calculateConfidence(failure, context)
      )
    );
    
    // Return the highest confidence score
    return Math.max(...confidenceScores);
  }
  
  /**
   * Get healing engine statistics
   */
  public getStats(): HealingEngineStats {
    return { ...this.stats };
  }
  
  /**
   * Reset all statistics
   */
  public resetStats(): void {
    this.stats = this.initializeStats();
    this.attemptHistory.clear();
    logger.info('Healing engine statistics reset');
  }
  
  /**
   * Get attempt history for a specific test
   */
  public getAttemptHistory(testId: string): HealingAttempt[] {
    return this.attemptHistory.get(testId) || [];
  }
  
  /**
   * Update engine configuration
   */
  public updateConfig(newConfig: Partial<HealingEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Healing engine configuration updated', { config: this.config });
  }
  
  // Private helper methods
  
  private initializeStats(): HealingEngineStats {
    return {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      successRate: 0,
      successRateByType: {} as Record<FailureType, number>,
      successRateByStrategy: {},
      averageDuration: 0,
      topFailureTypes: []
    };
  }
  
  private findApplicableStrategies(failure: TestFailure): IHealingStrategy[] {
    return Array.from(this.strategies.values())
      .filter(strategy => strategy.canHeal(failure))
      .sort((a, b) => {
        // Sort by strategy name for consistent ordering
        return a.name.localeCompare(b.name);
      });
  }
  
  private async tryStrategiesInOrder(
    strategies: IHealingStrategy[],
    failure: TestFailure,
    context: HealingContext
  ): Promise<HealingResult[]> {
    const results: HealingResult[] = [];
    
    for (const strategy of strategies) {
      try {
        logger.debug(`Trying strategy: ${strategy.name} for failure: ${failure.id}`);
        
        // Calculate confidence first
        const confidence = await strategy.calculateConfidence(failure, context);
        
        // Skip if confidence is too low
        if (confidence < this.config.minConfidenceThreshold) {
          logger.debug(`Skipping strategy ${strategy.name} due to low confidence: ${confidence}`);
          continue;
        }
        
        // Try healing with timeout
        const result = await Promise.race([
          strategy.heal(failure, context),
          this.createTimeoutPromise(this.config.strategyTimeout)
        ]);
        
        results.push(result);
        
        // If we got a successful result with high confidence, we can stop early
        if (result.success && result.confidence > 0.8) {
          logger.debug(`Early success with strategy: ${strategy.name}, confidence: ${result.confidence}`);
          break;
        }
        
      } catch (error) {
        logger.warn(`Strategy ${strategy.name} failed for failure ${failure.id}:`, error);
        
        // Create a failure result for this strategy
        results.push(this.createFailureResult(
          this.generateHealingId(failure),
          `Strategy ${strategy.name} failed: ${error}`,
          0
        ));
      }
    }
    
    return results;
  }
  
  private selectBestResult(results: HealingResult[]): HealingResult {
    if (results.length === 0) {
      return this.createFailureResult(
        'no-results',
        'No healing results available',
        0
      );
    }
    
    // Sort by success first, then by confidence
    const sortedResults = results.sort((a, b) => {
      if (a.success !== b.success) {
        return a.success ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });
    
    return sortedResults[0]!;
  }
  
  private recordAttempt(testId: string, attempt: HealingAttempt): void {
    const attempts = this.attemptHistory.get(testId) || [];
    attempts.push(attempt);
    this.attemptHistory.set(testId, attempts);
  }
  
  private updateStats(result: HealingResult, failure: TestFailure): void {
    this.stats.totalAttempts++;
    
    if (result.success) {
      this.stats.successfulAttempts++;
    } else {
      this.stats.failedAttempts++;
    }
    
    // Update success rate
    this.stats.successRate = this.stats.successfulAttempts / this.stats.totalAttempts;
    
    // Update success rate by failure type
    if (!this.stats.successRateByType[failure.type]) {
      this.stats.successRateByType[failure.type] = 0;
    }
    
    // Update success rate by strategy
    const strategyName = result.metadata?.['strategy'] || 'unknown';
    if (!this.stats.successRateByStrategy[strategyName]) {
      this.stats.successRateByStrategy[strategyName] = 0;
    }
    
    // Update average duration
    this.stats.averageDuration = 
      (this.stats.averageDuration * (this.stats.totalAttempts - 1) + result.duration) / 
      this.stats.totalAttempts;
  }
  
  private generateHealingId(failure: TestFailure): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `healing-${failure.id}-${timestamp}-${random}`;
  }
  
  private createFailureResult(healingId: string, message: string, duration: number): HealingResult {
    return {
      id: healingId,
      success: false,
      actions: [],
      confidence: 0,
      duration,
      message,
      metadata: {
        strategy: 'healing-engine',
        version: '1.0.0',
        timestamp: new Date(),
      },
    };
  }
  
  private createTimeoutPromise(timeout: number): Promise<HealingResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Strategy timeout after ${timeout}ms`));
      }, timeout);
    });
  }
}

/**
 * Interface for healing attempt tracking
 */
export interface HealingAttempt {
  healingId: string;
  strategy: string;
  success: boolean;
  confidence: number;
  duration: number;
  message: string;
}
