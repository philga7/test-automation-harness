/**
 * Request validation middleware for the Self-Healing Test Automation Harness API
 * 
 * This middleware provides request validation using Joi schemas,
 * ensuring all incoming requests meet the expected format and constraints.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../../utils/logger';
import { ValidationError } from './errorHandler';

/**
 * Validation options
 */
export interface ValidationOptions {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

/**
 * Request validation middleware factory
 * 
 * Creates middleware that validates request body, query parameters, params, and headers
 * according to the provided Joi schemas.
 */
export function requestValidationMiddleware(options: ValidationOptions) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId || 'unknown';
    const errors: string[] = [];

    try {
      // Validate request body
      if (options.body) {
        const { error, value } = options.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false,
        });

        if (error) {
          errors.push(`Body validation failed: ${error.details.map(d => d.message).join(', ')}`);
        } else {
          req.body = value; // Use validated and sanitized body
        }
      }

      // Validate query parameters
      if (options.query) {
        const { error, value } = options.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false,
        });

        if (error) {
          errors.push(`Query validation failed: ${error.details.map(d => d.message).join(', ')}`);
        } else {
          req.query = value; // Use validated and sanitized query
        }
      }

      // Validate route parameters
      if (options.params) {
        const { error, value } = options.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false,
        });

        if (error) {
          errors.push(`Params validation failed: ${error.details.map(d => d.message).join(', ')}`);
        } else {
          req.params = value; // Use validated and sanitized params
        }
      }

      // Validate headers
      if (options.headers) {
        const { error, value } = options.headers.validate(req.headers, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: true, // Allow unknown headers
        });

        if (error) {
          errors.push(`Headers validation failed: ${error.details.map(d => d.message).join(', ')}`);
        } else {
          // Don't replace all headers, just update validated ones
          Object.assign(req.headers, value);
        }
      }

      // If there are validation errors, throw a ValidationError
      if (errors.length > 0) {
        throw new ValidationError(
          errors.join('; '),
          undefined,
          undefined,
          requestId
        );
      }

      // Log successful validation
      logger.debug('Request validation successful', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        validatedFields: Object.keys(options),
      });

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error);
      } else {
        logger.error('Validation middleware error', {
          requestId,
          error: (error as Error).message,
          stack: (error as Error).stack,
        });
        next(new ValidationError('Validation failed', undefined, undefined, requestId));
      }
    }
  };
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).custom((value, helpers) => {
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          return helpers.error('any.invalid');
        }
        return parsed;
      }
      return value;
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).custom((value, helpers) => {
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          return helpers.error('any.invalid');
        }
        return parsed;
      }
      return value;
    }),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string().default('createdAt'),
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: Joi.string().required().min(1).max(100),
  }),

  // Date range schema
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),

  // Test execution schema
  testExecution: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    engine: Joi.string().required().min(1).max(100),
    config: Joi.object().required(),
    options: Joi.object({
      timeout: Joi.number().integer().min(1000).max(300000).default(30000),
      retries: Joi.number().integer().min(0).max(5).default(0),
      parallel: Joi.boolean().default(false),
      healing: Joi.boolean().default(true),
    }).optional(),
  }),

  // Test result query schema
  testResultQuery: Joi.object({
    status: Joi.string().valid('passed', 'failed', 'skipped', 'running').optional(),
    engine: Joi.string().optional(),
    testName: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    includeArtifacts: Joi.boolean().default(false),
    includeHealingAttempts: Joi.boolean().default(false),
  }),

  // Healing attempt schema
  healingAttempt: Joi.object({
    testId: Joi.string().required().min(1).max(100),
    strategy: Joi.string().required().min(1).max(100),
    confidence: Joi.number().min(0).max(1).required(),
    description: Joi.string().optional().max(500),
    metadata: Joi.object().optional(),
  }),

  // Engine configuration schema
  engineConfig: Joi.object({
    name: Joi.string().required().min(1).max(100),
    version: Joi.string().required().min(1).max(50),
    config: Joi.object().required(),
    enabled: Joi.boolean().default(true),
  }),
};

/**
 * Validation helper functions
 */
export const ValidationHelpers = {
  /**
   * Validate UUID format
   */
  uuid: Joi.string().uuid({ version: 'uuidv4' }),

  /**
   * Validate email format
   */
  email: Joi.string().email({ tlds: { allow: false } }),

  /**
   * Validate URL format
   */
  url: Joi.string().uri({ scheme: ['http', 'https'] }),

  /**
   * Validate JSON string
   */
  jsonString: Joi.string().custom((value, helpers) => {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return helpers.error('any.invalid');
    }
  }),

  /**
   * Validate positive integer
   */
  positiveInteger: Joi.number().integer().positive(),

  /**
   * Validate non-negative integer
   */
  nonNegativeInteger: Joi.number().integer().min(0),

  /**
   * Validate percentage (0-100)
   */
  percentage: Joi.number().min(0).max(100),

  /**
   * Validate confidence score (0-1)
   */
  confidence: Joi.number().min(0).max(1),

  /**
   * Validate test status
   */
  testStatus: Joi.string().valid('passed', 'failed', 'skipped', 'running', 'pending'),

  /**
   * Validate engine type
   */
  engineType: Joi.string().valid('playwright', 'jest', 'vitest', 'k6', 'owasp-zap', 'custom'),

  /**
   * Validate healing strategy type
   */
  healingStrategy: Joi.string().valid(
    'css-fallback',
    'id-fallback', 
    'xpath-fallback',
    'neighbor-analysis',
    'simple-locator',
    'custom'
  ),
};

/**
 * Middleware to validate API key (placeholder for future authentication)
 */
export function validateApiKey(req: Request, _res: Response, next: NextFunction): void {
  // TODO: Implement API key validation when authentication is added
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    // For now, allow requests without API key
    // In production, this should require authentication
    logger.debug('Request without API key (allowed in development)');
  } else {
    logger.debug('Request with API key');
  }
  
  next();
}

/**
 * Middleware to validate content type
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');
    
    if (req.method === 'GET' || req.method === 'DELETE') {
      // GET and DELETE requests don't need content type validation
      next();
      return;
    }
    
    if (!contentType) {
      return next(new ValidationError('Content-Type header is required'));
    }
    
    const isValidType = allowedTypes.some(type => contentType.includes(type));
    
    if (!isValidType) {
      return next(new ValidationError(
        `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`
      ));
    }
    
    next();
  };
}
