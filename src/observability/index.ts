/**
 * Observability module for the Self-Healing Test Automation Harness
 * 
 * This module provides comprehensive observability capabilities including:
 * - Structured logging with multiple outputs
 * - Metrics collection and aggregation
 * - Health monitoring and alerting
 * - Report generation and analytics
 * - Event coordination and management
 */

// Core observability manager
export { ObservabilityManager } from './ObservabilityManager';

// Individual services
export { LoggingService } from './logging/LoggingService';
export { MetricsCollector } from './metrics/MetricsCollector';
export { HealthMonitor } from './health/HealthMonitor';
export { ReportGenerator } from './reporting/ReportGenerator';

// Type definitions
export type {
  // Base types
  BaseMetric,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  TimerMetric,
  Metric,
  MetricsData,
  
  // Logging types
  LogEntry,
  
  // Health types
  HealthStatus,
  SystemHealth,
  
  // Reporting types
  ReportData,
  TestExecutionMetrics,
  HealingStats,
  PerformanceMetrics,
  
  // Configuration types
  ObservabilityConfig,
  
  // Event types
  ObservabilityEvent,
  AlertRule,
  DashboardConfig,
} from './types';

// Service-specific interfaces
export type { LogContext } from './logging/LoggingService';
export type { MetricRegistration } from './metrics/MetricsCollector';
export type { HealthCheck, HealthCheckResult } from './health/HealthMonitor';
export type { ReportTemplate, ReportGenerationOptions } from './reporting/ReportGenerator';

/**
 * Create a configured observability manager instance
 */
export function createObservabilityManager(config: {
  observability: any; // Will be typed properly when integrated
}) {
  const { ObservabilityManager } = require('./ObservabilityManager');
  return new ObservabilityManager(config);
}

/**
 * Default observability configuration
 */
export const defaultObservabilityConfig = {
  enabled: true,
  metrics: {
    enabled: true,
    interval: 5000,
    retention: 7,
    exportFormat: 'json' as const,
  },
  logging: {
    level: 'info' as const,
    format: 'text' as const,
    maxFileSize: '10MB',
    maxFiles: 5,
    includeStackTrace: true,
  },
  tracing: {
    enabled: false,
    sampleRate: 0.1,
    serviceName: 'test-automation-harness',
  },
  health: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
  },
  reporting: {
    enabled: true,
    schedule: '0 0 * * *',
    formats: ['json', 'html'] as const,
    outputDir: './reports',
    retention: 30,
  },
};

/**
 * Utility function to merge observability configurations
 */
export function mergeObservabilityConfig(
  baseConfig: typeof defaultObservabilityConfig,
  userConfig: Partial<typeof defaultObservabilityConfig>
): typeof defaultObservabilityConfig {
  return {
    ...baseConfig,
    ...userConfig,
    metrics: { ...baseConfig.metrics, ...userConfig.metrics },
    logging: { ...baseConfig.logging, ...userConfig.logging },
    tracing: { ...baseConfig.tracing, ...userConfig.tracing },
    health: { ...baseConfig.health, ...userConfig.health },
    reporting: { ...baseConfig.reporting, ...userConfig.reporting },
  };
}
