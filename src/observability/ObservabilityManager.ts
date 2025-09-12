/**
 * Main observability manager for the Self-Healing Test Automation Harness
 * 
 * This service coordinates all observability components including:
 * - Logging service
 * - Metrics collection
 * - Health monitoring
 * - Report generation
 * - Event coordination
 */

import { LoggingService } from './logging/LoggingService';
import { MetricsCollector } from './metrics/MetricsCollector';
import { HealthMonitor } from './health/HealthMonitor';
import { ReportGenerator } from './reporting/ReportGenerator';
import { 
  ObservabilityConfig, 
  ObservabilityEvent, 
  Metric, 
  HealthStatus,
  SystemHealth,
  ReportData 
} from './types';

export interface ObservabilityManagerConfig {
  observability: ObservabilityConfig;
}

export class ObservabilityManager {
  private config: ObservabilityConfig;
  private loggingService: LoggingService;
  private metricsCollector: MetricsCollector;
  private healthMonitor: HealthMonitor;
  private reportGenerator: ReportGenerator;
  private eventListeners: Map<string, ((event: ObservabilityEvent) => void)[]> = new Map();

  constructor(config: ObservabilityManagerConfig) {
    this.config = config.observability;

    // Initialize services
    this.loggingService = new LoggingService(this.config.logging);
    this.metricsCollector = new MetricsCollector(this.config.metrics);
    
    this.healthMonitor = new HealthMonitor(this.config.health);
    
    this.reportGenerator = new ReportGenerator(this.config.reporting);

    // Set up cross-service integration
    this.setupIntegration();
  }

  /**
   * Set up integration between services
   */
  private setupIntegration(): void {
    // Only set up health monitoring integration if health monitoring is enabled
    if (this.config.health.enabled) {
      // Log when health checks fail
      this.healthMonitor.getRegisteredChecks().forEach(check => {
        const originalCheck = check.check;
        check.check = async () => {
          try {
            const result = await originalCheck();
            if (result.status === 'unhealthy') {
              this.loggingService.warn(
                `Health check failed: ${check.name}`,
                { component: 'health-monitor', operation: 'health-check' },
                { healthCheck: check.name, error: result.error }
              );
            }
            return result;
          } catch (error) {
            this.loggingService.error(
              `Health check error: ${check.name}`,
              { component: 'health-monitor', operation: 'health-check' },
              error instanceof Error ? error : new Error(String(error))
            );
            throw error;
          }
        };
      });

      // Register health checks for observability services
      this.registerObservabilityHealthChecks();
    }

    // Set up metric collection for observability operations
    this.setupObservabilityMetrics();
  }

  /**
   * Register health checks for observability services themselves
   */
  private registerObservabilityHealthChecks(): void {
    // Logging service health check
    this.healthMonitor.register({
      name: 'logging_service',
      check: async () => {
        try {
          const stats = this.loggingService.getLogStats();
          return {
            status: 'healthy',
            details: {
              totalEntries: stats.totalEntries,
              fileSize: stats.fileSize,
              entriesByLevel: stats.entriesByLevel,
            },
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Logging service check failed',
            details: {},
          };
        }
      },
      timeout: 2000,
      interval: 60000,
      critical: true,
    });

    // Metrics collector health check
    this.healthMonitor.register({
      name: 'metrics_collector',
      check: async () => {
        try {
          const summary = this.metricsCollector.getMetricsSummary();
          return {
            status: summary.totalMetrics > 0 ? 'healthy' : 'degraded',
            details: {
              totalMetrics: summary.totalMetrics,
              registeredMetrics: summary.registeredMetrics,
              memoryUsage: summary.memoryUsage,
              metricsByType: summary.metricsByType,
            },
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Metrics collector check failed',
            details: {},
          };
        }
      },
      timeout: 2000,
      interval: 45000,
      critical: false,
    });

    // Report generator health check
    this.healthMonitor.register({
      name: 'report_generator',
      check: async () => {
        try {
          const templates = this.reportGenerator.getAvailableTemplates();
          return {
            status: templates.length > 0 ? 'healthy' : 'degraded',
            details: {
              availableTemplates: templates.length,
              templateTypes: templates.map(t => t.type),
            },
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Report generator check failed',
            details: {},
          };
        }
      },
      timeout: 2000,
      interval: 120000,
      critical: false,
    });
  }

  /**
   * Set up metrics for observability operations
   */
  private setupObservabilityMetrics(): void {
    // Register observability-specific metrics
    this.metricsCollector.register({
      name: 'observability_events_total',
      type: 'counter',
      description: 'Total observability events processed',
      labels: ['type', 'source'],
    });

    this.metricsCollector.register({
      name: 'log_entries_total',
      type: 'counter',
      description: 'Total log entries created',
      labels: ['level', 'component'],
    });

    this.metricsCollector.register({
      name: 'health_checks_total',
      type: 'counter',
      description: 'Total health checks performed',
      labels: ['check_name', 'status'],
    });

    this.metricsCollector.register({
      name: 'reports_generated_total',
      type: 'counter',
      description: 'Total reports generated',
      labels: ['type', 'format'],
    });
  }

  /**
   * Get the logging service
   */
  getLoggingService(): LoggingService {
    return this.loggingService;
  }

  /**
   * Get the metrics collector
   */
  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  /**
   * Get the health monitor
   */
  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  /**
   * Get the report generator
   */
  getReportGenerator(): ReportGenerator {
    return this.reportGenerator;
  }

  /**
   * Emit an observability event
   */
  emitEvent(event: ObservabilityEvent): void {
    // Update metrics
    try {
      this.metricsCollector.incrementCounter(
        'observability_events_total',
        { type: event.type, source: event.source }
      );
    } catch (error) {
      // Log metric tracking errors but don't fail the main event emission
      console.warn('Failed to track event metric:', error);
    }

    // Notify listeners
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.loggingService.error(
          'Event listener error',
          { component: 'observability-manager', operation: 'emit-event' },
          error instanceof Error ? error : new Error(String(error)),
          { eventType: event.type, source: event.source }
        );
      }
    });
  }

  /**
   * Add an event listener
   */
  addEventListener(eventType: string, listener: (event: ObservabilityEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(eventType: string, listener: (event: ObservabilityEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  /**
   * Log a message with metrics tracking
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context: any, data?: any, error?: Error): void {
    // Track log entry in metrics
    try {
      this.metricsCollector.incrementCounter(
        'log_entries_total',
        { level, component: context.component || 'unknown' }
      );
    } catch (error) {
      // Log metric tracking errors but don't fail the main logging operation
      console.warn('Failed to track log entry metric:', error);
    }

    // Log the message
    switch (level) {
      case 'debug':
        this.loggingService.debug(message, context, data);
        break;
      case 'info':
        this.loggingService.info(message, context, data);
        break;
      case 'warn':
        this.loggingService.warn(message, context, data);
        break;
      case 'error':
        this.loggingService.error(message, context, error, data);
        break;
    }

    // Emit log event
    this.emitEvent({
      type: 'log',
      timestamp: new Date(),
      source: context.component || 'unknown',
      data: { level, message, context, data, error: error?.message },
    });
  }

  /**
   * Track a metric with event emission
   */
  trackMetric(metric: Metric): void {
    // Emit metric event
    this.emitEvent({
      type: 'metric',
      timestamp: new Date(),
      source: 'metrics-collector',
      data: metric,
    });
  }

  /**
   * Perform health check with metrics tracking
   */
  async performHealthCheck(checkName?: string): Promise<SystemHealth | HealthStatus | null> {
    const startTime = this.metricsCollector.startTimer('health_check_duration', { check_name: checkName || 'all' });

    try {
      let result: SystemHealth | HealthStatus | null = null;

      if (checkName) {
        const healthResult = await this.healthMonitor.runSingleCheck(checkName);
        if (healthResult) {
          result = {
            status: healthResult.status,
            component: checkName,
            timestamp: healthResult.timestamp,
            uptime: Date.now() - Date.now(), // This would be calculated properly
            details: healthResult.details,
          };
        }
        if (result) {
          this.metricsCollector.incrementCounter(
            'health_checks_total',
            { check_name: checkName, status: result.status }
          );
        }
      } else {
        result = this.healthMonitor.getSystemHealth();
        this.metricsCollector.incrementCounter(
          'health_checks_total',
          { check_name: 'system', status: result.status }
        );
      }

      // Emit health event
      this.emitEvent({
        type: 'health',
        timestamp: new Date(),
        source: 'health-monitor',
        data: result,
      });

      return result;
    } finally {
      this.metricsCollector.endTimer(startTime, 'health_check_duration');
    }
  }

  /**
   * Generate a report with metrics tracking
   */
  async generateReport(options: {
    type: 'test-execution' | 'healing-summary' | 'system-health' | 'performance';
    format: 'json' | 'html' | 'pdf';
    data: any;
    title?: string;
    description?: string;
  }): Promise<ReportData> {
    const startTime = this.metricsCollector.startTimer('report_generation_duration', { 
      type: options.type, 
      format: options.format 
    });

    try {
      const report = await this.reportGenerator.generateReport(options);

      // Track report generation
      this.metricsCollector.incrementCounter(
        'reports_generated_total',
        { type: options.type, format: options.format }
      );

      // Log report generation
      this.log(
        'info',
        'Report generated successfully',
        { component: 'observability-manager', operation: 'generate-report' },
        { reportId: report.id, type: options.type, format: options.format }
      );

      return report;
    } catch (error) {
      this.log(
        'error',
        'Failed to generate report',
        { component: 'observability-manager', operation: 'generate-report' },
        { type: options.type, format: options.format },
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    } finally {
      this.metricsCollector.endTimer(startTime, 'report_generation_duration');
    }
  }

  /**
   * Get comprehensive observability summary
   */
  getObservabilitySummary(): {
    logging: any;
    metrics: any;
    health: SystemHealth;
    reports: any;
    events: any;
  } {
    return {
      logging: this.loggingService.getLogStats(),
      metrics: this.metricsCollector.getMetricsSummary(),
      health: this.healthMonitor.getSystemHealth(),
      reports: {
        availableTemplates: this.reportGenerator.getAvailableTemplates().length,
        supportedFormats: ['json', 'html', 'pdf'],
      },
      events: {
        registeredListeners: Array.from(this.eventListeners.keys()),
        totalListeners: Array.from(this.eventListeners.values()).reduce((total, listeners) => total + listeners.length, 0),
      },
    };
  }

  /**
   * Create a child logger with additional context
   */
  createLogger(context: { component: string; operation?: string }): {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, error?: Error, data?: any) => void;
  } {
    return {
      debug: (message: string, data?: any) => this.log('debug', message, context, data),
      info: (message: string, data?: any) => this.log('info', message, context, data),
      warn: (message: string, data?: any) => this.log('warn', message, context, data),
      error: (message: string, error?: Error, data?: any) => this.log('error', message, context, data, error),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): ObservabilityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (partial updates)
   */
  updateConfig(partialConfig: Partial<ObservabilityConfig>): void {
    this.config = { ...this.config, ...partialConfig };
    
    this.log(
      'info',
      'Observability configuration updated',
      { component: 'observability-manager', operation: 'update-config' },
      { updatedFields: Object.keys(partialConfig) }
    );
  }

  /**
   * Start all observability services
   */
  start(): void {
    this.log(
      'info',
      'Starting observability services',
      { component: 'observability-manager', operation: 'start' }
    );

    // Services are already started in constructor
    // This method is for explicit start if needed
  }

  /**
   * Stop all observability services
   */
  stop(): void {
    this.log(
      'info',
      'Stopping observability services',
      { component: 'observability-manager', operation: 'stop' }
    );

    // Clean up resources
    this.destroy();
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    // Clean up services
    this.healthMonitor.destroy();
    this.metricsCollector.destroy();
    this.reportGenerator.destroy();
    this.loggingService.destroy();

    // Clear event listeners
    this.eventListeners.clear();
  }
}
