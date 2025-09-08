/**
 * Unit tests for API error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { 
  ApiError, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  errorHandlerMiddleware,
  createSuccessResponse,
  createErrorResponse,
  asyncHandler
} from '../../../../src/api/middleware/errorHandler';

describe('API Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      headers: {},
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {}
    };
    mockNext = jest.fn();
  });

  describe('ApiError', () => {
    it('should create ApiError with default values', () => {
      const error = new ApiError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.requestId).toBeUndefined();
      expect(error.name).toBe('ApiError');
    });

    it('should create ApiError with custom values', () => {
      const error = new ApiError('Custom error', 400, false, 'req_123');
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(false);
      expect(error.requestId).toBe('req_123');
    });

    it('should maintain proper stack trace', () => {
      const error = new ApiError('Stack test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with default values', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.field).toBeUndefined();
      expect(error.value).toBeUndefined();
      expect(error.name).toBe('ValidationError');
    });

    it('should create ValidationError with field and value', () => {
      const error = new ValidationError('Invalid field', 'email', 'invalid@', 'req_456');
      
      expect(error.message).toBe('Invalid field');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
      expect(error.value).toBe('invalid@');
      expect(error.requestId).toBe('req_456');
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError('Resource');
      
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create NotFoundError with custom message', () => {
      const error = new NotFoundError('User not found', 'req_789');
      
      expect(error.message).toBe('User not found not found');
      expect(error.statusCode).toBe(404);
      expect(error.requestId).toBe('req_789');
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with default message', () => {
      const error = new ConflictError('Resource conflict');
      
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
    });

    it('should create ConflictError with custom message', () => {
      const error = new ConflictError('Email already exists', 'req_101');
      
      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.requestId).toBe('req_101');
    });
  });

  describe('errorHandlerMiddleware', () => {
    it('should handle ApiError correctly', () => {
      const error = new ApiError('Test error', 400, true, 'req_123');
      
      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'ApiError',
          message: 'Test error',
          statusCode: 400,
          requestId: 'unknown'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', 'email', 'invalid@');
      
      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid input',
          statusCode: 400,
          requestId: 'unknown',
          field: 'email',
          value: 'invalid@'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle generic Error correctly', () => {
      const error = new Error('Generic error');
      
      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'InternalServerError',
          message: 'Internal server error',
          statusCode: 500,
          requestId: 'unknown'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle unknown error types', () => {
      const error = 'String error';
      
      errorHandlerMiddleware(error as any, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'InternalServerError',
          message: 'Internal server error',
          statusCode: 500,
          requestId: 'unknown'
        },
        timestamp: expect.any(String)
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      
      const error = new Error('Development error');
      
      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String)
          })
        })
      );
      
      process.env['NODE_ENV'] = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';
      
      const error = new Error('Production error');
      
      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.not.objectContaining({
            stack: expect.anything()
          })
        })
      );
      
      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'test' };
      const response = createSuccessResponse(data, 'Operation successful', 200);
      
      expect(response).toEqual({
        success: true,
        message: 'Operation successful',
        data: data,
        timestamp: expect.any(String),
        statusCode: 200
      });
    });

    it('should create success response with default values', () => {
      const response = createSuccessResponse({});
      
      expect(response).toEqual({
        success: true,
        message: undefined,
        data: {},
        timestamp: expect.any(String),
        statusCode: 200
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with message', () => {
      const response = createErrorResponse('Test error', 400, 'req_123');
      
      expect(response).toEqual({
        success: false,
        error: {
          message: 'Test error',
          statusCode: 400,
          requestId: 'req_123'
        },
        timestamp: expect.any(String)
      });
    });

    it('should create error response with default values', () => {
      const response = createErrorResponse('Generic error');
      
      expect(response).toEqual({
        success: false,
        error: {
          message: 'Generic error',
          statusCode: 500
        },
        timestamp: expect.any(String)
      });
    });

    it('should create error response with details', () => {
      const response = createErrorResponse('Validation failed', 400, 'req_123', 'Field is required');
      
      expect(response).toEqual({
        success: false,
        error: {
          message: 'Validation failed',
          statusCode: 400,
          requestId: 'req_123',
          details: 'Field is required'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = asyncHandler(asyncFn);
      
      await handler(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async function that throws error', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);
      
      await handler(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle async function that throws ApiError', async () => {
      const error = new ApiError('API error', 400);
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);
      
      await handler(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
