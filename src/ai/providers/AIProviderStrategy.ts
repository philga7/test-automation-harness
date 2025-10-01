/**
 * Abstract base class for AI provider strategies
 * 
 * This class provides common functionality for all AI provider strategies while
 * requiring implementations to define strategy-specific behavior.
 * 
 * Following the established HealingStrategy pattern from src/core/HealingStrategy.ts
 * with TypeScript strict mode compliance and proper error handling.
 */

import { 
  IAIProviderStrategy,
  AIRequest,
  AIResponse,
  ProviderConfig,
  ProviderContext,
  ConnectionTestResult,
  ProviderHealth,
  ProviderStatistics
} from '../types';
import { logger } from '../../utils/logger';

/**
 * Base error class for AI provider errors
 * 
 * Implements TypeScript strict mode compliance with conditional assignment
 * for optional properties following exactOptionalPropertyTypes requirements
 */
export class AIProviderError extends Error {
  public override readonly cause?: Error;
  public readonly field?: string;
  
  constructor(message: string, field?: string, cause?: Error) {
    super(message);
    this.name = 'AIProviderError';
    
    // Conditional assignment for exactOptionalPropertyTypes compliance
    if (field !== undefined) {
      this.field = field;
    }
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Rate limit error for AI provider requests
 */
export class RateLimitError extends AIProviderError {
  public readonly retryAfter?: number;
  
  constructor(message: string, retryAfter?: number, cause?: Error) {
    super(message, 'rateLimit', cause);
    this.name = 'RateLimitError';
    
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

/**
 * Quota exceeded error for AI provider requests
 */
export class QuotaExceededError extends AIProviderError {
  public readonly quotaLimit?: number;
  public readonly quotaUsed?: number;
  
  constructor(message: string, quotaLimit?: number, quotaUsed?: number, cause?: Error) {
    super(message, 'quota', cause);
    this.name = 'QuotaExceededError';
    
    if (quotaLimit !== undefined) {
      this.quotaLimit = quotaLimit;
    }
    if (quotaUsed !== undefined) {
      this.quotaUsed = quotaUsed;
    }
  }
}

/**
 * Timeout error for AI provider requests
 */
export class TimeoutError extends AIProviderError {
  public readonly timeoutMs?: number;
  
  constructor(message: string, timeoutMs?: number, cause?: Error) {
    super(message, 'timeout', cause);
    this.name = 'TimeoutError';
    
    if (timeoutMs !== undefined) {
      this.timeoutMs = timeoutMs;
    }
  }
}

/**
 * Abstract base class for AI provider strategies
 * 
 * This class implements common functionality that all AI provider strategies share,
 * such as logging, error handling, and statistics calculation.
 */
export abstract class AIProviderStrategy implements IAIProviderStrategy {
  public readonly name: string;
  public readonly version: string;
  public readonly supportedServiceTypes: string[];
  public readonly supportedFailureTypes: string[];
  
  protected isInitialized: boolean = false;
  protected requestAttempts: Map<string, number> = new Map();
  protected successCount: number = 0;
  protected failureCount: number = 0;
  protected totalResponseTime: number = 0;
  
  constructor(
    name: string,
    version: string,
    supportedServiceTypes: string[],
    supportedFailureTypes: string[]
  ) {
    this.name = name;
    this.version = version;
    this.supportedServiceTypes = supportedServiceTypes;
    this.supportedFailureTypes = supportedFailureTypes;
    
    logger.info(`Created AI provider strategy: ${name} v${version}`);
  }
  
  /**
   * Send a request to the AI provider
   * 
   * This method provides common request logic and calls the
   * strategy-specific request method.
   */
  public async sendRequest(request: AIRequest): Promise<AIResponse> {
    try {
      logger.info(`Sending AI request: ${request.id} with provider: ${this.name}`);
      
      const startTime = new Date();
      
      // Check if we can handle this request type
      if (!this.canHandle(request)) {
        throw new AIProviderError(
          `Provider ${this.name} cannot handle service type: ${request.serviceType}`,
          'serviceType'
        );
      }
      
      // Check if we've exceeded max attempts for this request
      const attemptCount = this.requestAttempts.get(request.id) || 0;
      if (attemptCount >= 3) { // Max 3 attempts per request
        throw new AIProviderError(
          `Maximum request attempts exceeded for request: ${request.id}`,
          'maxAttempts'
        );
      }
      
      // Increment attempt count
      this.requestAttempts.set(request.id, attemptCount + 1);
      
      // Call strategy-specific request handling
      const response = await this.doSendRequest(request);
      
      // Update statistics
      const duration = Date.now() - startTime.getTime();
      this.totalResponseTime += duration;
      
      if (response.status === 'success') {
        this.successCount++;
        logger.info(`AI request successful: ${request.id} with provider: ${this.name}`);
      } else {
        this.failureCount++;
        logger.warn(`AI request failed: ${request.id} with provider: ${this.name}`);
      }
      
      return response;
    } catch (error) {
      this.failureCount++;
      logger.error(`AI provider error: ${request.id}`, error);
      throw error;
    }
  }
  
  /**
   * Test connection to the AI provider
   * 
   * This method provides common connection testing logic and calls the
   * strategy-specific connection test method.
   */
  public async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    try {
      logger.info(`Testing connection to AI provider: ${this.name}`);
      
      const startTime = new Date();
      
      // Call strategy-specific connection test
      const result = await this.doTestConnection(config);
      
      const duration = Date.now() - startTime.getTime();
      
      return {
        ...result,
        duration,
        provider: {
          name: this.name,
          version: this.version,
          capabilities: this.supportedServiceTypes
        }
      };
    } catch (error) {
      logger.error(`Connection test failed for provider ${this.name}:`, error);
      return {
        success: false,
        duration: 0,
        message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
        provider: {
          name: this.name,
          version: this.version,
          capabilities: this.supportedServiceTypes
        },
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Get provider name
   */
  public getProviderName(): string {
    return this.name;
  }
  
  /**
   * Calculate confidence score for provider selection
   * 
   * This method provides common confidence calculation logic and calls the
   * strategy-specific confidence calculation method.
   */
  public async calculateConfidence(request: AIRequest, context: ProviderContext): Promise<number> {
    try {
      // Check if we can handle this request type
      if (!this.canHandle(request)) {
        return 0;
      }
      
      // Get base confidence from strategy-specific implementation
      const baseConfidence = await this.doCalculateConfidence(request, context);
      
      // Apply common confidence adjustments
      const adjustedConfidence = this.adjustConfidence(baseConfidence, request, context);
      
      // Ensure confidence is between 0 and 1
      return Math.max(0, Math.min(1, adjustedConfidence));
    } catch (error) {
      logger.error(`Failed to calculate confidence for provider ${this.name}:`, error);
      return 0;
    }
  }
  
  /**
   * Check if this strategy can handle the given request
   * 
   * This method checks if the request type is supported by this strategy.
   */
  public canHandle(request: AIRequest): boolean {
    return this.supportedServiceTypes.includes(request.serviceType);
  }
  
  /**
   * Initialize the AI provider
   */
  public async initialize(config: ProviderConfig): Promise<void> {
    try {
      logger.info(`Initializing AI provider: ${this.name}`);
      await this.doInitialize(config);
      this.isInitialized = true;
      logger.info(`AI provider initialized: ${this.name}`);
    } catch (error) {
      logger.error(`Failed to initialize AI provider ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Clean up resources used by the provider
   */
  public async cleanup(): Promise<void> {
    try {
      logger.info(`Cleaning up AI provider: ${this.name}`);
      await this.doCleanup();
      this.isInitialized = false;
      logger.info(`AI provider cleaned up: ${this.name}`);
    } catch (error) {
      logger.error(`Failed to cleanup AI provider ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Get provider health status
   */
  public async getHealth(): Promise<ProviderHealth> {
    try {
      const statistics = this.getStatistics();
      const healthScore = this.calculateHealthScore(statistics);
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthScore >= 0.8) {
        status = 'healthy';
      } else if (healthScore >= 0.5) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        status,
        score: healthScore,
        details: {
          connectionStatus: this.isInitialized ? 'connected' : 'disconnected',
          responseTime: statistics.averageResponseTime,
          errorRate: 1 - statistics.successRate,
          lastCheck: new Date()
        },
        message: `Provider ${this.name} is ${status}`
      };
    } catch (error) {
      logger.error(`Failed to get health for provider ${this.name}:`, error);
      return {
        status: 'unhealthy',
        score: 0,
        details: {
          connectionStatus: 'unknown',
          responseTime: 0,
          errorRate: 1,
          lastCheck: new Date()
        },
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Get provider statistics
   * 
   * This method returns statistics about the provider's performance.
   */
  public getStatistics(): ProviderStatistics {
    const totalAttempts = this.successCount + this.failureCount;
    const successRate = totalAttempts > 0 ? this.successCount / totalAttempts : 0;
    const averageResponseTime = this.successCount > 0 ? this.totalResponseTime / this.successCount : 0;
    
    const statistics: ProviderStatistics = {
      name: this.name,
      version: this.version,
      totalRequests: totalAttempts,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      successRate,
      averageResponseTime,
      supportedServiceTypes: this.supportedServiceTypes
    };
    
    // Conditional assignment for exactOptionalPropertyTypes compliance
    if (totalAttempts > 0) {
      statistics.lastUsed = new Date();
    }
    
    return statistics;
  }
  
  /**
   * Reset provider statistics
   * 
   * This method resets all statistics for the provider.
   */
  public resetStatistics(): void {
    this.successCount = 0;
    this.failureCount = 0;
    this.totalResponseTime = 0;
    this.requestAttempts.clear();
    logger.info(`Reset statistics for AI provider: ${this.name}`);
  }
  
  /**
   * Calculate health score based on statistics
   */
  protected calculateHealthScore(statistics: ProviderStatistics): number {
    let score = 0;
    
    // Success rate component (40% weight)
    score += statistics.successRate * 0.4;
    
    // Response time component (30% weight)
    const responseTimeScore = Math.max(0, 1 - (statistics.averageResponseTime / 5000)); // 5s max
    score += responseTimeScore * 0.3;
    
    // Connection status component (30% weight)
    const connectionScore = this.isInitialized ? 1 : 0;
    score += connectionScore * 0.3;
    
    return score;
  }
  
  /**
   * Adjust confidence based on common factors
   * 
   * This method applies common confidence adjustments based on
   * system state, previous attempts, and other factors.
   */
  protected adjustConfidence(
    baseConfidence: number,
    _request: AIRequest,
    context: ProviderContext
  ): number {
    let adjustedConfidence = baseConfidence;
    
    // Reduce confidence based on system load
    if (context.systemState.load > 0.8) {
      adjustedConfidence *= 0.9; // Reduce by 10% under high load
    }
    
    // Reduce confidence based on request priority
    if (context.requestContext.priority === 'critical') {
      adjustedConfidence *= 1.1; // Increase by 10% for critical requests
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
   * Strategy-specific request implementation
   * 
   * This method must be implemented by concrete AI provider strategies
   * to perform strategy-specific request handling.
   */
  protected abstract doSendRequest(request: AIRequest): Promise<AIResponse>;
  
  /**
   * Strategy-specific connection test implementation
   * 
   * This method must be implemented by concrete AI provider strategies
   * to perform strategy-specific connection testing.
   */
  protected abstract doTestConnection(config: ProviderConfig): Promise<ConnectionTestResult>;
  
  /**
   * Strategy-specific confidence calculation
   * 
   * This method must be implemented by concrete AI provider strategies
   * to calculate strategy-specific confidence scores.
   */
  protected abstract doCalculateConfidence(request: AIRequest, context: ProviderContext): Promise<number>;
  
  /**
   * Strategy-specific initialization
   * 
   * This method must be implemented by concrete AI provider strategies
   * to perform strategy-specific initialization.
   */
  protected abstract doInitialize(config: ProviderConfig): Promise<void>;
  
  /**
   * Strategy-specific cleanup
   * 
   * This method must be implemented by concrete AI provider strategies
   * to perform strategy-specific cleanup.
   */
  protected abstract doCleanup(): Promise<void>;
}
