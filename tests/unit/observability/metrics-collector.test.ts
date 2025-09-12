/**
 * Unit tests for MetricsCollector
 */

import { MetricsCollector, MetricRegistration } from '../../../src/observability/metrics/MetricsCollector';
import { ObservabilityConfig } from '../../../src/observability/types';

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;
  let config: ObservabilityConfig['metrics'];

  beforeEach(() => {
    config = {
      enabled: true,
      interval: 1000,
      retention: 1,
      exportFormat: 'json' as const,
    };
    metricsCollector = new MetricsCollector(config);
  });

  afterEach(() => {
    metricsCollector.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultConfig = {
        enabled: true,
        interval: 5000,
        retention: 7,
        exportFormat: 'json' as const,
      };
      const collector = new MetricsCollector(defaultConfig);
      
      expect(collector).toBeDefined();
      expect(collector.getRegistrations().length).toBeGreaterThan(0);
      
      collector.destroy();
    });

    it('should initialize with disabled metrics', () => {
      const disabledConfig = {
        enabled: false,
        interval: 1000,
        retention: 1,
        exportFormat: 'json' as const,
      };
      const collector = new MetricsCollector(disabledConfig);
      
      expect(collector).toBeDefined();
      
      // Should not collect metrics when disabled
      collector.incrementCounter('test_counter', {}, 1);
      const metrics = collector.getMetrics('test_counter');
      expect(metrics).toHaveLength(0);
      
      collector.destroy();
    });

    it('should register default metrics on initialization', () => {
      const registrations = metricsCollector.getRegistrations();
      
      // Check for some expected default metrics
      const metricNames = registrations.map(r => r.name);
      expect(metricNames).toContain('test_executions_total');
      expect(metricNames).toContain('test_execution_duration_seconds');
      expect(metricNames).toContain('healing_attempts_total');
      expect(metricNames).toContain('http_requests_total');
      expect(metricNames).toContain('system_memory_usage_bytes');
    });
  });

  describe('Metric Registration', () => {
    it('should register a new counter metric', () => {
      const registration: MetricRegistration = {
        name: 'test_counter',
        type: 'counter',
        description: 'Test counter metric',
        labels: ['label1', 'label2'],
      };

      metricsCollector.register(registration);
      
      const registrations = metricsCollector.getRegistrations();
      const found = registrations.find(r => r.name === 'test_counter');
      
      expect(found).toBeDefined();
      expect(found?.type).toBe('counter');
      expect(found?.description).toBe('Test counter metric');
      expect(found?.labels).toEqual(['label1', 'label2']);
    });

    it('should register a new gauge metric', () => {
      const registration: MetricRegistration = {
        name: 'test_gauge',
        type: 'gauge',
        description: 'Test gauge metric',
        labels: ['status'],
      };

      metricsCollector.register(registration);
      
      const registrations = metricsCollector.getRegistrations();
      const found = registrations.find(r => r.name === 'test_gauge');
      
      expect(found).toBeDefined();
      expect(found?.type).toBe('gauge');
    });

    it('should register a new histogram metric with custom buckets', () => {
      const registration: MetricRegistration = {
        name: 'test_histogram',
        type: 'histogram',
        description: 'Test histogram metric',
        labels: ['operation'],
        buckets: [0.1, 0.5, 1.0, 2.0],
      };

      metricsCollector.register(registration);
      
      const registrations = metricsCollector.getRegistrations();
      const found = registrations.find(r => r.name === 'test_histogram');
      
      expect(found).toBeDefined();
      expect(found?.type).toBe('histogram');
      expect(found?.buckets).toEqual([0.1, 0.5, 1.0, 2.0]);
    });

    it('should register a new timer metric', () => {
      const registration: MetricRegistration = {
        name: 'test_timer',
        type: 'timer',
        description: 'Test timer metric',
        labels: ['operation'],
      };

      metricsCollector.register(registration);
      
      const registrations = metricsCollector.getRegistrations();
      const found = registrations.find(r => r.name === 'test_timer');
      
      expect(found).toBeDefined();
      expect(found?.type).toBe('timer');
    });
  });

  describe('Counter Metrics', () => {
    beforeEach(() => {
      metricsCollector.register({
        name: 'test_counter',
        type: 'counter',
        description: 'Test counter',
        labels: ['status'],
      });
    });

    it('should increment a counter metric', () => {
      metricsCollector.incrementCounter('test_counter', { status: 'success' }, 5);
      
      const metrics = metricsCollector.getMetrics('test_counter');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.type).toBe('counter');
      expect(metrics[0]?.name).toBe('test_counter');
      expect(metrics[0]?.labels).toEqual({ status: 'success' });
      expect('value' in metrics[0]! ? metrics[0].value : 0).toBe(5);
    });

    it('should increment counter with default value of 1', () => {
      metricsCollector.incrementCounter('test_counter', { status: 'success' });
      
      const metrics = metricsCollector.getMetrics('test_counter');
      expect(metrics).toHaveLength(1);
      expect('value' in metrics[0]! ? metrics[0].value : 0).toBe(1);
    });

    it('should increment counter multiple times', () => {
      metricsCollector.incrementCounter('test_counter', { status: 'success' }, 3);
      metricsCollector.incrementCounter('test_counter', { status: 'error' }, 2);
      
      const metrics = metricsCollector.getMetrics('test_counter');
      expect(metrics).toHaveLength(2);
      
      const successMetric = metrics.find(m => m.labels['status'] === 'success');
      const errorMetric = metrics.find(m => m.labels['status'] === 'error');
      
      expect(successMetric).toBeDefined();
      expect(errorMetric).toBeDefined();
      expect('value' in successMetric! ? successMetric.value : 0).toBe(3);
      expect('value' in errorMetric! ? errorMetric.value : 0).toBe(2);
    });

    it('should warn when incrementing unregistered counter', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      metricsCollector.incrementCounter('unregistered_counter', {}, 1);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Counter metric 'unregistered_counter' not registered")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Gauge Metrics', () => {
    beforeEach(() => {
      metricsCollector.register({
        name: 'test_gauge',
        type: 'gauge',
        description: 'Test gauge',
        labels: ['instance'],
      });
    });

    it('should set a gauge metric value', () => {
      metricsCollector.setGauge('test_gauge', { instance: 'server1' }, 42.5);
      
      const metrics = metricsCollector.getMetrics('test_gauge');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.type).toBe('gauge');
      expect(metrics[0]?.name).toBe('test_gauge');
      expect(metrics[0]?.labels).toEqual({ instance: 'server1' });
      expect('value' in metrics[0]! ? metrics[0].value : 0).toBe(42.5);
    });

    it('should update gauge value multiple times', () => {
      metricsCollector.setGauge('test_gauge', { instance: 'server1' }, 10);
      metricsCollector.setGauge('test_gauge', { instance: 'server1' }, 20);
      
      const metrics = metricsCollector.getMetrics('test_gauge');
      expect(metrics).toHaveLength(2);
      
      const values = metrics.map(m => 'value' in m ? m.value : 0);
      expect(values).toContain(10);
      expect(values).toContain(20);
    });

    it('should warn when setting unregistered gauge', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      metricsCollector.setGauge('unregistered_gauge', {}, 1);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Gauge metric 'unregistered_gauge' not registered")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Histogram Metrics', () => {
    beforeEach(() => {
      metricsCollector.register({
        name: 'test_histogram',
        type: 'histogram',
        description: 'Test histogram',
        labels: ['operation'],
        buckets: [0.1, 0.5, 1.0, 2.0],
      });
    });

    it('should observe a histogram value', () => {
      metricsCollector.observeHistogram('test_histogram', { operation: 'read' }, 0.3);
      
      const metrics = metricsCollector.getMetrics('test_histogram');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.type).toBe('histogram');
      expect(metrics[0]?.name).toBe('test_histogram');
      expect(metrics[0]?.labels).toEqual({ operation: 'read' });
      
      const histMetric = metrics[0] as any;
      expect(histMetric.sum).toBe(0.3);
      expect(histMetric.count).toBe(1);
      expect(histMetric.buckets).toBeDefined();
    });

    it('should create correct bucket counts', () => {
      metricsCollector.observeHistogram('test_histogram', { operation: 'read' }, 0.3);
      
      const metrics = metricsCollector.getMetrics('test_histogram');
      const histMetric = metrics[0] as any;
      
      // Value 0.3 should be in buckets le_0.5, le_1, le_2, le_+Inf
      // The current implementation sets each bucket to 1 if value <= bucket, 0 otherwise
      expect(histMetric.buckets['le_0.1']).toBe(0); // 0.3 > 0.1
      expect(histMetric.buckets['le_0.5']).toBe(1); // 0.3 <= 0.5
      expect(histMetric.buckets['le_1']).toBe(1); // 0.3 <= 1.0 (key is le_1, not le_1.0)
      expect(histMetric.buckets['le_2']).toBe(1); // 0.3 <= 2.0 (key is le_2, not le_2.0)
      expect(histMetric.buckets['le_+Inf']).toBe(1); // Always 1
    });

    it('should use default buckets when not specified', () => {
      metricsCollector.register({
        name: 'default_histogram',
        type: 'histogram',
        description: 'Default histogram',
        labels: ['operation'],
      });
      
      metricsCollector.observeHistogram('default_histogram', { operation: 'read' }, 0.3);
      
      const metrics = metricsCollector.getMetrics('default_histogram');
      const histMetric = metrics[0] as any;
      
      // Should have default buckets
      expect(histMetric.buckets['le_0.1']).toBe(0);
      expect(histMetric.buckets['le_0.5']).toBe(1);
      expect(histMetric.buckets['le_1']).toBe(1);
    });

    it('should warn when observing unregistered histogram', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      metricsCollector.observeHistogram('unregistered_histogram', {}, 1);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Histogram metric 'unregistered_histogram' not registered")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Timer Metrics', () => {
    beforeEach(() => {
      metricsCollector.register({
        name: 'test_timer',
        type: 'timer',
        description: 'Test timer',
        labels: ['operation'],
      });
    });

    it('should start and end a timer', async () => {
      const timerId = metricsCollector.startTimer('test_timer', { operation: 'read' });
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      metricsCollector.endTimer(timerId, 'test_timer');
      
      const metrics = metricsCollector.getMetrics('test_timer');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.type).toBe('timer');
      expect(metrics[0]?.name).toBe('test_timer');
      expect(metrics[0]?.labels).toEqual({ operation: 'read' });
      
      const timerMetric = metrics[0] as any;
      expect(timerMetric.duration).toBeGreaterThan(0);
      expect(timerMetric.unit).toBe('ms');
    });

    it('should warn when ending non-existent timer', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      metricsCollector.endTimer('non_existent_timer', 'test_timer');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Timer 'non_existent_timer' not found")
      );
      
      consoleSpy.mockRestore();
    });

    it('should warn when ending timer for unregistered metric', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const timerId = metricsCollector.startTimer('test_timer', { operation: 'read' });
      metricsCollector.endTimer(timerId, 'unregistered_timer');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Timer metric 'unregistered_timer' not registered")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      metricsCollector.register({
        name: 'test_timer',
        type: 'timer',
        description: 'Test timer',
        labels: ['operation'],
      });
    });

    it('should time synchronous operations', () => {
      const result = metricsCollector.time('test_timer', { operation: 'sync' }, () => {
        return 'test result';
      });
      
      expect(result).toBe('test result');
      
      const metrics = metricsCollector.getMetrics('test_timer');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.labels).toEqual({ operation: 'sync' });
    });

    it('should time asynchronous operations', async () => {
      const result = await metricsCollector.timeAsync('test_timer', { operation: 'async' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      
      expect(result).toBe('async result');
      
      const metrics = metricsCollector.getMetrics('test_timer');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.labels).toEqual({ operation: 'async' });
    });

    it('should handle exceptions in timed operations', () => {
      expect(() => {
        metricsCollector.time('test_timer', { operation: 'error' }, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
      
      // Timer should still be recorded
      const metrics = metricsCollector.getMetrics('test_timer');
      expect(metrics).toHaveLength(1);
    });
  });

  describe('Metrics Retrieval', () => {
    beforeEach(() => {
      metricsCollector.register({
        name: 'test_counter',
        type: 'counter',
        description: 'Test counter',
        labels: ['status'],
      });
      
      metricsCollector.incrementCounter('test_counter', { status: 'success' }, 5);
    });

    it('should get all metrics', () => {
      const allMetrics = metricsCollector.getAllMetrics();
      
      expect(allMetrics).toBeDefined();
      expect(allMetrics.metrics).toBeDefined();
      expect(allMetrics.timestamp).toBeInstanceOf(Date);
      expect(allMetrics.source).toBe('test-automation-harness');
      expect(allMetrics.metadata).toBeDefined();
      expect(allMetrics.metadata.collectionInterval).toBe(config.interval);
      expect(allMetrics.metadata.totalMetrics).toBeGreaterThan(0);
    });

    it('should get metrics for specific name', () => {
      const metrics = metricsCollector.getMetrics('test_counter');
      
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.name).toBe('test_counter');
      expect(metrics[0]?.type).toBe('counter');
    });

    it('should return empty array for non-existent metric', () => {
      const metrics = metricsCollector.getMetrics('non_existent');
      
      expect(metrics).toHaveLength(0);
    });

    it('should get metrics summary', () => {
      const summary = metricsCollector.getMetricsSummary();
      
      expect(summary).toBeDefined();
      expect(summary.totalMetrics).toBeGreaterThan(0);
      expect(summary.registeredMetrics).toBeGreaterThan(0);
      expect(summary.memoryUsage).toBeGreaterThan(0);
      expect(summary.metricsByType).toBeDefined();
    });
  });

  describe('Prometheus Export', () => {
    beforeEach(() => {
      metricsCollector.register({
        name: 'test_counter',
        type: 'counter',
        description: 'Test counter metric',
        labels: ['status'],
      });
      
      metricsCollector.incrementCounter('test_counter', { status: 'success' }, 5);
    });

    it('should export metrics in Prometheus format', () => {
      const prometheusMetrics = metricsCollector.getPrometheusMetrics();
      
      expect(prometheusMetrics).toContain('# HELP test_counter Test counter metric');
      expect(prometheusMetrics).toContain('# TYPE test_counter counter');
      expect(prometheusMetrics).toContain('test_counter{status="success"} 5');
    });

    it('should handle histogram metrics in Prometheus format', () => {
      metricsCollector.register({
        name: 'test_histogram',
        type: 'histogram',
        description: 'Test histogram',
        labels: ['operation'],
        buckets: [0.1, 0.5, 1.0],
      });
      
      metricsCollector.observeHistogram('test_histogram', { operation: 'read' }, 0.3);
      
      const prometheusMetrics = metricsCollector.getPrometheusMetrics();
      
      expect(prometheusMetrics).toContain('# HELP test_histogram Test histogram');
      expect(prometheusMetrics).toContain('# TYPE test_histogram histogram');
      expect(prometheusMetrics).toContain('test_histogram_bucket');
      expect(prometheusMetrics).toContain('test_histogram_sum');
      expect(prometheusMetrics).toContain('test_histogram_count');
    });
  });

  describe('Cleanup and Management', () => {
    it('should clear all metrics', () => {
      metricsCollector.register({
        name: 'test_counter',
        type: 'counter',
        description: 'Test counter',
        labels: ['status'],
      });
      
      metricsCollector.incrementCounter('test_counter', { status: 'success' }, 5);
      
      expect(metricsCollector.getMetrics('test_counter')).toHaveLength(1);
      
      metricsCollector.clearMetrics();
      
      expect(metricsCollector.getMetrics('test_counter')).toHaveLength(0);
    });

    it('should cleanup resources on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      metricsCollector.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });

    it('should handle disabled metrics correctly', () => {
      const disabledCollector = new MetricsCollector({
        enabled: false,
        interval: 1000,
        retention: 1,
        exportFormat: 'json' as const,
      });
      
      disabledCollector.register({
        name: 'test_counter',
        type: 'counter',
        description: 'Test counter',
        labels: ['status'],
      });
      
      disabledCollector.incrementCounter('test_counter', { status: 'success' }, 5);
      
      const metrics = disabledCollector.getMetrics('test_counter');
      expect(metrics).toHaveLength(0);
      
      disabledCollector.destroy();
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect system metrics when enabled', (done) => {
      // Wait for system metrics collection
      setTimeout(() => {
        const allMetrics = metricsCollector.getAllMetrics();
        const systemMetrics = allMetrics.metrics.filter(m => 
          m.name.includes('system_') || m.name.includes('nodejs_')
        );
        
        expect(systemMetrics.length).toBeGreaterThan(0);
        done();
      }, 1500); // Wait longer than the collection interval
    });
  });
});
