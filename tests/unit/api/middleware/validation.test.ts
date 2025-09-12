/**
 * Unit tests for API validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { 
  requestValidationMiddleware,
  CommonSchemas,
  validateApiKey,
  validateContentType
} from '../../../../src/api/middleware/validation';

describe('API Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      url: '/test',
      headers: {
        'content-type': 'application/json'
      },
      body: {},
      query: {},
      params: {},
      get: jest.fn((header: string) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader === 'content-type') {
          return mockRequest.headers?.['content-type'] || mockRequest.headers?.['Content-Type'] || undefined;
        }
        return mockRequest.headers?.[header] || mockRequest.headers?.[header.toLowerCase()] || undefined;
      }) as any
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {}
    };
    mockNext = jest.fn();
  });

  describe('requestValidationMiddleware', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().integer().min(0).max(120).optional()
    });

    it('should pass validation for valid request body', () => {
      mockRequest.body = { name: 'John Doe', age: 30 };
      
      const middleware = requestValidationMiddleware({ body: testSchema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation for valid query parameters', () => {
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10)
      });
      
      mockRequest.query = { page: '2', limit: '20' };
      
      const middleware = requestValidationMiddleware({ query: querySchema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation for valid params', () => {
      const paramsSchema = Joi.object({
        id: Joi.string().uuid().required()
      });
      
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      
      const middleware = requestValidationMiddleware({ params: paramsSchema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation for invalid request body', () => {
      mockRequest.body = { name: '', age: -5 };
      
      const middleware = requestValidationMiddleware({ body: testSchema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation for missing required fields', () => {
      mockRequest.body = { age: 30 };
      
      const middleware = requestValidationMiddleware({ body: testSchema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should apply default values from schema', () => {
      const schemaWithDefaults = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().valid('asc', 'desc').default('desc')
      });
      
      mockRequest.query = {};
      
      const middleware = requestValidationMiddleware({ query: schemaWithDefaults });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as any).validatedQuery).toEqual({
        page: 1,
        limit: 10,
        sort: 'desc'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', () => {
      const middleware = requestValidationMiddleware({ body: testSchema });
      
      // Mock Joi to throw an error
      jest.spyOn(Joi, 'object').mockImplementation(() => {
        throw new Error('Schema error');
      });
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Restore original implementation
      jest.restoreAllMocks();
    });
  });

  describe('CommonSchemas', () => {
    describe('pagination', () => {
      it('should validate valid pagination parameters', () => {
        const validData = { page: '1', limit: '10' };
        const { error } = CommonSchemas.pagination.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should apply default values', () => {
        const { value } = CommonSchemas.pagination.validate({});
        expect(value).toEqual({ page: 1, limit: 10, sort: 'desc', sortBy: 'createdAt' });
      });

      it('should reject invalid page values', () => {
        const { error } = CommonSchemas.pagination.validate({ page: '0' });
        expect(error).toBeDefined();
        expect(error?.details[0]?.message).toContain('must be greater than or equal to 1');
      });

      it('should reject invalid limit values', () => {
        const { error } = CommonSchemas.pagination.validate({ limit: '101' });
        expect(error).toBeDefined();
        expect(error?.details[0]?.message).toContain('must be less than or equal to 100');
      });
    });

    describe('idParam', () => {
      it('should validate valid ID', () => {
        const { error } = CommonSchemas.idParam.validate({ id: 'test-id-123' });
        expect(error).toBeUndefined();
      });

      it('should reject empty ID', () => {
        const { error } = CommonSchemas.idParam.validate({ id: '' });
        expect(error).toBeDefined();
        expect(error?.details[0]?.message).toContain('not allowed to be empty');
      });
    });

    describe('dateRange', () => {
      it('should validate valid date range', () => {
        const validData = {
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-01-31T23:59:59.999Z'
        };
        const { error } = CommonSchemas.dateRange.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should reject invalid date format', () => {
        const { error } = CommonSchemas.dateRange.validate({
          startDate: 'invalid-date'
        });
        expect(error).toBeDefined();
        expect(error?.details[0]?.message).toContain('must be in ISO 8601 date format');
      });
    });

    describe('testExecution', () => {
      it('should validate valid test execution data', () => {
        const validData = {
          name: 'Test Name',
          description: 'Test Description',
          engine: 'playwright',
          config: { url: 'https://example.com' }
        };
        const { error } = CommonSchemas.testExecution.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should reject missing required fields', () => {
        const { error } = CommonSchemas.testExecution.validate({
          description: 'Test Description'
        });
        expect(error).toBeDefined();
        expect(error?.details[0]?.message).toContain('name');
      });
    });
  });

  describe('validateApiKey', () => {
    it('should pass validation with valid API key', () => {
      mockRequest.headers = { 'x-api-key': 'valid-api-key' };
      
      validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation without API key (development mode)', () => {
      mockRequest.headers = {};
      
      validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation with empty API key (development mode)', () => {
      mockRequest.headers = { 'x-api-key': '' };
      
      validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('validateContentType', () => {
    it('should pass validation with valid content type', () => {
      mockRequest.headers = { 'content-type': 'application/json' };
      
      const middleware = validateContentType();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation for GET requests without content type', () => {
      mockRequest.method = 'GET';
      mockRequest.headers = {};
      
      const middleware = validateContentType();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation for POST requests without content type', () => {
      mockRequest.method = 'POST';
      mockRequest.headers = {};
      
      const middleware = validateContentType();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid content type', () => {
      mockRequest.headers = { 'content-type': 'text/plain' };
      
      const middleware = validateContentType();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should accept custom allowed content types', () => {
      mockRequest.headers = { 'content-type': 'application/xml' };
      
      const middleware = validateContentType(['application/json', 'application/xml']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});