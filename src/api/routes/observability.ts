/**
 * Observability API routes for the Self-Healing Test Automation Harness
 * 
 * This module provides REST API endpoints for accessing observability data
 * including metrics, logs, health status, and reports.
 */

import { Router, Request, Response } from 'express';
import { createObservabilityManager } from '../../observability';
import { asyncHandler, createSuccessResponse } from '../middleware/errorHandler';
import { requestValidationMiddleware } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import Joi from 'joi';
import { logger } from '../../utils/logger';

const router = Router();

// Initialize observability manager
let observabilityManager: any = null;

/**
 * Initialize observability manager if not already initialized
 */
async function initializeObservabilityManager(): Promise<any> {
  if (!observabilityManager) {
    observabilityManager = await createObservabilityManager({
      observability: {
        logging: {
          enabled: true,
          level: 'info',
          format: 'json',
          file: undefined,
          maxFileSize: 10 * 1024 * 1024,
          maxFiles: 5,
          includeStackTrace: true,
        },
        metrics: {
          enabled: true,
          interval: 30000,
          exportFormat: 'prometheus',
          retention: 7 * 24 * 60 * 60 * 1000,
        },
        tracing: {
          enabled: true,
          sampleRate: 0.1,
          serviceName: 'test-automation-harness',
        },
        health: {
          enabled: false, // Disable for API tests to avoid timers
          interval: 30000,
          timeout: 5000,
        },
        reporting: {
          enabled: true,
          schedule: '0 0 * * *',
          formats: ['json', 'html'],
          outputDir: './reports',
          retention: 30 * 24 * 60 * 60 * 1000,
        },
      },
    });
  }
  return observabilityManager;
}

/**
 * GET /api/v1/observability/health
 * Get system health status
 */
router.get('/health',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    
    logger.debug('System health status requested', { requestId });

    try {
      const manager = await initializeObservabilityManager();
      const health = manager.getHealthMonitor().getSystemHealth();

      res.json(createSuccessResponse({
        systemHealth: health,
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.error('Failed to get system health', {
        requestId,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to get system health',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * GET /api/v1/observability/metrics
 * Get system metrics
 */
router.get('/metrics',
  requestValidationMiddleware({
    query: Joi.object({
      name: Joi.string().optional(),
      format: Joi.string().valid('json', 'prometheus').default('json'),
    }),
  }),
         asyncHandler(async (req: Request, res: Response) => {
           const requestId = (req as any).requestId;
           const validatedQuery = (req as any).validatedQuery || req.query;
           const name = validatedQuery['name'] as string;
           const format = validatedQuery['format'] as string || 'json';

    logger.debug('System metrics requested', { requestId, name, format });

    try {
      const manager = await initializeObservabilityManager();
      const metricsCollector = manager.getMetricsCollector();

      let metrics;
      if (name) {
        metrics = metricsCollector.getMetrics(name);
      } else {
        metrics = metricsCollector.getAllMetrics();
      }

      if (format === 'prometheus') {
        // Set appropriate content type for Prometheus format
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metricsCollector.getPrometheusMetrics());
      } else {
        res.json(createSuccessResponse({
          metrics,
          timestamp: new Date().toISOString(),
        }));
      }

    } catch (error) {
      logger.error('Failed to get system metrics', {
        requestId,
        name,
        format,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to get system metrics',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * GET /api/v1/observability/logs
 * Get system logs
 */
router.get('/logs',
  requestValidationMiddleware({
    query: Joi.object({
      level: Joi.string().valid('debug', 'info', 'warn', 'error').optional(),
      limit: Joi.number().integer().min(1).max(1000).default(100),
      offset: Joi.number().integer().min(0).default(0),
    }),
  }),
         asyncHandler(async (req: Request, res: Response) => {
           const requestId = (req as any).requestId;
           const validatedQuery = (req as any).validatedQuery || req.query;
           const level = validatedQuery['level'] as string;
           const limit = parseInt(validatedQuery['limit'] as string || '100', 10);
           const offset = parseInt(validatedQuery['offset'] as string || '0', 10);

    logger.debug('System logs requested', { requestId, level, limit, offset });

    try {
      const manager = await initializeObservabilityManager();
      const loggingService = manager.getLoggingService();
      const logStats = loggingService.getLogStats();

      // For now, return log statistics since we don't have a log retrieval method
      // In a real implementation, you would read from log files
      res.json(createSuccessResponse({
        logStats,
        filters: {
          level,
          limit,
          offset,
        },
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.error('Failed to get system logs', {
        requestId,
        level,
        limit,
        offset,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to get system logs',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * POST /api/v1/observability/logs
 * Create a new log entry
 */
router.post('/logs',
  requestValidationMiddleware({
    body: Joi.object({
      level: Joi.string().valid('debug', 'info', 'warn', 'error').required(),
      message: Joi.string().required(),
      metadata: Joi.object().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const { level, message, metadata } = req.body;

    logger.debug('New log entry requested', { requestId, level, message });

    try {
      const manager = await initializeObservabilityManager();
      manager.log(level, message, metadata || {});

      res.status(201).json(createSuccessResponse({
        message: 'Log entry created successfully',
        level,
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.error('Failed to create log entry', {
        requestId,
        level,
        message,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to create log entry',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * GET /api/v1/observability/reports
 * Get available reports
 */
router.get('/reports',
  requestValidationMiddleware({
    query: Joi.object({
      type: Joi.string().optional(),
      limit: Joi.number().integer().min(1).max(100).default(10),
    }),
  }),
         asyncHandler(async (req: Request, res: Response) => {
           const requestId = (req as any).requestId;
           const validatedQuery = (req as any).validatedQuery || req.query;
           const type = validatedQuery['type'] as string;
           const limit = parseInt(validatedQuery['limit'] as string || '10', 10);

    logger.debug('Available reports requested', { requestId, type, limit });

    try {
      // For now, return a mock list of available reports
      // In a real implementation, you would scan the reports directory
      const reports = [
        {
          id: 'system-health-report',
          type: 'health',
          title: 'System Health Report',
          description: 'Comprehensive system health analysis',
          generatedAt: new Date(Date.now() - 3600000), // 1 hour ago
          size: 1024,
        },
        {
          id: 'performance-metrics-report',
          type: 'metrics',
          title: 'Performance Metrics Report',
          description: 'System performance metrics analysis',
          generatedAt: new Date(Date.now() - 7200000), // 2 hours ago
          size: 2048,
        },
      ];

      const filteredReports = type 
        ? reports.filter(report => report.type === type)
        : reports;

      res.json(createSuccessResponse({
        reports: filteredReports.slice(0, limit),
        total: filteredReports.length,
        filters: {
          type,
          limit,
        },
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.error('Failed to get available reports', {
        requestId,
        type,
        limit,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to get available reports',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * POST /api/v1/observability/reports
 * Generate a new report
 */
router.post('/reports',
  requestValidationMiddleware({
    body: Joi.object({
      type: Joi.string().valid('health', 'metrics', 'performance', 'security').required(),
      title: Joi.string().required(),
      description: Joi.string().optional(),
      format: Joi.string().valid('json', 'html', 'pdf').default('json'),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const { type, title, description, format } = req.body;

    logger.debug('New report generation requested', { requestId, type, title, format });

    try {
      const manager = await initializeObservabilityManager();

      // Generate the report
      const report = await manager.getReportGenerator().generateReport({
        type,
        title,
        description: description || `Generated ${type} report`,
        format,
        data: {
          summary: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
          metrics: manager.getMetricsCollector().getAllMetrics(),
          health: manager.getHealthMonitor().getSystemHealth(),
        },
      });

      res.status(201).json(createSuccessResponse({
        report,
        message: 'Report generated successfully',
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.error('Failed to generate report', {
        requestId,
        type,
        title,
        format,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to generate report',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * GET /api/v1/observability/reports/:id
 * Get a specific report
 */
router.get('/reports/:id',
  requestValidationMiddleware({
    params: Joi.object({
      id: Joi.string().required(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const reportId = req.params['id'];

    logger.debug('Specific report requested', { requestId, reportId });

    try {
      // For now, return a mock report
      // In a real implementation, you would read the actual report file
      const report = {
        id: reportId,
        type: 'health',
        title: 'System Health Report',
        description: 'Comprehensive system health analysis',
        generatedAt: new Date(Date.now() - 3600000),
        data: {
          summary: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
          health: {
            status: 'healthy',
            components: [
              {
                name: 'api-server',
                status: 'healthy',
                message: 'API server is running normally',
              },
            ],
          },
        },
      };

      res.json(createSuccessResponse({
        report,
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.error('Failed to get report', {
        requestId,
        reportId,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to get report',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * GET /api/v1/observability/summary
 * Get observability system summary
 */
router.get('/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;

    logger.debug('Observability summary requested', { requestId });

    try {
      const manager = await initializeObservabilityManager();
      const summary = manager.getObservabilitySummary();

      res.json(createSuccessResponse({
        summary,
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.error('Failed to get observability summary', {
        requestId,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to get observability summary',
        500,
        true,
        requestId
      );
    }
  })
);

export default router;
