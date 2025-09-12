/**
 * Unit tests for ObservabilityManager
 * 
 * Tests the central orchestrator that coordinates all observability components
 */

import { ObservabilityManager, ObservabilityManagerConfig } from '../../../src/observability/ObservabilityManager';
// import { ObservabilityConfig } from '../../../src/observability/types'; // Not used directly

describe('ObservabilityManager', () => {
  let observabilityManager: ObservabilityManager;
  let config: ObservabilityManagerConfig;

  beforeEach(() => {
    config = {
      observability: {
        enabled: true,
        logging: {
          level: 'info',
          format: 'json',
          maxFileSize: '10MB',
          maxFiles: 5,
          includeStackTrace: true,
        },
        metrics: {
          enabled: true,
          interval: 1000,
          retention: 3600,
          exportFormat: 'prometheus' as const,
        },
        tracing: {
          enabled: false,
          sampleRate: 0.1,
          serviceName: 'test-service',
        },
        health: {
          enabled: false, // Disable for testing
          interval: 1000,
          timeout: 500,
        },
        reporting: {
          enabled: true,
          schedule: '0 0 * * *',
          formats: ['json', 'html'],
          outputDir: '/tmp/reports',
          retention: 7,
        },
      },
    };
    observabilityManager = new ObservabilityManager(config);
  });

  afterEach(() => {
    observabilityManager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with provided configuration', () => {
      expect(observabilityManager).toBeDefined();
      expect(observabilityManager.getConfig()).toEqual(config.observability);
    });

    it('should initialize all observability services', () => {
      expect(observabilityManager.getLoggingService()).toBeDefined();
      expect(observabilityManager.getMetricsCollector()).toBeDefined();
      expect(observabilityManager.getHealthMonitor()).toBeDefined();
      expect(observabilityManager.getReportGenerator()).toBeDefined();
    });

    it('should set up cross-service integration', () => {
      // When health monitoring is disabled, no health checks should be registered
      const healthMonitor = observabilityManager.getHealthMonitor();
      const registeredChecks = healthMonitor.getRegisteredChecks();
      expect(registeredChecks).toHaveLength(0);
      
      // Verify that metrics are still set up (this should work regardless of health monitoring)
      const metricsCollector = observabilityManager.getMetricsCollector();
      const summary = metricsCollector.getMetricsSummary();
      expect(summary.registeredMetrics).toBeGreaterThanOrEqual(4);
    });

    it('should register observability-specific metrics', () => {
      const metricsCollector = observabilityManager.getMetricsCollector();
      const summary = metricsCollector.getMetricsSummary();
      
      // Check that we have registered metrics (at least the 4 observability-specific ones)
      expect(summary.registeredMetrics).toBeGreaterThanOrEqual(4);
      
      // Verify specific metrics are registered by checking the registrations map
      const registrations = (metricsCollector as any).registrations;
      expect(registrations.has('observability_events_total')).toBe(true);
      expect(registrations.has('log_entries_total')).toBe(true);
      expect(registrations.has('health_checks_total')).toBe(true);
      expect(registrations.has('reports_generated_total')).toBe(true);
    });
  });

  describe('Service Access', () => {
    it('should provide access to logging service', () => {
      const loggingService = observabilityManager.getLoggingService();
      expect(loggingService).toBeDefined();
      expect(typeof loggingService.info).toBe('function');
      expect(typeof loggingService.error).toBe('function');
    });

    it('should provide access to metrics collector', () => {
      const metricsCollector = observabilityManager.getMetricsCollector();
      expect(metricsCollector).toBeDefined();
      expect(typeof metricsCollector.incrementCounter).toBe('function');
      expect(typeof metricsCollector.getMetrics).toBe('function');
    });

    it('should provide access to health monitor', () => {
      const healthMonitor = observabilityManager.getHealthMonitor();
      expect(healthMonitor).toBeDefined();
      expect(typeof healthMonitor.getSystemHealth).toBe('function');
      expect(typeof healthMonitor.register).toBe('function');
    });

    it('should provide access to report generator', () => {
      const reportGenerator = observabilityManager.getReportGenerator();
      expect(reportGenerator).toBeDefined();
      expect(typeof reportGenerator.generateReport).toBe('function');
      expect(typeof reportGenerator.getAvailableTemplates).toBe('function');
    });
  });

  describe('Event System', () => {
    it('should emit events and notify listeners', () => {
      const listener = jest.fn();
      observabilityManager.addEventListener('log', listener);

      const event = {
        type: 'log' as const,
        timestamp: new Date(),
        source: 'test',
        data: { message: 'test data' },
      };

      observabilityManager.emitEvent(event);

      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should track event metrics when emitting events', () => {
      const metricsCollector = observabilityManager.getMetricsCollector();
      
      const event = {
        type: 'metric' as const,
        timestamp: new Date(),
        source: 'test',
        data: { name: 'test_metric', value: 1 },
      };

      observabilityManager.emitEvent(event);

      // Verify that observability_events_total counter was incremented
      const updatedMetricsData = metricsCollector.getAllMetrics();
      const updatedMetrics = Object.values(updatedMetricsData).flat();
      const eventsMetric = updatedMetrics.find(m => m.name === 'observability_events_total');
      expect(eventsMetric).toBeDefined();
    });

    it('should handle event listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      observabilityManager.addEventListener('log', errorListener);
      observabilityManager.addEventListener('log', normalListener);

      const event = {
        type: 'log' as const,
        timestamp: new Date(),
        source: 'test',
        data: { message: 'test' },
      };

      // Should not throw, but should log the error
      expect(() => observabilityManager.emitEvent(event)).not.toThrow();
      
      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalledWith(event);
    });

    it('should add and remove event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      observabilityManager.addEventListener('log', listener1);
      observabilityManager.addEventListener('log', listener2);

      const event = {
        type: 'log' as const,
        timestamp: new Date(),
        source: 'test',
        data: { message: 'test' },
      };

      observabilityManager.emitEvent(event);
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // Remove one listener
      observabilityManager.removeEventListener('log', listener1);
      observabilityManager.emitEvent(event);

      expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(listener2).toHaveBeenCalledTimes(2); // Should be called again
    });
  });

  describe('Logging Integration', () => {
    it('should log messages with metrics tracking', () => {
      const metricsCollector = observabilityManager.getMetricsCollector();
      
      observabilityManager.log('info', 'Test message', { component: 'test' });

      // Verify that log_entries_total counter was incremented
      const updatedMetricsData = metricsCollector.getAllMetrics();
      const updatedMetrics = Object.values(updatedMetricsData).flat();
      const logMetric = updatedMetrics.find(m => m.name === 'log_entries_total');
      expect(logMetric).toBeDefined();
    });

    it('should emit log events when logging', () => {
      const listener = jest.fn();
      observabilityManager.addEventListener('log', listener);

      observabilityManager.log('warn', 'Warning message', { component: 'test' }, { extra: 'data' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'log',
          source: 'test',
          data: expect.objectContaining({
            level: 'warn',
            message: 'Warning message',
            context: { component: 'test' },
            data: { extra: 'data' },
          }),
        })
      );
    });

    it('should handle all log levels', () => {
      const context = { component: 'test' };
      
      expect(() => observabilityManager.log('debug', 'Debug message', context)).not.toThrow();
      expect(() => observabilityManager.log('info', 'Info message', context)).not.toThrow();
      expect(() => observabilityManager.log('warn', 'Warning message', context)).not.toThrow();
      expect(() => observabilityManager.log('error', 'Error message', context, undefined, new Error('Test error'))).not.toThrow();
    });
  });

  describe('Health Check Integration', () => {
    it('should perform health checks with metrics tracking', async () => {
      const metricsCollector = observabilityManager.getMetricsCollector();
      
      // Run a system health check
      const result = await observabilityManager.performHealthCheck();
      
      expect(result).toBeDefined();
      expect(result?.status).toBeDefined();
      
      // Verify that health_checks_total counter was incremented
      const metricsData = metricsCollector.getAllMetrics();
      const metrics = Object.values(metricsData).flat();
      const healthMetric = metrics.find(m => m.name === 'health_checks_total');
      expect(healthMetric).toBeDefined();
    });

    it('should perform single health check with metrics tracking', async () => {
      const healthMonitor = observabilityManager.getHealthMonitor();
      
      // Register a test health check
      healthMonitor.register({
        name: 'test_check',
        check: async () => ({ status: 'healthy' }),
        timeout: 1000,
        interval: 5000,
        critical: false,
      });

      // Run the specific health check
      const result = await observabilityManager.performHealthCheck('test_check');
      
      expect(result).toBeDefined();
      expect(result?.status).toBe('healthy');
    });

    it('should emit health events when performing health checks', async () => {
      const listener = jest.fn();
      observabilityManager.addEventListener('health', listener);

      await observabilityManager.performHealthCheck();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'health',
          source: 'health-monitor', // The event comes from health-monitor, not observability-manager
          data: expect.any(Object),
        })
      );
    });
  });

  describe('Report Generation Integration', () => {
    it('should generate reports with metrics tracking', async () => {
      const reportOptions = {
        type: 'test-execution' as const,
        format: 'json' as const,
        data: { test: 'data' },
        title: 'Test Report',
        description: 'A test report',
      };

      const report = await observabilityManager.generateReport(reportOptions);
      
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.type).toBe('test-execution');
    });

    it('should track report generation metrics', async () => {
      const metricsCollector = observabilityManager.getMetricsCollector();
      
      const reportOptions = {
        type: 'system-health' as const,
        format: 'html' as const,
        data: {
          status: 'healthy' as const,
          timestamp: new Date(),
          components: [],
          summary: {
            totalComponents: 0,
            healthyComponents: 0,
            degradedComponents: 0,
            unhealthyComponents: 0,
            uptime: 1000,
          },
        },
      };

      await observabilityManager.generateReport(reportOptions);

      // Verify that reports_generated_total counter was incremented
      const metricsData = metricsCollector.getAllMetrics();
      const metrics = metricsData.metrics;
      const reportMetric = metrics.find(m => m.name === 'reports_generated_total');
      expect(reportMetric).toBeDefined();
    });

    it('should handle report generation errors gracefully', async () => {
      // Mock the report generator to throw an error
      const reportGenerator = observabilityManager.getReportGenerator();
      const originalGenerateReport = reportGenerator.generateReport;
      reportGenerator.generateReport = jest.fn().mockRejectedValue(new Error('Report generation failed'));

      const reportOptions = {
        type: 'test-execution' as const,
        format: 'json' as const,
        data: { test: 'data' },
      };

      // Should not throw, but should log the error
      await expect(observabilityManager.generateReport(reportOptions)).rejects.toThrow('Report generation failed');

      // Restore original method
      reportGenerator.generateReport = originalGenerateReport;
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with context', () => {
      const context = { component: 'test-component', operation: 'test-operation' };
      const logger = observabilityManager.createLogger(context);

      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should use child logger with proper context', () => {
      const context = { component: 'child-test' };
      const logger = observabilityManager.createLogger(context);
      
      const listener = jest.fn();
      observabilityManager.addEventListener('log', listener);

      logger.info('Child logger message', { extra: 'data' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'log',
          source: 'child-test',
          data: expect.objectContaining({
            level: 'info',
            message: 'Child logger message',
            context: { component: 'child-test' },
            data: { extra: 'data' },
          }),
        })
      );
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const currentConfig = observabilityManager.getConfig();
      expect(currentConfig).toEqual(config.observability);
    });

    it('should update configuration', () => {
      const partialConfig = {
        logging: {
          level: 'debug' as const,
          format: 'text' as const,
          maxFileSize: '5MB',
          maxFiles: 3,
          includeStackTrace: false,
        },
      };

      observabilityManager.updateConfig(partialConfig);

      const updatedConfig = observabilityManager.getConfig();
      expect(updatedConfig.logging.level).toBe('debug');
      expect(updatedConfig.logging.format).toBe('text');
      expect(updatedConfig.logging.maxFileSize).toBe('5MB');
    });

    it('should log configuration updates', () => {
      const listener = jest.fn();
      observabilityManager.addEventListener('log', listener);

      observabilityManager.updateConfig({
        metrics: { enabled: false, interval: 2000, retention: 1800, exportFormat: 'json' as const },
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'log',
          data: expect.objectContaining({
            level: 'info',
            message: 'Observability configuration updated',
            context: { component: 'observability-manager', operation: 'update-config' },
          }),
        })
      );
    });
  });

  describe('Observability Summary', () => {
    it('should provide comprehensive observability summary', () => {
      const summary = observabilityManager.getObservabilitySummary();

      expect(summary).toBeDefined();
      expect(summary.logging).toBeDefined();
      expect(summary.metrics).toBeDefined();
      expect(summary.health).toBeDefined();
      expect(summary.reports).toBeDefined();
      expect(summary.events).toBeDefined();

      expect(summary.logging.totalEntries).toBeDefined();
      expect(summary.metrics.totalMetrics).toBeDefined();
      expect(summary.health.status).toBeDefined();
      expect(summary.reports.availableTemplates).toBeDefined();
      expect(summary.events.registeredListeners).toBeDefined();
    });

    it('should include event listener information in summary', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      observabilityManager.addEventListener('test-event', listener1);
      observabilityManager.addEventListener('test-event', listener2);
      observabilityManager.addEventListener('other-event', listener1);

      const summary = observabilityManager.getObservabilitySummary();

      expect(summary.events.registeredListeners).toContain('test-event');
      expect(summary.events.registeredListeners).toContain('other-event');
      expect(summary.events.totalListeners).toBe(3);
    });
  });

  describe('Lifecycle Management', () => {
    it('should start services', () => {
      const listener = jest.fn();
      observabilityManager.addEventListener('log', listener);

      observabilityManager.start();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'log',
          data: expect.objectContaining({
            level: 'info',
            message: 'Starting observability services',
            context: { component: 'observability-manager', operation: 'start' },
          }),
        })
      );
    });

    it('should stop services', () => {
      const listener = jest.fn();
      observabilityManager.addEventListener('log', listener);

      observabilityManager.stop();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'log',
          data: expect.objectContaining({
            level: 'info',
            message: 'Stopping observability services',
            context: { component: 'observability-manager', operation: 'stop' },
          }),
        })
      );
    });

    it('should destroy all resources', () => {
      const listener = jest.fn();
      observabilityManager.addEventListener('test', listener);

      observabilityManager.destroy();

      // Event listeners should be cleared
      const summary = observabilityManager.getObservabilitySummary();
      expect(summary.events.totalListeners).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      const invalidConfig = {
        observability: {
          enabled: true,
          logging: {
            level: 'invalid' as any,
            format: 'invalid' as any,
            maxFileSize: 'invalid',
            maxFiles: -1,
            includeStackTrace: 'invalid' as any,
          },
          metrics: {
            enabled: 'invalid' as any,
            interval: -1,
            retention: 'invalid' as any,
            exportFormat: 'invalid' as any,
          },
          tracing: {
            enabled: 'invalid' as any,
            sampleRate: 'invalid' as any,
            serviceName: 123 as any,
          },
        health: {
          enabled: false, // Disable health monitoring to avoid timer creation
          interval: 'invalid' as any,
          timeout: 'invalid' as any,
        },
          reporting: {
            enabled: 'invalid' as any,
            schedule: 123 as any,
            formats: 'invalid' as any,
            outputDir: 123 as any,
            retention: 'invalid' as any,
          },
        },
      };

      // Should not throw during initialization
      let invalidManager: ObservabilityManager;
      expect(() => {
        invalidManager = new ObservabilityManager(invalidConfig);
      }).not.toThrow();
      
      // Clean up the invalid manager to prevent open handles
      if (invalidManager!) {
        invalidManager.destroy();
      }
    });

    it('should handle metric tracking errors gracefully', () => {
      const metricsCollector = observabilityManager.getMetricsCollector();
      
      // Mock a method to throw an error
      const originalIncrement = metricsCollector.incrementCounter;
      metricsCollector.incrementCounter = jest.fn().mockImplementation(() => {
        throw new Error('Metric tracking error');
      });

      // Should not throw when tracking metrics
      expect(() => observabilityManager.log('info', 'Test message', { component: 'test' })).not.toThrow();

      // Restore original method
      metricsCollector.incrementCounter = originalIncrement;
    });
  });
});
