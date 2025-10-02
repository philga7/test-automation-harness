/**
 * Claude Provider Implementation
 * 
 * Concrete implementation of AIProviderStrategy for Anthropic Claude API.
 * Integrates with Claude's Messages API following established patterns from the project's
 * AI provider abstraction layer.
 * 
 * ## Key Features
 * - **Messages API**: Full integration with Claude's /v1/messages endpoint
 * - **Error Handling**: Comprehensive error categorization (rate limits, overloaded, authentication)
 * - **Connection Testing**: API key validation via minimal message request
 * - **Token Tracking**: Automatic token usage logging from response.usage (input_tokens + output_tokens)
 * - **Retry Logic**: Exponential backoff retry via HTTPClient for transient failures
 * - **Security**: API key from environment variables with fallback to config parameters
 * 
 * ## Claude API Differences from OpenAI
 * - **Endpoint**: Uses /v1/messages instead of /v1/chat/completions
 * - **Headers**: Requires anthropic-version header (2024-01-01 or later)
 * - **Request**: Uses messages array with user role, separate system parameter
 * - **Response**: Content at response.content[0].text instead of choices[0].message.content
 * - **Errors**: Different error types (rate_limit_error, overloaded_error, authentication_error)
 * - **Models**: Claude-3 family (Opus, Sonnet, Haiku) with 200k context window
 * 
 * ## Error Handling Strategy
 * - **429 Rate Limit**: Throws RateLimitError with retry-after information
 * - **529 Overloaded**: Throws RateLimitError for service overload (unique to Claude)
 * - **401 Unauthorized**: Throws AIProviderError with apiKey field for invalid API keys
 * - **403 Forbidden**: Throws AIProviderError for permission errors
 * - **5xx Server Errors**: Retried automatically via HTTPClient
 * - **4xx Client Errors**: Not retried (fail fast)
 * 
 * @example
 * ```typescript
 * const provider = new ClaudeProvider();
 * await provider.initialize({
 *   name: 'claude',
 *   version: '1.0.0',
 *   parameters: {
 *     'apiKey': process.env['ANTHROPIC_API_KEY'],
 *     'model': 'claude-3-sonnet-20240229'
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

import { AIProviderStrategy, RateLimitError, AIProviderError } from './AIProviderStrategy';
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
 * Claude Provider concrete implementation
 * 
 * Extends AIProviderStrategy to provide Claude-specific functionality
 * following the Strategy pattern established in the codebase.
 * 
 * @class
 * @extends {AIProviderStrategy}
 */
export class ClaudeProvider extends AIProviderStrategy {
  /** HTTP client with retry logic for API requests */
  private httpClient: HTTPClient;
  
  /** Claude API key (from environment or config) */
  private apiKey: string = '';
  
  /** Base URL for Claude API endpoints */
  private baseUrl: string = 'https://api.anthropic.com/v1';
  
  /** Default model for completions (configurable via initialize) */
  private defaultModel: string = 'claude-3-sonnet-20240229';
  
  /** Anthropic API version header */
  private anthropicVersion: string = '2024-01-01';

  /**
   * Create new Claude provider instance
   * 
   * Initializes provider with:
   * - Name: 'claude'
   * - Version: '1.0.0'
   * - Supported services: ['chat-completion', 'text-generation']
   * - Supported failure types: ['rate-limit', 'overloaded', 'authentication', 'permission']
   * - HTTPClient with 3 retries, exponential backoff, 30s timeout
   * 
   * Must call initialize() before sending requests.
   * 
   * @example
   * ```typescript
   * const provider = new ClaudeProvider();
   * await provider.initialize(config);
   * const response = await provider.sendRequest(request);
   * ```
   */
  constructor() {
    super(
      'claude',
      '1.0.0',
      ['chat-completion', 'text-generation'],
      ['rate-limit', 'overloaded', 'authentication', 'permission']
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

    logger.info('Claude Provider created');
  }

  /**
   * Initialize Claude provider with configuration
   * 
   * Reads API key from ANTHROPIC_API_KEY environment variable or config.parameters['apiKey'].
   * Environment variable takes precedence for security. Validates API key presence and
   * sets default model for requests.
   * 
   * @param config - Provider configuration with API key and model settings
   * @throws {AIProviderError} If API key is not provided in environment or config
   * 
   * @example
   * ```typescript
   * await provider.initialize({
   *   name: 'claude',
   *   version: '1.0.0',
   *   parameters: {
   *     'apiKey': 'sk-ant-...', // Fallback if ANTHROPIC_API_KEY not set
   *     'model': 'claude-3-sonnet-20240229',  // Optional, defaults to sonnet
   *     'anthropicVersion': '2024-01-01'      // Optional, defaults to 2024-01-01
   *   },
   *   services: {
   *     'chat-completion': { enabled: true, configuration: {} }
   *   }
   * });
   * ```
   */
  protected async doInitialize(config: ProviderConfig): Promise<void> {
    logger.info('Initializing Claude Provider');

    // Read API key from environment or config
    this.apiKey = process.env['ANTHROPIC_API_KEY'] || config.parameters['apiKey'] as string;

    if (!this.apiKey) {
      throw new AIProviderError(
        'Claude API key is required. Set ANTHROPIC_API_KEY environment variable or provide apiKey in config.',
        'apiKey'
      );
    }

    // Read optional default model from config
    if (config.parameters['model']) {
      this.defaultModel = config.parameters['model'] as string;
    }

    // Read optional anthropic version from config
    if (config.parameters['anthropicVersion']) {
      this.anthropicVersion = config.parameters['anthropicVersion'] as string;
    }

    logger.info('Claude Provider initialized successfully', {
      model: this.defaultModel,
      anthropicVersion: this.anthropicVersion
    });
  }

  /**
   * Send request to Claude Messages API
   * 
   * Formats request according to Claude Messages API specification,
   * sends HTTP POST to /v1/messages, and parses response extracting
   * generated content and token usage.
   * 
   * ## Request Format (Different from OpenAI)
   * - **model**: From request.parameters['model'] or defaultModel
   * - **messages**: Array with single user message containing request.prompt
   * - **max_tokens**: From request.parameters['maxTokens'] or 2000 (required by Claude)
   * - **temperature**: From request.parameters['temperature'] or 0.7
   * 
   * ## Response Extraction (Different from OpenAI)
   * - **content**: From response.content[0].text (not choices[0].message.content)
   * - **tokensUsed**: From response.usage.input_tokens + response.usage.output_tokens
   * - **responseTime**: Calculated from request start to completion
   * 
   * @param request - AI request with prompt and parameters
   * @returns Promise resolving to AI response with generated content
   * @throws {RateLimitError} For 429 rate limit errors
   * @throws {RateLimitError} For 529 overloaded errors (unique to Claude)
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
   *     'model': 'claude-3-sonnet-20240229'
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

    logger.info('Sending Claude request', {
      requestId: request.id,
      serviceType: request.serviceType
    });

    try {
      // Build Claude API request
      const model = request.parameters['model'] as string || this.defaultModel;
      const temperature = request.parameters['temperature'] as number || 0.7;
      const maxTokens = request.parameters['maxTokens'] as number || 2000;

      const requestBody = {
        model,
        max_tokens: maxTokens, // Required by Claude API
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature
      };

      // Make request to Claude API
      const url = `${this.baseUrl}/messages`;
      const claudeResponse = await this.httpClient.request<any>(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.anthropicVersion
        },
        body: JSON.stringify(requestBody)
      });

      // Parse response - Claude structure is different from OpenAI
      const content = claudeResponse.content?.[0]?.text || '';
      const inputTokens = claudeResponse.usage?.input_tokens || 0;
      const outputTokens = claudeResponse.usage?.output_tokens || 0;
      const tokensUsed = inputTokens + outputTokens;
      const responseTime = Date.now() - startTime;

      logger.info('Claude request successful', {
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
          provider: 'claude',
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
        return this.handleClaudeError(error, request, responseTime);
      }

      // Handle other errors
      logger.error('Claude request failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : String(error),
        responseTime
      });

      throw new AIProviderError(
        `Claude request failed: ${error instanceof Error ? error.message : String(error)}`,
        'request',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Handle Claude-specific errors
   * 
   * Categorizes HTTP errors from Claude API into specific error types following
   * the project's error handling patterns. Extracts error details from response
   * body and throws appropriate error classes.
   * 
   * ## Error Categorization (Claude-specific)
   * - **429 + rate_limit_error**: RateLimitError with retry-after (too many requests)
   * - **529 + overloaded_error**: RateLimitError for service overload (unique to Claude)
   * - **401 + authentication_error**: AIProviderError with apiKey field (invalid/expired key)
   * - **403 + permission_error**: AIProviderError for permission issues
   * - **Other 4xx/5xx**: AIProviderError with error type and message
   * 
   * ## Error Context Logging
   * Logs comprehensive error context including:
   * - Request ID for tracing
   * - HTTP status code
   * - Claude error type
   * - Error message
   * - Response time for performance analysis
   * 
   * @param error - HTTPError from HTTPClient
   * @param request - Original AI request for context
   * @param responseTime - Time taken before error occurred
   * @returns Never returns (always throws)
   * @throws {RateLimitError} For rate limit and overloaded errors
   * @throws {AIProviderError} For authentication, permission, and other errors
   * 
   * @private
   */
  private handleClaudeError(error: HTTPError, request: AIRequest, responseTime: number): AIResponse {
    const errorBody = error.body || {};
    const errorMessage = errorBody.error?.message || error.message;
    const errorType = errorBody.error?.type || 'unknown_error';

    logger.error('Claude API error', {
      requestId: request.id,
      status: error.status,
      errorType,
      errorMessage,
      responseTime
    });

    // Handle rate limit errors (429)
    if (error.status === 429) {
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

    // Handle overloaded errors (529) - unique to Claude
    if (error.status === 529) {
      throw new RateLimitError(
        `Claude service is overloaded: ${errorMessage}`,
        undefined,
        error
      );
    }

    // Handle authentication error (401)
    if (error.status === 401) {
      throw new AIProviderError(
        `Invalid API key: ${errorMessage}`,
        'apiKey',
        error
      );
    }

    // Handle permission error (403)
    if (error.status === 403) {
      throw new AIProviderError(
        `Permission denied: ${errorMessage}`,
        'permission',
        error
      );
    }

    // Handle other errors
    throw new AIProviderError(
      `Claude API error (${error.status}): ${errorMessage}`,
      errorType,
      error
    );
  }

  /**
   * Test connection to Claude API
   * 
   * Verifies API key validity by sending minimal message request to /v1/messages endpoint.
   * Claude doesn't have a lightweight /models endpoint like OpenAI, so we use a minimal
   * message request with a simple prompt.
   * 
   * ## Verification Strategy
   * 1. Send POST /v1/messages with minimal message ("Hello")
   * 2. If 200 OK: API key is valid and has access
   * 3. If 401 Unauthorized: API key is invalid or expired
   * 4. If 403 Forbidden: API key lacks permissions
   * 5. If other error: Network or service issue
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
   *   console.log('Claude API connection verified');
   * } else {
   *   console.error('Connection failed:', result.error?.code);
   * }
   * ```
   */
  protected async doTestConnection(_config: ProviderConfig): Promise<ConnectionTestResult> {
    logger.info('Testing Claude connection');

    try {
      // Use a minimal message request to verify API key
      const url = `${this.baseUrl}/messages`;
      const response = await this.httpClient.request<any>(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.anthropicVersion
        },
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Hello'
          }]
        })
      });

      logger.info('Claude connection test successful', {
        model: response.model
      });

      return {
        success: true,
        duration: 0, // Will be set by base class
        message: 'Successfully connected to Claude API',
        provider: {
          name: this.name,
          version: this.version,
          capabilities: this.supportedServiceTypes
        }
      };
    } catch (error) {
      logger.error('Claude connection test failed', {
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
   * Calculate confidence score for Claude provider
   * 
   * Returns confidence score (0-1) indicating this provider's suitability
   * for handling the given request. Base confidence is 0.8 for supported
   * service types, then adjusted by base class based on system state and
   * provider statistics.
   * 
   * ## Confidence Factors
   * - **Service Support**: 0.8 base for chat-completion, text-generation
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
   *   console.log('Claude is a good choice for this request');
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

    // Claude is generally reliable for chat completion
    const baseConfidence = 0.8;

    return baseConfidence;
  }

  /**
   * Clean up Claude provider resources
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
    logger.info('Cleaning up Claude Provider');
    
    // Clear API key for security
    this.apiKey = '';
    
    logger.info('Claude Provider cleanup complete');
  }
}

