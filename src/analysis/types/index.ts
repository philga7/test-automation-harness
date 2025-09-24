/**
 * Analysis Types Export Index
 * GREEN PHASE: Export all analysis types to make tests pass
 */

// Configuration types
export * from './config';

// Result types
export * from './results';

// Error types
export * from './errors';

// Validation schemas
export * from './validation';

// TypeScript patterns
export * from './patterns';

// Re-export main interfaces for convenience
export type {
  AppAnalysisConfig,
} from './config';

export type {
  AppAnalysisResult,
  AnalysisUserFlow,
  AnalysisUIElement,
  AnalysisTestScenario,
} from './results';

export {
  AnalysisError,
  AnalysisTimeoutError,
  AnalysisConfigurationError,
  AnalysisExecutionError,
  AnalysisValidationError,
  ElementNotFoundError,
  FlowDetectionError,
  AIServiceError,
} from './errors';

export {
  AppAnalysisConfigSchema,
  AppAnalysisResultSchema,
  validateAnalysisConfig,
} from './validation';
