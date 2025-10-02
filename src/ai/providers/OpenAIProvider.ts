/**
 * OpenAI Provider Implementation
 * 
 * Concrete implementation of AIProviderStrategy for OpenAI Chat Completions API (v4.x).
 * Integrates with OpenAI's REST API following established patterns from the project's
 * AI provider abstraction layer.
 * 
 * ## Key Features
 * - **Chat Completions API**: Full integration with OpenAI's /v1/chat/completions endpoint
 * - **Error Handling**: Comprehensive error categorization (rate limits, quotas, invalid keys)
 * - **Connection Testing**: API key validation via /v1/models endpoint
 * - **Token Tracking**: Automatic token usage logging from response.usage.total_tokens
 * - **Retry Logic**: Exponential backoff retry via HTTPClient for transient failures
 * - **Security**: API key from environment variables with fallback to config parameters
 * 
 * ## OpenAI SDK v4.x Compatibility
 * This implementation uses direct HTTP API calls rather than the OpenAI SDK to maintain
 * consistency with the project's HTTPClient pattern and retry logic.
 * 
 * ## Error Handling Strategy
 * - **429 Rate Limit**: Throws RateLimitError with retry-after information
 * - **429 Quota Exceeded**: Throws QuotaExceededError for insufficient_quota type
 * - **401 Unauthorized**: Throws AIProviderError with apiKey field for invalid API keys
 * - **5xx Server Errors**: Retried automatically via HTTPClient
 * - **4xx Client Errors**: Not retried (fail fast)
 * 
 * @example
 * ```typescript
 * const provider = new OpenAIProvider();
 * await provider.initialize({
 *   name: 'openai',
 *   version: '1.0.0',
 *   parameters: {
 *     'apiKey': process.env['OPENAI_API_KEY'],
 *     'model': 'gpt-4'
 *   },
 *   services: {
 *     'chat-completion': { enabled: true, configuration: {} }
 *   }
 * });
 * 
 * const response = await provider.sendRequest({
 *   id: 'req-001',
 *   serviceType: 'chat-completion',
 *   prompt: 'Generate test scenarios for login flow',
 *   parameters: {
 *     'temperature': 0.7,
 *     'maxTokens': 2000
 *   }
 * });
 * 
 * console.log(response.content); // Generated test scenarios
 * console.log(response.metadata.tokensUsed); // Token count
 * ```
 * 
 * @see {@link AIProviderStrategy} for base class implementation
 * @see {@link HTTPClient} for retry logic and timeout handling
 */

import { AIProviderStrategy, RateLimitError, QuotaExceededError, AIProviderError } from './AIProviderStrategy';
import { 
  AIRequest, 
  AIResponse, 
  ProviderConfig, 
  ProviderContext, 
  ConnectionTestResult 
} from '../types';
import { HTTPClient, HTTPError } from '../../utils/http-client';
import { logger } from '../../utils/logger';

/**
 * OpenAI Provider concrete implementation
 * 
 * Extends AIProviderStrategy to provide OpenAI-specific functionality
 * following the Strategy pattern established in the codebase.
 * 
 * @class
 * @extends {AIProviderStrategy}
 */
export class OpenAIProvider extends AIProviderStrategy {
  /** HTTP client with retry logic for API requests */
  private httpClient: HTTPClient;
  
  /** OpenAI API key (from environment or config) */
  private apiKey: string = '';
  
  /** Base URL for OpenAI API endpoints */
  private baseUrl: string = 'https://api.openai.com/v1';
  
  /** Default model for completions (configurable via initialize) */
  private defaultModel: string = 'gpt-4';

  /**
   * Create new OpenAI provider instance
   * 
   * Initializes provider with:
   * - Name: 'openai'
   * - Version: '1.0.0'
   * - Supported services: ['chat-completion', 'text-generation', 'embeddings']
   * - Supported failure types: ['rate-limit', 'quota-exceeded', 'invalid-request']
   * - HTTPClient with 3 retries, exponential backoff, 30s timeout
   * 
   * Must call initialize() before sending requests.
   * 
   * @example
   * ```typescript
   * const provider = new OpenAIProvider();
   * await provider.initialize(config);
   * const response = await provider.sendRequest(request);
   * ```
   */
  constructor() {
    super(
      'openai',
      '1.0.0',
      ['chat-completion', 'text-generation', 'embeddings'],
      ['rate-limit', 'quota-exceeded', 'invalid-request']
    );

    // Initialize HTTP client with retry configuration
    this.httpClient = new HTTPClient(
      {
        maxRetries: 3,
        delay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000
      },
      30000 // 30 second timeout
    );

    logger.info('OpenAI Provider created');
  }

  /**
   * Initialize OpenAI provider with configuration
   * 
   * Reads API key from OPENAI_API_KEY environment variable or config.parameters['apiKey'].
   * Environment variable takes precedence for security. Validates API key presence and
   * sets default model for requests.
   * 
   * @param config - Provider configuration with API key and model settings
   * @throws {AIProviderError} If API key is not provided in environment or config
   * 
   * @example
   * ```typescript
   * await provider.initialize({
   *   name: 'openai',
   *   version: '1.0.0',
   *   parameters: {
   *     'apiKey': 'sk-...', // Fallback if OPENAI_API_KEY not set
   *     'model': 'gpt-4'    // Optional, defaults to 'gpt-4'
   *   },
   *   services: {
   *     'chat-completion': { enabled: true, configuration: {} }
   *   }
   * });
   * ```
   */
  protected async doInitialize(config: ProviderConfig): Promise<void> {
    logger.info('Initializing OpenAI Provider');

    // Read API key from environment or config
    this.apiKey = process.env['OPENAI_API_KEY'] || config.parameters['apiKey'] as string;

    if (!this.apiKey) {
      throw new AIProviderError(
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable or provide apiKey in config.',
        'apiKey'
      );
    }

    // Read optional default model from config
    if (config.parameters['model']) {
      this.defaultModel = config.parameters['model'] as string;
    }

    logger.info('OpenAI Provider initialized successfully', {
      model: this.defaultModel
    });
  }

  /**
   * Send request to OpenAI Chat Completions API
   * 
   * Formats request according to OpenAI Chat Completions API specification,
   * sends HTTP POST to /v1/chat/completions, and parses response extracting
   * generated content and token usage.
   * 
   * ## Request Format
   * - **model**: From request.parameters['model'] or defaultModel
   * - **messages**: Array with single user message containing request.prompt
   * - **temperature**: From request.parameters['temperature'] or 0.7
   * - **max_tokens**: From request.parameters['maxTokens'] or 2000
   * 
   * ## Response Extraction
   * - **content**: From response.choices[0].message.content
   * - **tokensUsed**: From response.usage.total_tokens
   * - **responseTime**: Calculated from request start to completion
   * 
   * @param request - AI request with prompt and parameters
   * @returns Promise resolving to AI response with generated content
   * @throws {RateLimitError} For 429 rate limit errors
   * @throws {QuotaExceededError} For insufficient quota errors
   * @throws {AIProviderError} For invalid API key or other errors
   * 
   * @example
   * ```typescript
   * const response = await provider.sendRequest({
   *   id: 'req-001',
   *   serviceType: 'chat-completion',
   *   prompt: 'Generate test scenarios for login',
   *   parameters: {
   *     'temperature': 0.7,
   *     'maxTokens': 2000,
   *     'model': 'gpt-4'
   *   }
   * });
   * 
   * console.log(response.content); // Generated scenarios
   * console.log(response.metadata.tokensUsed); // e.g., 1523
   * console.log(response.metadata.responseTime); // e.g., 2341ms
   * ```
   */
  protected async doSendRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    logger.info('Sending OpenAI request', {
      requestId: request.id,
      serviceType: request.serviceType
    });

    try {
      // Build OpenAI API request
      const model = request.parameters['model'] as string || this.defaultModel;
      const temperature = request.parameters['temperature'] as number || 0.7;
      const maxTokens = request.parameters['maxTokens'] as number || 2000;

      const requestBody = {
        model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature,
        max_tokens: maxTokens
      };

      // Make request to OpenAI API
      const url = `${this.baseUrl}/chat/completions`;
      const openaiResponse = await this.httpClient.request<any>(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      // Parse response
      const content = openaiResponse.choices[0]?.message?.content || '';
      const tokensUsed = openaiResponse.usage?.total_tokens || 0;
      const responseTime = Date.now() - startTime;

      logger.info('OpenAI request successful', {
        requestId: request.id,
        tokensUsed,
        responseTime,
        model
      });

      return {
        id: request.id,
        content,
        metadata: {
          model,
          provider: 'openai',
          tokensUsed,
          responseTime,
          timestamp: new Date()
        },
        status: 'success'
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Handle HTTPError from HTTPClient
      if (error instanceof HTTPError) {
        return this.handleOpenAIError(error, request, responseTime);
      }

      // Handle other errors
      logger.error('OpenAI request failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : String(error),
        responseTime
      });

      throw new AIProviderError(
        `OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`,
        'request',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Handle OpenAI-specific errors
   * 
   * Categorizes HTTP errors from OpenAI API into specific error types following
   * the project's error handling patterns. Extracts error details from response
   * body and throws appropriate error classes.
   * 
   * ## Error Categorization
   * - **429 + insufficient_quota**: QuotaExceededError (subscription limit reached)
   * - **429 + rate_limit_error**: RateLimitError with retry-after (too many requests)
   * - **401**: AIProviderError with apiKey field (invalid/expired key)
   * - **Other 4xx/5xx**: AIProviderError with error type and message
   * 
   * ## Error Context Logging
   * Logs comprehensive error context including:
   * - Request ID for tracing
   * - HTTP status code
   * - OpenAI error type and code
   * - Error message
   * - Response time for performance analysis
   * 
   * @param error - HTTPError from HTTPClient
   * @param request - Original AI request for context
   * @param responseTime - Time taken before error occurred
   * @returns Never returns (always throws)
   * @throws {RateLimitError} For rate limit errors with retry-after
   * @throws {QuotaExceededError} For quota/subscription limit errors
   * @throws {AIProviderError} For all other errors
   * 
   * @private
   */
  private handleOpenAIError(error: HTTPError, request: AIRequest, responseTime: number): AIResponse {
    const errorBody = error.body || {};
    const errorMessage = errorBody.error?.message || error.message;
    const errorType = errorBody.error?.type || 'unknown_error';
    const errorCode = errorBody.error?.code || 'unknown';

    logger.error('OpenAI API error', {
      requestId: request.id,
      status: error.status,
      errorType,
      errorCode,
      errorMessage,
      responseTime
    });

    // Handle rate limit errors (429)
    if (error.status === 429) {
      // Check if it's quota exceeded
      if (errorType === 'insufficient_quota' || errorCode === 'insufficient_quota') {
        throw new QuotaExceededError(
          errorMessage,
          undefined,
          undefined,
          error
        );
      }

      // Rate limit error
      // Extract retry-after header if available
      const retryAfter = error.body?.headers?.['retry-after'] 
        ? parseInt(error.body.headers['retry-after'], 10) 
        : undefined;

      throw new RateLimitError(
        errorMessage,
        retryAfter,
        error
      );
    }

    // Handle invalid API key (401)
    if (error.status === 401) {
      throw new AIProviderError(
        `Invalid API key: ${errorMessage}`,
        'apiKey',
        error
      );
    }

    // Handle other errors
    throw new AIProviderError(
      `OpenAI API error (${error.status}): ${errorMessage}`,
      errorType,
      error
    );
  }

  /**
   * Test connection to OpenAI API
   * 
   * Verifies API key validity by sending GET request to /v1/models endpoint.
   * This is a lightweight endpoint that requires valid authentication but doesn't
   * consume tokens or incur usage costs.
   * 
   * ## Verification Strategy
   * 1. Send GET /v1/models with Authorization header
   * 2. If 200 OK: API key is valid and has access
   * 3. If 401 Unauthorized: API key is invalid or expired
   * 4. If other error: Network or service issue
   * 
   * ## Return Values
   * - **success=true**: API key is valid, connection working
   * - **success=false with INVALID_API_KEY**: Authentication failure
   * - **success=false with CONNECTION_FAILED**: Network/service error
   * 
   * @param _config - Provider configuration (unused, API key already initialized)
   * @returns Promise resolving to connection test result
   * 
   * @example
   * ```typescript
   * const result = await provider.testConnection(config);
   * if (result.success) {
   *   console.log('OpenAI API connection verified');
   * } else {
   *   console.error('Connection failed:', result.error?.code);
   * }
   * ```
   */
  protected async doTestConnection(_config: ProviderConfig): Promise<ConnectionTestResult> {
    logger.info('Testing OpenAI connection');

    try {
      // Use the models endpoint to verify API key
      const url = `${this.baseUrl}/models`;
      const response = await this.httpClient.request<any>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      logger.info('OpenAI connection test successful', {
        modelsCount: response.data?.length || 0
      });

      return {
        success: true,
        duration: 0, // Will be set by base class
        message: 'Successfully connected to OpenAI API',
        provider: {
          name: this.name,
          version: this.version,
          capabilities: this.supportedServiceTypes
        }
      };
    } catch (error) {
      logger.error('OpenAI connection test failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Handle specific error cases
      if (error instanceof HTTPError && error.status === 401) {
        return {
          success: false,
          duration: 0,
          message: 'Invalid API key',
          provider: {
            name: this.name,
            version: this.version,
            capabilities: this.supportedServiceTypes
          },
          error: {
            code: 'INVALID_API_KEY',
            message: 'The provided API key is invalid or expired'
          }
        };
      }

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
          code: 'CONNECTION_FAILED',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Calculate confidence score for OpenAI provider
   * 
   * Returns confidence score (0-1) indicating this provider's suitability
   * for handling the given request. Base confidence is 0.8 for supported
   * service types, then adjusted by base class based on system state and
   * provider statistics.
   * 
   * ## Confidence Factors
   * - **Service Support**: 0.8 base for chat-completion, text-generation, embeddings
   * - **Unsupported Service**: 0.0 (cannot handle)
   * - **System Load**: Applied by base class adjustConfidence()
   * - **Success Rate**: Applied by base class based on provider statistics
   * 
   * ## Confidence Levels
   * - **0.0**: Cannot handle request (unsupported service)
   * - **0.5-0.7**: Can handle but suboptimal (high load or low success rate)
   * - **0.8-1.0**: Optimal choice (supported service, healthy provider)
   * 
   * @param request - AI request to evaluate
   * @param _context - Provider context (unused, base class handles adjustments)
   * @returns Promise resolving to confidence score between 0 and 1
   * 
   * @example
   * ```typescript
   * const confidence = await provider.calculateConfidence(request, context);
   * if (confidence > 0.7) {
   *   console.log('OpenAI is a good choice for this request');
   * }
   * ```
   */
  protected async doCalculateConfidence(
    request: AIRequest,
    _context: ProviderContext
  ): Promise<number> {
    // Base confidence for supported services
    if (!this.canHandle(request)) {
      return 0;
    }

    // OpenAI is generally reliable for chat completion
    const baseConfidence = 0.8;

    return baseConfidence;
  }

  /**
   * Clean up OpenAI provider resources
   * 
   * Performs cleanup operations when provider is being shut down or reinitialized.
   * Clears sensitive data (API key) and resets provider state.
   * 
   * ## Cleanup Operations
   * 1. Clear API key from memory for security
   * 2. Log cleanup completion
   * 
   * ## Note on HTTPClient
   * No explicit HTTPClient cleanup needed as it doesn't maintain persistent connections.
   * All HTTP connections are closed automatically after each request completes.
   * 
   * @returns Promise that resolves when cleanup is complete
   * 
   * @example
   * ```typescript
   * await provider.cleanup();
   * console.log('Provider cleaned up successfully');
   * ```
   */
  protected async doCleanup(): Promise<void> {
    logger.info('Cleaning up OpenAI Provider');
    
    // Clear API key for security
    this.apiKey = '';
    
    logger.info('OpenAI Provider cleanup complete');
  }
}

