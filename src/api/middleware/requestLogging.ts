/**
 * Request logging middleware for the Self-Healing Test Automation Harness API
 * 
 * This middleware logs all incoming requests with timing information,
 * request details, and response status codes.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * Request logging middleware
 * 
 * Logs incoming requests with timing information and response details.
 * Provides structured logging for monitoring and debugging.
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to request object for use in other middleware
  (req as any).requestId = requestId;
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response details
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || '0',
      timestamp: new Date().toISOString(),
    });

    // Call original end method
    return originalEnd(chunk, encoding);
  };

  next();
}

/**
 * Generate a unique request ID
 * 
 * Creates a unique identifier for each request to enable request tracing
 * across the application.
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}
