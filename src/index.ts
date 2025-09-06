#!/usr/bin/env node

/**
 * Self-Healing Test Automation Harness
 * Main application entry point
 */

import express from 'express';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env['PORT'] || 3000;

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

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Self-Healing Test Automation Harness started on port ${PORT}`);
  logger.info(`📊 Health check available at: http://localhost:${PORT}/health`);
  logger.info(`🔧 API status at: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
export { server };
