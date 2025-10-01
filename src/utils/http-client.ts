/**
 * Shared HTTP Client with Retry Logic and Timeout Handling
 * 
 * Provides reusable HTTP client functionality with:
 * - Exponential backoff retry logic
 * - Timeout handling with AbortController
 * - Comprehensive error handling
 * - Request/response logging
 * 
 * @example
 * ```typescript
 * const client = new HTTPClient({
 *   maxRetries: 3,
 *   delay: 1000,
 *   backoffMultiplier: 2,
 *   maxDelay: 10000
 * }, 5000); // 5 second timeout
 * 
 * const data = await client.request('https://api.example.com/data');
 * ```
 */

import { RetryConfig } from '../types/types';
import { logger } from './logger';

/**
 * Custom error class for HTTP request failures
 * 
 * Includes HTTP status code and response body for debugging
 * 
 * @example
 * ```typescript
 * throw new HTTPError('Not Found', 404, { error: 'Resource not found' });
 * ```
 */
export class HTTPError extends Error {
  public readonly status: number;
  public readonly body: any;

  constructor(message: string, status: number, body?: any) {
    super(message);
    this.name = 'HTTPError';
    this.status = status;
    
    // Conditional assignment for TypeScript strict mode compliance
    if (body !== undefined) {
      this.body = body;
    }
  }
}

/**
 * HTTP Client with retry logic and timeout handling
 * 
 * Implements exponential backoff for retries and uses AbortController
 * for timeout management. Follows Node.js server-side patterns.
 * 
 * @example
 * ```typescript
 * const client = new HTTPClient({
 *   maxRetries: 3,
 *   delay: 1000,
 *   backoffMultiplier: 2,
 *   maxDelay: 10000
 * }, 5000);
 * 
 * // GET request
 * const data = await client.request('https://api.example.com/data');
 * 
 * // POST request with headers
 * const result = await client.request('https://api.example.com/create', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'test' })
 * });
 * ```
 */
export class HTTPClient {
  private retryConfig: RetryConfig;
  private timeout: number;

  /**
   * Create a new HTTP client
   * 
   * @param retryConfig - Retry configuration using RetryConfig interface from types.ts
   * @param timeout - Request timeout in milliseconds (default: 30000ms / 30s)
   * 
   * @example
   * ```typescript
   * const client = new HTTPClient({
   *   maxRetries: 3,
   *   delay: 1000,
   *   backoffMultiplier: 2,
   *   maxDelay: 10000
   * }, 5000);
   * ```
   */
  constructor(
    retryConfig: RetryConfig = {
      maxRetries: 3,
      delay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    },
    timeout: number = 30000
  ) {
    this.retryConfig = retryConfig;
    this.timeout = timeout;
  }

  /**
   * Calculate exponential backoff delay
   * 
   * Formula: min(baseDelay * (backoffMultiplier ^ (attempt - 1)), maxDelay)
   * 
   * @param attempt - Current retry attempt number (1-based)
   * @returns Delay in milliseconds, capped at maxDelay
   * 
   * @private
   */
  private calculateBackoffDelay(attempt: number): number {
    const { delay, backoffMultiplier, maxDelay } = this.retryConfig;
    const exponentialDelay = delay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(exponentialDelay, maxDelay);
  }

  /**
   * Determine if an error is retryable
   * 
   * - Network errors: retryable
   * - 5xx server errors: retryable
   * - 4xx client errors: NOT retryable
   * - Timeout errors: retryable
   * 
   * @param error - Error to check
   * @returns True if error should trigger retry
   * 
   * @private
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (!(error instanceof HTTPError)) {
      return true;
    }

    // 5xx server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 4xx client errors are NOT retryable
    return false;
  }

  /**
   * Make an HTTP request with retry logic and timeout handling
   * 
   * Implements:
   * - Exponential backoff retry logic
   * - AbortController for timeout management
   * - Comprehensive error handling
   * - Request/response logging
   * 
   * @param url - Request URL
   * @param options - Fetch options (method, headers, body, etc.)
   * @returns Parsed JSON response
   * @throws {HTTPError} For non-2xx HTTP responses
   * @throws {Error} For network failures after max retries
   * 
   * @example
   * ```typescript
   * // GET request
   * const data = await client.request('https://api.example.com/data');
   * 
   * // POST request
   * const result = await client.request('https://api.example.com/create', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({ name: 'test' })
   * });
   * ```
   */
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    let lastError: Error | undefined;
    const { maxRetries } = this.retryConfig;

    logger.debug(`HTTPClient: Starting request to ${url}`, { 
      method: options.method || 'GET',
      maxRetries 
    });

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          logger.warn(`HTTPClient: Request timeout after ${this.timeout}ms`, { url, attempt });
        }, this.timeout);

        // Make the request with abort signal
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        // Clear timeout on successful response
        clearTimeout(timeoutId);

        // Check for HTTP errors
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const error = new HTTPError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            body
          );

          // Log HTTP error
          logger.warn(`HTTPClient: HTTP error ${response.status}`, {
            url,
            status: response.status,
            statusText: response.statusText,
            attempt,
            body
          });

          // Check if we should retry
          if (!this.isRetryableError(error)) {
            logger.error(`HTTPClient: Non-retryable error (${response.status})`, {
              url,
              status: response.status
            });
            throw error;
          }

          lastError = error;
        } else {
          // Success! Parse response
          const data = await response.json() as T;

          logger.info(`HTTPClient: Request successful`, {
            url,
            status: response.status,
            attempt
          });

          return data;
        }
      } catch (error: any) {
        lastError = error as Error;

        // Log error
        logger.warn(`HTTPClient: Request attempt ${attempt} failed`, {
          url,
          attempt,
          error: error.message,
          willRetry: attempt <= maxRetries && this.isRetryableError(error)
        });

        // Check if we should retry
        if (!this.isRetryableError(error)) {
          throw error;
        }
      }

      // If we have more retries, wait with exponential backoff
      if (attempt <= maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);
        logger.debug(`HTTPClient: Waiting ${delay}ms before retry ${attempt}`, {
          url,
          delay,
          attempt
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Max retries exceeded
    logger.error(`HTTPClient: Max retries (${maxRetries}) exceeded`, {
      url,
      lastError: lastError?.message
    });

    throw lastError || new Error('Request failed after max retries');
  }
}

