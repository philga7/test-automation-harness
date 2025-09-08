/**
 * Healing statistics and management API routes for the Self-Healing Test Automation Harness
 * 
 * This module provides REST API endpoints for managing healing strategies,
 * viewing healing statistics, and configuring healing behavior.
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { logger } from '../../utils/logger';
import { 
  requestValidationMiddleware, 
  CommonSchemas
} from '../middleware/validation';
import { 
  asyncHandler, 
  createSuccessResponse,
  ApiError,
  NotFoundError
} from '../middleware/errorHandler';
import { HealingResult } from '../../types';

// Extended interface for API usage
interface ApiHealingResult extends HealingResult {
  testId: string;
  strategy: string;
  timestamp: Date;
  changes?: {
    before: string;
    after: string;
    type: string;
  };
}

// TODO: Import actual services when they're implemented
// import { HealingEngine } from '../../healing/HealingEngine';
// import { HealingStrategyRegistry } from '../../healing/HealingStrategyRegistry';

const router = Router();

/**
 * In-memory storage for demo purposes
 * TODO: Replace with actual database/service integration
 */
const healingAttempts = new Map<string, ApiHealingResult>();
const healingStrategies = new Map<string, any>();

/**
 * GET /api/v1/healing/strategies
 * Get available healing strategies
 */
router.get('/strategies',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const page = parseInt(req.query['page'] as string || '1', 10);
    const limit = parseInt(req.query['limit'] as string || '10', 10);
    const sort = req.query['sort'] as string || 'desc';
    const sortBy = req.query['sortBy'] as string || 'createdAt';
    const failureType = req.query['failureType'] as string;
    const enabled = req.query['enabled'] === 'true';

    logger.debug('Healing strategies requested', {
      requestId,
      filters: { failureType, enabled },
      pagination: { page, limit, sort, sortBy },
    });

    try {
      // TODO: Replace with actual strategy registry
      // const strategies = await healingStrategyRegistry.getStrategies({
      //   failureType,
      //   enabled,
      //   pagination: { page, limit, sort, sortBy },
      // });

      // Demo implementation
      const allStrategies = [
        {
          id: 'css-fallback',
          name: 'CSS Fallback Strategy',
          description: 'Attempts to locate elements using alternative CSS selectors',
          version: '1.0.0',
          failureTypes: ['element-not-found', 'element-not-visible'],
          enabled: true,
          confidence: 0.8,
          avgSuccessRate: 0.75,
          avgExecutionTime: 150,
          lastUsed: new Date(),
          usageCount: 1250,
        },
        {
          id: 'id-fallback',
          name: 'ID Fallback Strategy',
          description: 'Falls back to element ID when other selectors fail',
          version: '1.0.0',
          failureTypes: ['element-not-found'],
          enabled: true,
          confidence: 0.9,
          avgSuccessRate: 0.85,
          avgExecutionTime: 100,
          lastUsed: new Date(),
          usageCount: 2100,
        },
        {
          id: 'xpath-fallback',
          name: 'XPath Fallback Strategy',
          description: 'Uses XPath expressions as a fallback locator strategy',
          version: '1.0.0',
          failureTypes: ['element-not-found', 'element-not-visible'],
          enabled: true,
          confidence: 0.7,
          avgSuccessRate: 0.65,
          avgExecutionTime: 200,
          lastUsed: new Date(),
          usageCount: 850,
        },
        {
          id: 'neighbor-analysis',
          name: 'Neighbor Analysis Strategy',
          description: 'Analyzes nearby elements to locate the target element',
          version: '1.0.0',
          failureTypes: ['element-not-found', 'element-not-visible'],
          enabled: true,
          confidence: 0.6,
          avgSuccessRate: 0.55,
          avgExecutionTime: 300,
          lastUsed: new Date(),
          usageCount: 450,
        },
        {
          id: 'simple-locator',
          name: 'Simple Locator Strategy',
          description: 'Simplifies complex selectors to basic locators',
          version: '1.0.0',
          failureTypes: ['element-not-found'],
          enabled: true,
          confidence: 0.5,
          avgSuccessRate: 0.45,
          avgExecutionTime: 80,
          lastUsed: new Date(),
          usageCount: 320,
        },
      ];

      // Apply filters
      let filteredStrategies = allStrategies;
      
      if (failureType) {
        filteredStrategies = filteredStrategies.filter(s => 
          s.failureTypes.includes(failureType as string)
        );
      }
      
      if (enabled !== undefined) {
        filteredStrategies = filteredStrategies.filter(s => s.enabled === enabled);
      }

      // Apply sorting
      filteredStrategies.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a];
        const bValue = b[sortBy as keyof typeof b];
        
        if (sort === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const total = filteredStrategies.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const items = filteredStrategies.slice(startIndex, endIndex);

      res.json(createSuccessResponse({
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: endIndex < total,
          hasPrev: page > 1,
        },
        filters: { failureType, enabled },
      }));

    } catch (error) {
      logger.error('Failed to retrieve healing strategies', {
        requestId,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to retrieve healing strategies',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * GET /api/v1/healing/strategies/:id
 * Get specific healing strategy details
 */
router.get('/strategies/:id',
  requestValidationMiddleware({
    params: CommonSchemas.idParam,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const strategyId = req.params['id'] as string;

    logger.debug('Healing strategy details requested', {
      requestId,
      strategyId,
    });

    // TODO: Replace with actual strategy registry
    const strategy = healingStrategies.get(strategyId);
    
    if (!strategy) {
      throw new NotFoundError(`Healing strategy with ID ${strategyId}`, requestId);
    }

    res.json(createSuccessResponse(strategy));

  })
);

/**
 * PUT /api/v1/healing/strategies/:id
 * Update healing strategy configuration
 */
router.put('/strategies/:id',
  requestValidationMiddleware({
    params: CommonSchemas.idParam,
    body: Joi.object({
      enabled: Joi.boolean().optional(),
      confidence: Joi.number().min(0).max(1).optional(),
      config: Joi.object().optional(),
      description: Joi.string().max(1000).optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const strategyId = req.params['id'] as string;
    const updates = req.body;

    logger.info('Healing strategy update requested', {
      requestId,
      strategyId,
      updates,
    });

    const strategy = healingStrategies.get(strategyId);
    
    if (!strategy) {
      throw new NotFoundError(`Healing strategy with ID ${strategyId}`, requestId);
    }

    // TODO: Replace with actual strategy update
    // await healingStrategyRegistry.updateStrategy(strategyId, updates);

    // Demo implementation
    const updatedStrategy = {
      ...strategy,
      ...updates,
      updatedAt: new Date(),
    };

    healingStrategies.set(strategyId, updatedStrategy);

    res.json(createSuccessResponse({
      strategyId,
      message: 'Healing strategy updated successfully',
      updatedFields: Object.keys(updates),
    }));

  })
);

/**
 * GET /api/v1/healing/attempts
 * Get healing attempts with filtering and pagination
 */
router.get('/attempts',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const page = parseInt(req.query['page'] as string || '1', 10);
    const limit = parseInt(req.query['limit'] as string || '10', 10);
    const sort = req.query['sort'] as string || 'desc';
    const sortBy = req.query['sortBy'] as string || 'createdAt';
    const startDate = req.query['startDate'] as string;
    const endDate = req.query['endDate'] as string;
    const testId = req.query['testId'] as string;
    const strategy = req.query['strategy'] as string;
    const success = req.query['success'] === 'true';
    const minConfidence = parseFloat(req.query['minConfidence'] as string || '0');

    logger.debug('Healing attempts requested', {
      requestId,
      filters: { testId, strategy, success, minConfidence, startDate, endDate },
      pagination: { page, limit, sort, sortBy },
    });

    try {
      // TODO: Replace with actual database query
      // const attempts = await healingService.getAttempts({
      //   filters: { testId, strategy, success, minConfidence, startDate, endDate },
      //   pagination: { page, limit, sort, sortBy },
      // });

      // Demo implementation
      let allAttempts = Array.from(healingAttempts.values());

      // Apply filters
      if (testId) {
        allAttempts = allAttempts.filter(a => a.testId === testId);
      }
      if (strategy) {
        allAttempts = allAttempts.filter(a => a.strategy === strategy);
      }
      if (success !== undefined) {
        allAttempts = allAttempts.filter(a => a.success === success);
      }
      if (minConfidence) {
        allAttempts = allAttempts.filter(a => a.confidence >= minConfidence);
      }
      if (startDate) {
        const start = new Date(startDate as string);
        allAttempts = allAttempts.filter(a => a.timestamp >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        allAttempts = allAttempts.filter(a => a.timestamp <= end);
      }

      // Apply sorting
      allAttempts.sort((a, b) => {
        const aValue = a[sortBy as keyof HealingResult];
        const bValue = b[sortBy as keyof HealingResult];
        
        if (sort === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const total = allAttempts.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const items = allAttempts.slice(startIndex, endIndex);

      res.json(createSuccessResponse({
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: endIndex < total,
          hasPrev: page > 1,
        },
        filters: { testId, strategy, success, minConfidence, startDate, endDate },
      }));

    } catch (error) {
      logger.error('Failed to retrieve healing attempts', {
        requestId,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to retrieve healing attempts',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * GET /api/v1/healing/attempts/:id
 * Get specific healing attempt details
 */
router.get('/attempts/:id',
  requestValidationMiddleware({
    params: CommonSchemas.idParam,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const attemptId = req.params['id'] as string;

    logger.debug('Healing attempt details requested', {
      requestId,
      attemptId,
    });

    const attempt = healingAttempts.get(attemptId);
    
    if (!attempt) {
      throw new NotFoundError(`Healing attempt with ID ${attemptId}`, requestId);
    }

    res.json(createSuccessResponse(attempt));

  })
);

/**
 * GET /api/v1/healing/statistics
 * Get healing statistics and metrics
 */
router.get('/statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const startDate = req.query['startDate'] as string;
    const endDate = req.query['endDate'] as string;
    const groupBy = req.query['groupBy'] as string || 'day';
    const strategy = req.query['strategy'] as string;

    logger.debug('Healing statistics requested', {
      requestId,
      startDate,
      endDate,
      groupBy,
      strategy,
    });

    try {
      // TODO: Replace with actual database aggregation
      // const stats = await healingService.getStatistics({
      //   startDate,
      //   endDate,
      //   groupBy,
      //   strategy,
      // });

      // Demo implementation
      let allAttempts = Array.from(healingAttempts.values());

      // Apply date filter
      if (startDate) {
        const start = new Date(startDate as string);
        allAttempts = allAttempts.filter(a => a.timestamp >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        allAttempts = allAttempts.filter(a => a.timestamp <= end);
      }

      // Apply strategy filter
      if (strategy) {
        allAttempts = allAttempts.filter(a => a.strategy === strategy);
      }

      // Calculate statistics
      const total = allAttempts.length;
      const successful = allAttempts.filter(a => a.success).length;
      const failed = allAttempts.filter(a => !a.success).length;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      const avgConfidence = total > 0 
        ? allAttempts.reduce((sum, a) => sum + a.confidence, 0) / total 
        : 0;

      const avgDuration = total > 0 
        ? allAttempts.reduce((sum, a) => sum + a.duration, 0) / total 
        : 0;

      // Group by strategy
      const strategyStats = allAttempts.reduce((acc, attempt) => {
        if (!acc[attempt.strategy]) {
          acc[attempt.strategy] = {
            total: 0,
            successful: 0,
            failed: 0,
            avgConfidence: 0,
            avgDuration: 0,
          };
        }
        
        acc[attempt.strategy].total++;
        if (attempt.success) {
          acc[attempt.strategy].successful++;
        } else {
          acc[attempt.strategy].failed++;
        }
        acc[attempt.strategy].avgConfidence += attempt.confidence;
        acc[attempt.strategy].avgDuration += attempt.duration;
        
        return acc;
      }, {} as Record<string, any>);

      // Calculate averages for each strategy
      Object.keys(strategyStats).forEach(strategyName => {
        const stats = strategyStats[strategyName];
        stats.avgConfidence = stats.avgConfidence / stats.total;
        stats.avgDuration = stats.avgDuration / stats.total;
        stats.successRate = (stats.successful / stats.total) * 100;
      });

      const statistics = {
        total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgDuration: Math.round(avgDuration),
        strategyStats,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        groupBy,
        generatedAt: new Date(),
      };

      res.json(createSuccessResponse(statistics));

    } catch (error) {
      logger.error('Failed to generate healing statistics', {
        requestId,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to generate healing statistics',
        500,
        true,
        requestId
      );
    }
  })
);

/**
 * POST /api/v1/healing/attempts
 * Manually trigger a healing attempt
 */
router.post('/attempts',
  requestValidationMiddleware({
    body: CommonSchemas.healingAttempt,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const { testId, strategy, confidence, description, metadata } = req.body;

    logger.info('Manual healing attempt requested', {
      requestId,
      testId,
      strategy,
      confidence,
    });

    try {
      // TODO: Replace with actual healing engine
      // const healingEngine = new HealingEngine();
      // const result = await healingEngine.attemptHealing({
      //   testId,
      //   strategy,
      //   confidence,
      //   description,
      //   metadata,
      // });

      // Demo implementation
      const attemptId = generateAttemptId(testId);
      const result: ApiHealingResult = {
        id: attemptId,
        testId,
        strategy,
        success: Math.random() > 0.4, // 60% success rate
        confidence,
        message: description || 'Healing attempt completed',
        timestamp: new Date(),
        duration: Math.floor(Math.random() * 500) + 100, // 100-600ms
        actions: [],
        changes: {
          before: 'Original selector that failed',
          after: 'New selector that should work',
          type: 'selector-change',
        },
        metadata: {
          ...metadata,
          manualTrigger: true,
          triggeredBy: 'api',
        },
      };

      healingAttempts.set(attemptId, result);

      res.status(201).json(createSuccessResponse({
        attemptId,
        result,
        message: 'Healing attempt completed',
      }, 'Healing attempt completed successfully', 201));

    } catch (error) {
      logger.error('Failed to execute healing attempt', {
        requestId,
        error: (error as Error).message,
      });

      throw new ApiError(
        'Failed to execute healing attempt',
        500,
        true,
        requestId
      );
    }
  })
);

// Helper functions

/**
 * Generate a unique healing attempt ID
 */
function generateAttemptId(testId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `healing_${testId}_${timestamp}_${random}`;
}

export default router;
