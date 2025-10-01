/**
 * AI Provider Types and Interfaces
 * 
 * Core type definitions for AI provider abstraction layer following
 * established interface patterns from src/types/interfaces.ts
 * 
 * This module provides the foundation for swappable AI provider implementations
 * with consistent error handling and TypeScript strict mode compliance.
 */

/**
 * Core interface for AI providers
 * 
 * This is the main contract that every AI provider (OpenAI, Claude, Local, etc.)
 * must implement. It defines the essential operations for AI service communication
 * and provider management.
 */
export interface IAIProvider {
  /** Unique identifier for the AI provider */
  readonly name: string;
  
  /** Version of the AI provider */
  readonly version: string;
  
  /** Types of AI services this provider supports */
  readonly supportedServiceTypes: string[];
  
  /**
   * Send a request to the AI provider
   * @param request - AI request configuration
   * @returns Promise resolving to AI response
   */
  sendRequest(request: AIRequest): Promise<AIResponse>;
  
  /**
   * Test connection to the AI provider
   * @param config - Provider configuration
   * @returns Promise resolving to connection test result
   */
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;
  
  /**
   * Get provider name
   * @returns Provider name string
   */
  getProviderName(): string;
  
  /**
   * Initialize the AI provider
   * @param config - Provider-specific configuration
   */
  initialize(config: ProviderConfig): Promise<void>;
  
  /**
   * Clean up resources used by the provider
   */
  cleanup(): Promise<void>;
  
  /**
   * Get provider health status
   */
  getHealth(): Promise<ProviderHealth>;
}

/**
 * AI Provider Strategy interface
 * 
 * Extends IAIProvider with strategy-specific capabilities
 * following the established HealingStrategy pattern
 */
export interface IAIProviderStrategy extends IAIProvider {
  /** Types of failures this strategy can handle */
  readonly supportedFailureTypes: string[];
  
  /**
   * Calculate confidence score for provider selection
   * @param request - AI request to evaluate
   * @param context - Additional context for decision making
   * @returns Confidence score between 0 and 1
   */
  calculateConfidence(request: AIRequest, context: ProviderContext): Promise<number>;
  
  /**
   * Check if this strategy can handle the given request
   * @param request - AI request to evaluate
   * @returns True if strategy can handle this request type
   */
  canHandle(request: AIRequest): boolean;
}

/**
 * AI Request interface
 * 
 * Defines the structure for AI service requests
 */
export interface AIRequest {
  /** Unique request identifier */
  id: string;
  
  /** Type of AI service requested */
  serviceType: string;
  
  /** Request prompt or input data */
  prompt: string;
  
  /** Request parameters */
  parameters: Record<string, any>;
  
  /** Request metadata */
  metadata?: {
    userId?: string;
    sessionId?: string;
    timestamp?: Date;
    [key: string]: any;
  };
}

/**
 * AI Response interface
 * 
 * Defines the structure for AI service responses
 */
export interface AIResponse {
  /** Response identifier matching request ID */
  id: string;
  
  /** Response content */
  content: string;
  
  /** Response metadata */
  metadata: {
    model: string;
    provider: string;
    tokensUsed?: number;
    responseTime: number;
    confidence?: number;
    timestamp: Date;
    [key: string]: any;
  };
  
  /** Response status */
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  
  /** Error information if status is error */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Provider Configuration interface
 * 
 * Defines configuration structure for AI providers
 */
export interface ProviderConfig {
  /** Provider name */
  name: string;
  
  /** Provider version */
  version: string;
  
  /** Provider-specific parameters */
  parameters: Record<string, any>;
  
  /** Service configuration */
  services: {
    [serviceType: string]: {
      enabled: boolean;
      configuration: Record<string, any>;
    };
  };
  
  /** Timeout configuration */
  timeout?: number;
  
  /** Retry configuration */
  retries?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

/**
 * Provider Context interface
 * 
 * Defines context information for provider decisions
 */
export interface ProviderContext {
  /** Current system state */
  systemState: {
    load: number;
    memoryUsage: number;
    activeConnections: number;
  };
  
  /** Request context */
  requestContext: {
    priority: 'low' | 'normal' | 'high' | 'critical';
    deadline?: Date;
    retryCount: number;
  };
  
  /** Provider statistics */
  providerStats: {
    successRate: number;
    averageResponseTime: number;
    lastUsed?: Date;
  };
}

/**
 * Connection Test Result interface
 * 
 * Defines the result of provider connection tests
 */
export interface ConnectionTestResult {
  /** Test success status */
  success: boolean;
  
  /** Test duration in milliseconds */
  duration: number;
  
  /** Test message */
  message: string;
  
  /** Provider information */
  provider: {
    name: string;
    version: string;
    capabilities: string[];
  };
  
  /** Error information if test failed */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Provider Health interface
 * 
 * Defines provider health status information
 */
export interface ProviderHealth {
  /** Health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Health score (0-1) */
  score: number;
  
  /** Health details */
  details: {
    connectionStatus: 'connected' | 'disconnected' | 'unknown';
    responseTime: number;
    errorRate: number;
    lastCheck: Date;
  };
  
  /** Health message */
  message: string;
}

/**
 * Provider Statistics interface
 * 
 * Defines statistics about provider performance
 */
export interface ProviderStatistics {
  /** Provider name */
  name: string;
  
  /** Provider version */
  version: string;
  
  /** Total requests */
  totalRequests: number;
  
  /** Successful requests */
  successfulRequests: number;
  
  /** Failed requests */
  failedRequests: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Average response time */
  averageResponseTime: number;
  
  /** Supported service types */
  supportedServiceTypes: string[];
  
  /** Last used timestamp */
  lastUsed?: Date;
}

