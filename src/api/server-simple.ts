/**
 * Simplified Express.js server for debugging Docker containerization
 */

import express, { Application, Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Create a minimal Express application for testing
 */
export function createSimpleApp(): Application {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Docker containerization test successful!',
    });
  });

  // Simple API status
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      message: 'Test Automation Harness - Minimal Version',
      status: 'running',
      containerized: true,
    });
  });

  // Remove wildcard route handler for debugging
  // app.use('*', (_req: Request, res: Response) => {
  //   res.status(404).json({
  //     error: 'Not found',
  //     message: 'Try /health or /api/status',
  //   });
  // });

  return app;
}

/**
 * Start the simplified server
 */
export async function startSimpleServer(): Promise<void> {
  try {
    const app = createSimpleApp();
    const port = parseInt(process.env['PORT'] || '3000', 10);
    const host = process.env['HOST'] || '0.0.0.0';
    
    const server = app.listen(port, host, () => {
      logger.info('🚀 Simplified Test Automation Harness started');
      logger.info(`📡 Server running on http://${host}:${port}`);
      logger.info(`📊 Health check: http://${host}:${port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start simplified server:', error);
    process.exit(1);
  }
}

export default { createSimpleApp, startSimpleServer };
