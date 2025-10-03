/**
 * OpenRouter Provider Implementation
 * 
 * Production-ready OpenRouter API integration following established AIProviderStrategy patterns.
 * Supports 200+ models from various providers through OpenAI-compatible Chat Completions API.
 * 
 * @example
 * ```typescript
 * const provider = new OpenRouterProvider();
 * await provider.initialize({
 *   name: 'openrouter',
 *   version: '1.0.0',
 *   parameters: {
 *     apiKey: 'your-openrouter-api-key',
 *     model: 'openai/gpt-4o-mini'
 *   },
 *   services: {
 *     'chat-completion': { enabled: true, configuration: {} }
 *   }
 * });
 * 
 * const response = await provider.sendRequest({
 *   id: 'test-001',
 *   serviceType: 'chat-completion',
 *   prompt: 'Generate a test scenario',
 *   parameters: { temperature: 0.7 }
 * });
 * ```
 */

import { AIProviderStrategy, AIProviderError, RateLimitError } from './AIProviderStrategy';
import { 
  AIRequest, 
  AIResponse, 
  ProviderConfig, 
  ProviderContext,
  ConnectionTestResult 
} from '../types';
import { HTTPClient } from '../../utils/http-client';
import { logger } from '../../utils/logger';

/**
 * OpenRouter Provider implementation
 * 
 * Extends AIProviderStrategy to provide OpenRouter API integration with:
 * - Support for 200+ models from various providers
 * - OpenAI-compatible Chat Completions API
 * - Comprehensive error handling for OpenRouter-specific errors
 * - HTTPClient integration with retry logic and timeout handling
 */
export class OpenRouterProvider extends AIProviderStrategy {
  private apiKey?: string | undefined;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private defaultModel: string = 'openai/gpt-4o-mini';
  private httpClient: HTTPClient;

  constructor() {
    super(
      'openrouter',
      '1.0.0',
      ['chat-completion', 'text-generation'],
      ['rate-limit', 'model-unavailable', 'billing-error', 'authentication', 'invalid-request']
    );
    
    // Initialize HTTP client with retry logic
    this.httpClient = new HTTPClient({
      maxRetries: 3,
      delay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    }, 30000); // 30 second timeout
  }

  /**
   * Initialize the OpenRouter provider
   * 
   * Reads API key from environment variable OPENROUTER_API_KEY or config parameters.
   * Sets up default model and validates configuration.
   * 
   * @param config - Provider configuration
   * @throws {AIProviderError} If API key is missing or invalid
   */
  protected async doInitialize(config: ProviderConfig): Promise<void> {
    try {
      // Read API key from environment or config
      const apiKey = process.env['OPENROUTER_API_KEY'] || config.parameters['apiKey'];
      
      if (!apiKey) {
        throw new AIProviderError('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or provide apiKey in config.', 'apiKey');
      }

      this.apiKey = apiKey as string;

      // Set default model if not specified
      if (config.parameters['model']) {
        this.defaultModel = config.parameters['model'] as string;
      }

      logger.info('OpenRouter provider initialized', {
        model: this.defaultModel,
        baseUrl: this.baseUrl
      });
    } catch (error) {
      logger.error('Failed to initialize OpenRouter provider:', error);
      throw error;
    }
  }

  /**
   * Send a request to OpenRouter API
   * 
   * Formats request for OpenAI-compatible Chat Completions API and handles
   * OpenRouter-specific response parsing and error handling.
   * 
   * @param request - AI request to process
   * @returns Promise resolving to AI response
   * @throws {RateLimitError} For rate limit errors (429)
   * @throws {AIProviderError} For other API errors
   */
  protected async doSendRequest(request: AIRequest): Promise<AIResponse> {
    try {
      const startTime = Date.now();
      
      // Get model from request parameters or use default
      const model = request.parameters['model'] || this.defaultModel;
      
      // Validate model parameter
      if (!model || typeof model !== 'string') {
        throw new AIProviderError('Invalid model parameter', 'model');
      }
      
      // Format request for OpenRouter Chat Completions API
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature: Math.max(0, Math.min(2, request.parameters['temperature'] || 0.7)),
        max_tokens: Math.max(1, Math.min(4096, request.parameters['maxTokens'] || 2000))
      };

      logger.debug('Sending OpenRouter request', {
        model: model,
        promptLength: request.prompt.length,
        temperature: requestBody.temperature,
        maxTokens: requestBody.max_tokens
      });

      // Make request to OpenRouter API
      const response = await this.httpClient.request<any>(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://test-automation-harness.com', // Optional: helps with rate limits
          'X-Title': 'Self-Healing Test Automation Harness' // Optional: helps with rate limits
        },
        body: JSON.stringify(requestBody)
      });

      const responseTime = Date.now() - startTime;

      // Parse response content from choices[0].message.content
      const content = response.choices?.[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      logger.info('OpenRouter request successful', {
        model: model,
        tokensUsed: tokensUsed,
        responseTime: responseTime,
        contentLength: content.length
      });

      return {
        id: request.id,
        content: content,
        status: 'success',
        metadata: {
          model: model,
          provider: 'openrouter',
          tokensUsed: tokensUsed,
          responseTime: responseTime,
          timestamp: new Date()
        }
      };
    } catch (error: any) {
      logger.error('OpenRouter request failed', {
        requestId: request.id,
        model: request.parameters['model'] || this.defaultModel,
        error: error.message,
        status: error.status
      });

      // Handle OpenRouter-specific errors
      if (error.status === 429) {
        const retryAfter = error.headers?.get?.('retry-after');
        throw new RateLimitError(
          'OpenRouter rate limit exceeded',
          retryAfter ? parseInt(retryAfter) : undefined,
          error
        );
      }

      if (error.status === 400) {
        const errorMessage = error.body?.error?.message || error.message;
        throw new AIProviderError(
          `OpenRouter request error: ${errorMessage}`,
          'request',
          error
        );
      }

      if (error.status === 401) {
        throw new AIProviderError(
          'OpenRouter authentication failed. Check your API key.',
          'authentication',
          error
        );
      }

      if (error.status === 402) {
        throw new AIProviderError(
          'OpenRouter billing error. Check your account credits.',
          'billing',
          error
        );
      }

      if (error.status === 404) {
        throw new AIProviderError(
          'OpenRouter model not found. Check model availability.',
          'model',
          error
        );
      }

      // Generic error handling
      throw new AIProviderError(
        `OpenRouter API error: ${error.message}`,
        'api',
        error
      );
    }
  }

  /**
   * Test connection to OpenRouter API
   * 
   * Uses a minimal chat request to verify API key validity and connectivity.
   * 
   * @param _config - Provider configuration (unused but required by interface)
   * @returns Promise resolving to connection test result
   */
  protected async doTestConnection(_config: ProviderConfig): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      
      // Use minimal request to test connection
      const testRequest = {
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1
      };

      await this.httpClient.request(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testRequest)
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration: duration,
        message: 'OpenRouter connection test successful',
        provider: {
          name: this.name,
          version: this.version,
          capabilities: this.supportedServiceTypes
        }
      };
    } catch (error: any) {
      const duration = Date.now() - Date.now();
      
      if (error.status === 401) {
        return {
          success: false,
          duration: duration,
          message: 'OpenRouter authentication failed',
          provider: {
            name: this.name,
            version: this.version,
            capabilities: this.supportedServiceTypes
          },
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid OpenRouter API key'
          }
        };
      }

      return {
        success: false,
        duration: duration,
        message: `OpenRouter connection test failed: ${error.message}`,
        provider: {
          name: this.name,
          version: this.version,
          capabilities: this.supportedServiceTypes
        },
        error: {
          code: 'CONNECTION_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Calculate confidence score for provider selection
   * 
   * Returns base confidence of 0.8 for supported service types,
   * adjusted by system state and provider statistics.
   * 
   * @param _request - AI request to evaluate (unused but required by interface)
   * @param context - Provider context information
   * @returns Confidence score between 0 and 1
   */
  protected async doCalculateConfidence(_request: AIRequest, context: ProviderContext): Promise<number> {
    // Base confidence for supported services
    let confidence = 0.8;

    // Adjust based on system load
    if (context.systemState.load > 0.8) {
      confidence *= 0.9; // Reduce by 10% under high load
    }

    // Adjust based on provider statistics
    if (context.providerStats.successRate > 0.9) {
      confidence *= 1.1; // Increase by 10% for high success rate
    } else if (context.providerStats.successRate < 0.5) {
      confidence *= 0.8; // Reduce by 20% for low success rate
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Clean up resources used by the provider
   * 
   * Clears API key and resets state for security.
   */
  protected async doCleanup(): Promise<void> {
    try {
      // Clear sensitive data
      this.apiKey = undefined;
      
      logger.info('OpenRouter provider cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup OpenRouter provider:', error);
      throw error;
    }
  }
}
