/**
 * Unit tests for HTTPClient utility
 * 
 * TDD GREEN PHASE: Testing actual implementation
 */

import { HTTPClient, HTTPError } from '../../src/utils/http-client';
import { logger } from '../../src/utils/logger';

describe('HTTPClient - Core Functionality', () => {
  let httpClientMockFetch: any;

  beforeEach(() => {
    // Mock global fetch for Node.js environment
    httpClientMockFetch = jest.fn();
    (global as any).fetch = httpClientMockFetch;
    
    // Clear console mocks
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    
    // Clean up any timers if they were used
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('HTTPClient Class - Constructor and Basic Setup', () => {
    it('should create HTTPClient with default config', () => {
      const client = new HTTPClient();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HTTPClient);
    });

    it('should create HTTPClient with custom retry config', () => {
      const client = new HTTPClient({
        maxRetries: 5,
        delay: 2000,
        backoffMultiplier: 3,
        maxDelay: 30000
      });
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HTTPClient);
    });

    it('should create HTTPClient with timeout option', () => {
      const client = new HTTPClient(
        { maxRetries: 3, delay: 1000, backoffMultiplier: 2, maxDelay: 10000 },
        5000 // timeout
      );
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HTTPClient);
    });
  });

  describe('HTTPError Class - Custom Error for HTTP Failures', () => {
    it('should create HTTPError with status and body', () => {
      const error = new HTTPError('Request failed', 404, { message: 'Not found' });
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(HTTPError);
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(404);
      expect(error.body).toEqual({ message: 'Not found' });
      expect(error.message).toBe('Request failed');
      expect(error.name).toBe('HTTPError');
    });

    it('should create HTTPError without body', () => {
      const error = new HTTPError('Server error', 500);
      expect(error.status).toBe(500);
      expect(error.body).toBeUndefined();
    });

    it('should extend Error class properly', () => {
      const error = new HTTPError('Request failed', 500, { error: 'Internal server error' });
      expect(error instanceof Error).toBe(true);
      expect(error instanceof HTTPError).toBe(true);
    });
  });

  describe('Request Method - Basic HTTP Requests', () => {
    it('should make successful GET request', async () => {
      const client = new HTTPClient();
      
      httpClientMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      const result = await client.request('https://api.example.com/test');
      expect(result).toEqual({ success: true });
      expect(httpClientMockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          signal: expect.any(Object)
        })
      );
    });

    it('should make GET request with custom headers', async () => {
      const client = new HTTPClient();
      
      httpClientMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' })
      });
      
      const result = await client.request('https://api.example.com/data', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' }
      });
      
      expect(result).toEqual({ data: 'test' });
      expect(httpClientMockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Authorization': 'Bearer token' }
        })
      );
    });

    it('should make POST request with JSON body', async () => {
      const client = new HTTPClient();
      
      httpClientMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: '123', created: true })
      });
      
      const result = await client.request('https://api.example.com/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' })
      });
      
      expect(result).toEqual({ id: '123', created: true });
    });
  });

  describe('Retry Logic - Exponential Backoff', () => {
    it('should retry on network failure and eventually succeed', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient({
        maxRetries: 3,
        delay: 10, // Small delay for fast testing
        backoffMultiplier: 2,
        maxDelay: 5000
      });
      
      // Fail twice, succeed on third attempt
      httpClientMockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        });
      
      const requestPromise = client.request('https://api.example.com/retry');
      
      // Advance timers to process retries
      await jest.runAllTimersAsync();
      
      const result = await requestPromise;
      expect(result).toEqual({ success: true });
      expect(httpClientMockFetch).toHaveBeenCalledTimes(3);
    });

    it('should calculate exponential backoff correctly', async () => {
      const client = new HTTPClient({
        maxRetries: 3,
        delay: 1000, // baseDelay
        backoffMultiplier: 2,
        maxDelay: 10000
      });
      
      // Track setTimeout calls to verify backoff delays
      const delays: number[] = [];
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      setTimeoutSpy.mockImplementation(((callback: any, delay: number) => {
        // Only track backoff delays (< 20000), not timeout delays
        if (delay < 20000) {
          delays.push(delay);
        }
        callback(); // Execute immediately
        return 0 as any;
      }) as any);
      
      // Fail all attempts to capture all delay calculations
      httpClientMockFetch.mockRejectedValue(new Error('Network error'));
      
      try {
        await client.request('https://api.example.com/backoff');
      } catch (error) {
        // Expected to fail after retries
      }
      
      // Expected delays: 1000 * 2^0 = 1000, 1000 * 2^1 = 2000, 1000 * 2^2 = 4000
      expect(delays).toHaveLength(3); // 3 retries = 3 delays
      expect(delays[0]).toBe(1000); // First retry: baseDelay * 2^0
      expect(delays[1]).toBe(2000); // Second retry: baseDelay * 2^1
      expect(delays[2]).toBe(4000); // Third retry: baseDelay * 2^2
      
      setTimeoutSpy.mockRestore();
    });

    it('should enforce max delay cap', async () => {
      const client = new HTTPClient({
        maxRetries: 5,
        delay: 5000,
        backoffMultiplier: 3,
        maxDelay: 10000 // Cap at 10 seconds
      });
      
      const delays: number[] = [];
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      setTimeoutSpy.mockImplementation(((callback: any, delay: number) => {
        // Only track backoff delays (< 20000), not timeout delays
        if (delay < 20000) {
          delays.push(delay);
        }
        callback(); // Execute immediately
        return 0 as any;
      }) as any);
      
      httpClientMockFetch.mockRejectedValue(new Error('Network error'));
      
      try {
        await client.request('https://api.example.com/maxdelay');
      } catch (error) {
        // Expected to fail
      }
      
      // Backoff delays should be capped at maxDelay (10000)
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(10000);
      });
      
      setTimeoutSpy.mockRestore();
    });

    it('should throw error after max retries exceeded', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient({
        maxRetries: 2,
        delay: 10, // Small delay for fast testing
        backoffMultiplier: 2,
        maxDelay: 5000
      });
      
      httpClientMockFetch.mockRejectedValue(new Error('Persistent network error'));
      
      const requestPromise = client.request('https://api.example.com/fail').catch((error: Error) => error);
      
      // Advance timers to process all retries
      await jest.runAllTimersAsync();
      
      const error = await requestPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Persistent network error');
      expect(httpClientMockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Timeout Handling - AbortController Integration', () => {
    it('should timeout slow requests', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient(
        { maxRetries: 0, delay: 100, backoffMultiplier: 2, maxDelay: 5000 },
        100 // 100ms timeout
      );
      
      // Mock a slow request that respects abort signal
      httpClientMockFetch.mockImplementationOnce((_url: string, options: any) => {
        return new Promise((resolve, reject) => {
          // Listen for abort signal
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new Error('The operation was aborted'));
            });
          }
          // Simulate slow response (will be interrupted by abort)
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: 'slow' })
          }), 5000);
        });
      });
      
      const requestPromise = client.request('https://api.example.com/slow').catch((error: Error) => error);
      
      // Advance timers to trigger timeout (101ms, just past the 100ms timeout)
      await jest.advanceTimersByTimeAsync(101);
      
      // Request should timeout and throw
      const result = await requestPromise;
      expect(result).toBeInstanceOf(Error);
    });

    it('should create AbortController for each request', async () => {
      const client = new HTTPClient(
        { maxRetries: 1, delay: 100, backoffMultiplier: 2, maxDelay: 5000 },
        5000
      );
      
      httpClientMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      await client.request('https://api.example.com/test');
      
      // Verify AbortController signal was passed to fetch
      expect(httpClientMockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          signal: expect.any(Object)
        })
      );
    });

    it('should call clearTimeout on successful request', async () => {
      const client = new HTTPClient(
        { maxRetries: 1, delay: 100, backoffMultiplier: 2, maxDelay: 5000 },
        5000
      );
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      httpClientMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      await client.request('https://api.example.com/success');
      
      // clearTimeout should be called to cleanup timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('HTTP Error Handling - Status Codes', () => {
    it('should throw HTTPError for 4xx client errors', async () => {
      const client = new HTTPClient({ maxRetries: 1, delay: 100, backoffMultiplier: 2, maxDelay: 5000 });
      
      httpClientMockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' })
      });
      
      await expect(client.request('https://api.example.com/notfound')).rejects.toThrow(HTTPError);
      
      // Second call to verify error details
      try {
        await client.request('https://api.example.com/notfound');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.body).toEqual({ error: 'Resource not found' });
      }
    });

    it('should throw HTTPError for 5xx server errors', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient({ maxRetries: 2, delay: 10, backoffMultiplier: 2, maxDelay: 5000 });
      
      httpClientMockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      });
      
      const requestPromise = client.request('https://api.example.com/servererror').catch((error: Error) => error);
      
      // Advance timers to process retries
      await jest.runAllTimersAsync();
      
      const error = await requestPromise;
      expect(error).toBeInstanceOf(HTTPError);
    });

    it('should include status code and body in HTTPError', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient({ maxRetries: 1, delay: 10, backoffMultiplier: 2, maxDelay: 5000 });
      
      httpClientMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid parameters', details: { field: 'email' } })
      });
      
      const requestPromise = client.request('https://api.example.com/badrequest').catch((error: Error) => error);
      
      // Advance timers
      await jest.runAllTimersAsync();
      
      const error = await requestPromise as HTTPError;
      expect(error).toBeInstanceOf(HTTPError);
      expect(error.status).toBe(400);
      expect(error.body).toEqual({ error: 'Invalid parameters', details: { field: 'email' } });
    });

    it('should retry on 5xx errors but not on 4xx errors', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient({ maxRetries: 3, delay: 10, backoffMultiplier: 2, maxDelay: 5000 });
      
      // 4xx errors should NOT trigger retries
      httpClientMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Bad request' })
      });
      
      const requestPromise1 = client.request('https://api.example.com/badrequest').catch((error: Error) => error);
      await jest.runAllTimersAsync();
      
      await requestPromise1; // Just consume the error
      
      expect(httpClientMockFetch).toHaveBeenCalledTimes(1); // No retries for 4xx
      
      httpClientMockFetch.mockClear();
      
      // 5xx errors SHOULD trigger retries
      httpClientMockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Service unavailable' })
      });
      
      const requestPromise2 = client.request('https://api.example.com/unavailable').catch((error: Error) => error);
      await jest.runAllTimersAsync();
      
      await requestPromise2; // Just consume the error
      
      expect(httpClientMockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries for 5xx
    });
  });

  describe('Logging Integration', () => {
    it('should log successful requests', async () => {
      const client = new HTTPClient({ maxRetries: 1, delay: 100, backoffMultiplier: 2, maxDelay: 5000 });
      
      const debugSpy = jest.spyOn(logger, 'debug');
      const infoSpy = jest.spyOn(logger, 'info');
      
      httpClientMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      await client.request('https://api.example.com/log');
      
      // Should log request and response
      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log retry attempts', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient({ maxRetries: 2, delay: 10, backoffMultiplier: 2, maxDelay: 5000 });
      
      const warnSpy = jest.spyOn(logger, 'warn');
      
      httpClientMockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        });
      
      const requestPromise = client.request('https://api.example.com/retrylog');
      
      // Advance timers to process retry
      await jest.runAllTimersAsync();
      
      await requestPromise;
      
      // Should log retry attempts
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should log final errors after max retries', async () => {
      jest.useFakeTimers();
      
      const client = new HTTPClient({ maxRetries: 2, delay: 10, backoffMultiplier: 2, maxDelay: 5000 });
      
      const errorSpy = jest.spyOn(logger, 'error');
      
      httpClientMockFetch.mockRejectedValue(new Error('Persistent error'));
      
      const requestPromise = client.request('https://api.example.com/errorlog').catch((error: Error) => error);
      
      // Advance timers to process all retries
      await jest.runAllTimersAsync();
      
      await requestPromise; // Consume the error
      
      // Should log final error
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('TypeScript Strict Mode Compliance', () => {
    it('should reuse RetryConfig interface from types.ts', () => {
      const { RetryConfig } = require('../../src/types/types');
      
      const config: typeof RetryConfig = {
        maxRetries: 3,
        delay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000
      };
      
      const client = new HTTPClient(config);
      expect(client).toBeDefined();
    });

    it('should not duplicate RetryConfig interface in http-client.ts', () => {
      const fs = require('fs');
      const path = require('path');
      const httpClientPath = path.resolve(__dirname, '../../src/utils/http-client.ts');
      const content = fs.readFileSync(httpClientPath, 'utf8');
      
      // Should NOT contain "interface RetryConfig"
      expect(content).not.toContain('interface RetryConfig');
      
      // Should import RetryConfig from types.ts
      expect(content).toContain("import { RetryConfig } from '../types/types'");
    });
  });
});

