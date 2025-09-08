/**
 * Error handling middleware for the Self-Healing Test Automation Harness API
 * 
 * This middleware provides centralized error handling with proper HTTP status codes,
 * error logging, and consistent error response formatting.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly requestId: string | undefined;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiError {
  public readonly field: string | undefined;
  public readonly value?: any;

  constructor(
    message: string,
    field?: string,
    value?: any,
    requestId?: string
  ) {
    super(message, 400, true, requestId);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ApiError {
  constructor(resource: string, requestId?: string) {
    super(`${resource} not found`, 404, true, requestId);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends ApiError {
  constructor(message: string, requestId?: string) {
    super(message, 409, true, requestId);
    this.name = 'ConflictError';
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', requestId?: string) {
    super(message, 401, true, requestId);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', requestId?: string) {
    super(message, 403, true, requestId);
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', requestId?: string) {
    super(message, 429, true, requestId);
    this.name = 'RateLimitError';
  }
}

/**
 * Global error handling middleware
 * 
 * This middleware catches all errors and formats them into consistent
 * API responses with appropriate HTTP status codes.
 */
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as any).requestId || 'unknown';
  
  // Log the error
  logger.error('API Error occurred', {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      query: req.query,
      params: req.params,
    },
    timestamp: new Date().toISOString(),
  });

  // Handle different types of errors
  if (error instanceof ApiError) {
    // Handle custom API errors
    res.status(error.statusCode).json({
      success: false,
      error: {
        type: error.name,
        message: error.message,
        statusCode: error.statusCode,
        requestId,
        ...(error instanceof ValidationError && error.field && {
          field: error.field,
          value: error.value,
        }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === 'ValidationError') {
    // Handle Joi or other validation errors
    res.status(400).json({
      success: false,
      error: {
        type: 'ValidationError',
        message: 'Request validation failed',
        statusCode: 400,
        requestId,
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    // Handle JSON parsing errors
    res.status(400).json({
      success: false,
      error: {
        type: 'SyntaxError',
        message: 'Invalid JSON in request body',
        statusCode: 400,
        requestId,
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === 'MulterError') {
    // Handle file upload errors
    res.status(400).json({
      success: false,
      error: {
        type: 'FileUploadError',
        message: 'File upload failed',
        statusCode: 400,
        requestId,
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    // Handle unexpected errors
    const isDevelopment = process.env['NODE_ENV'] === 'development';
    
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalServerError',
        message: isDevelopment ? error.message : 'Internal server error',
        statusCode: 500,
        requestId,
        ...(isDevelopment && {
          stack: error.stack,
        }),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to catch and forward errors to the error handler middleware.
 * This eliminates the need for try-catch blocks in every route handler.
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(
  data: any,
  message?: string,
  statusCode: number = 200
) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    statusCode,
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  requestId?: string,
  details?: any
) {
  return {
    success: false,
    error: {
      message,
      statusCode,
      requestId,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };
}
