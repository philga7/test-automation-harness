/**
 * Express.js server setup and configuration for the Self-Healing Test Automation Harness
 * 
 * This module sets up the Express server with proper middleware, error handling,
 * and API route configuration.
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Import route handlers
import testExecutionRoutes from './routes/testExecution';
import resultsRoutes from './routes/results';
import healingRoutes from './routes/healing';
import enginesRoutes from './routes/engines';

// Import middleware
import { errorHandlerMiddleware } from './middleware/errorHandler';
import { requestLoggingMiddleware } from './middleware/requestLogging';

/**
 * API Server Configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string | string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  enableSwagger: boolean;
  enableMetrics: boolean;
}

/**
 * Default server configuration
 */
const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  host: process.env['HOST'] || '0.0.0.0',
  corsOrigin: process.env['CORS_ORIGIN'] || '*',
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
  rateLimitMax: parseInt(process.env['RATE_LIMIT_MAX'] || '100', 10), // 100 requests per window
  enableSwagger: process.env['ENABLE_SWAGGER'] === 'true',
  enableMetrics: process.env['ENABLE_METRICS'] === 'true',
};

/**
 * Create and configure Express application
 */
export function createApp(config: ServerConfig = DEFAULT_CONFIG): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Compression middleware
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Body parsing middleware
  app.use(express.json({ 
    limit: '10mb',
    strict: true,
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));

  // Request logging middleware
  app.use(requestLoggingMiddleware);

  // Health check endpoint (before API routes)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
    });
  });

  // API routes
  app.use('/api/v1/tests', testExecutionRoutes);
  app.use('/api/v1/results', resultsRoutes);
  app.use('/api/v1/healing', healingRoutes);
  app.use('/api/v1/engines', enginesRoutes);

  // API status endpoint
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      message: 'Self-Healing Test Automation Harness API',
      status: 'running',
      version: '1.0.0',
      features: {
        testOrchestration: 'available',
        selfHealing: 'available',
        unifiedReporting: 'available',
        pluginArchitecture: 'available',
      },
      endpoints: {
        tests: '/api/v1/tests',
        results: '/api/v1/results',
        healing: '/api/v1/healing',
        engines: '/api/v1/engines',
        health: '/health',
        docs: config.enableSwagger ? '/api/docs' : 'disabled',
      },
    });
  });

  // Swagger documentation (if enabled)
  if (config.enableSwagger) {
    // TODO: Add Swagger setup
    app.get('/api/docs', (_req: Request, res: Response) => {
      res.json({
        message: 'API documentation will be available here',
        swagger: 'coming soon',
      });
    });
  }

  // 404 handler for API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      message: `API endpoint not found: ${req.originalUrl}`,
      availableEndpoints: [
        '/api/v1/tests',
        '/api/v1/results',
        '/api/v1/healing',
        '/api/v1/engines',
        '/api/status',
        '/health',
      ],
    });
  });

  // Global error handling middleware
  app.use(errorHandlerMiddleware);

  // 404 handler for non-API routes
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      message: `Route not found: ${req.originalUrl}`,
      suggestion: 'Try /api/status for API information or /health for system status',
    });
  });

  return app;
}

/**
 * Start the server
 */
export async function startServer(config: ServerConfig = DEFAULT_CONFIG): Promise<void> {
  try {
    const app = createApp(config);
    
    const server = app.listen(config.port, config.host, () => {
      logger.info(`🚀 Self-Healing Test Automation Harness API started`);
      logger.info(`📡 Server running on http://${config.host}:${config.port}`);
      logger.info(`📊 Health check: http://${config.host}:${config.port}/health`);
      logger.info(`🔧 API status: http://${config.host}:${config.port}/api/status`);
      
      if (config.enableSwagger) {
        logger.info(`📚 API docs: http://${config.host}:${config.port}/api/docs`);
      }
      
      logger.info(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
      logger.info(`🔒 Rate limit: ${config.rateLimitMax} requests per ${config.rateLimitWindowMs / 1000}s`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('Server closed successfully');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    if (process.env['NODE_ENV'] !== 'test') {
      process.exit(1);
    }
    throw error; // Re-throw in test mode
  }
}

export default { createApp, startServer, DEFAULT_CONFIG };
