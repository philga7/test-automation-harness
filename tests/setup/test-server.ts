/**
 * Test server setup for integration tests
 */

import express from 'express';
import { logger } from '../../src/utils/logger';

// Create a test app without auto-starting the server
const createTestApp = () => {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0'
    });
  });

  // API routes placeholder
  app.get('/api/status', (_req, res) => {
    res.json({
      message: 'Self-Healing Test Automation Harness API',
      status: 'running',
      features: {
        testOrchestration: 'planned',
        selfHealing: 'planned',
        unifiedReporting: 'planned'
      }
    });
  });

  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ 
      error: 'Not found',
      path: req.originalUrl 
    });
  });

  return app;
};

export default createTestApp;
