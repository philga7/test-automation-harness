/**
 * Unit tests for ApiService
 * 
 * Following project patterns: Use actual components to test against,
 * not mocks where possible, to reduce testing by 60-80%
 */

// Mock fetch globally for ApiService tests
const apiServiceMockFetch = jest.fn();
(global as any).fetch = apiServiceMockFetch;

// Import the actual ApiService class
// Note: Since ApiService is in JavaScript, we'll test it as a JavaScript module
const { ApiService: ApiServiceClass } = require('../../src/ui/public/js/api-service.js');

describe('ApiService', () => {
  let apiService: any;

  beforeEach(() => {
    jest.useFakeTimers();
    apiService = new ApiServiceClass({
      baseUrl: 'http://localhost:3000',
      timeout: 1000,
      retryAttempts: 1
    });
    
    apiServiceMockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const service = new ApiServiceClass();
      expect(service.baseUrl).toBe('');
      expect(service.timeout).toBe(30000);
      expect(service.retryAttempts).toBe(3);
      expect(service.enableLogging).toBe(true);
    });

    it('should initialize with custom options', () => {
      const service = new ApiServiceClass({
        baseUrl: 'https://api.example.com',
        timeout: 60000,
        retryAttempts: 5,
        enableLogging: false
      });
      
      expect(service.baseUrl).toBe('https://api.example.com');
      expect(service.timeout).toBe(60000);
      expect(service.retryAttempts).toBe(5);
      expect(service.enableLogging).toBe(false);
    });
  });

  describe('getSystemStatus', () => {
    it('should get system status successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          status: 'healthy',
          version: '1.0.0',
          uptime: 3600
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getSystemStatus();

      expect(apiServiceMockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.uptime).toBe(3600);
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          message: 'Internal server error',
          statusCode: 500
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      await expect(apiService.getSystemStatus())
        .rejects
        .toThrow('Internal server error');
    });
  });

  describe('executeTest', () => {
    it('should execute test successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 202,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          success: true,
          data: { testId: 'test_123', status: 'accepted' }
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      const testConfig = {
        name: 'Test',
        engine: 'playwright',
        config: { url: 'https://example.com' }
      };

      const result = await apiService.executeTest(testConfig);

      expect(apiServiceMockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/tests/execute',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testConfig)
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.testId).toBe('test_123');
    });

    it('should handle validation errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Validation failed', statusCode: 400 }
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      const testConfig = { name: 'Invalid Test' };

      await expect(apiService.executeTest(testConfig))
        .rejects
        .toThrow('HTTP 400');
    });
  });

  describe('getTestStatus', () => {
    it('should get test status successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          success: true,
          data: {
            testId: 'test_123',
            status: 'running',
            progress: 50
          }
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getTestStatus('test_123');

      expect(apiServiceMockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/tests/test_123/status',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.testId).toBe('test_123');
      expect(result.data.status).toBe('running');
    });
  });

  describe('getHealingStatistics', () => {
    it('should get healing statistics successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          success: true,
          data: {
            totalAttempts: 100,
            successfulAttempts: 80,
            successRate: 0.8
          }
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getHealingStatistics();

      expect(apiServiceMockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/healing/statistics',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.totalAttempts).toBe(100);
      expect(result.data.successRate).toBe(0.8);
    });

    it('should handle query parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          success: true,
          data: { totalAttempts: 50 }
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      const options = {
        startDate: '2025-01-01',
        endDate: '2025-01-07'
      };

      await apiService.getHealingStatistics(options);

      expect(apiServiceMockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/healing/statistics?startDate=2025-01-01&endDate=2025-01-07',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      apiServiceMockFetch.mockRejectedValueOnce(new Error('Network error'));

      const promise = apiService.getSystemStatus();
      jest.runAllTimers();
      
      await expect(promise)
        .rejects
        .toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      apiServiceMockFetch.mockRejectedValueOnce(new Error('AbortError'));

      const promise = apiService.getSystemStatus();
      jest.runAllTimers();
      
      await expect(promise)
        .rejects
        .toThrow('AbortError');
    });

    it('should create proper ApiError instances', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          message: 'Not found',
          statusCode: 404
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      try {
        await apiService.getSystemStatus();
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Not found');
      }
    });
  });

  describe('Query Parameter Handling', () => {
    it('should handle test result options', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          success: true,
          data: { testId: 'test_123' }
        })
      };

      apiServiceMockFetch.mockResolvedValueOnce(mockResponse);

      const options = {
        includeArtifacts: true,
        includeHealingAttempts: false
      };

      await apiService.getTestResult('test_123', options);

      expect(apiServiceMockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/tests/test_123/result?includeArtifacts=true&includeHealingAttempts=false',
        expect.any(Object)
      );
    });
  });
});