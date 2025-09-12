/**
 * Metrics collection system for the Self-Healing Test Automation Harness
 * 
 * This service provides comprehensive metrics collection including:
 * - Counter, Gauge, Histogram, and Timer metrics
 * - OpenTelemetry integration
 * - Prometheus-compatible exports
 * - Custom metric registration and collection
 */

import { 
  Metric, 
  CounterMetric, 
  GaugeMetric, 
  HistogramMetric, 
  TimerMetric,
  MetricsData,
  ObservabilityConfig 
} from '../types';

export interface MetricRegistration {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  description: string;
  labels: string[];
  buckets?: number[]; // For histograms
}

export class MetricsCollector {
  private config: ObservabilityConfig['metrics'];
  private metrics: Map<string, Metric[]> = new Map();
  private registrations: Map<string, MetricRegistration> = new Map();
  private timers: Map<string, { start: number; labels: Record<string, string> }> = new Map();
  private collectionInterval?: NodeJS.Timeout;

  constructor(config: ObservabilityConfig['metrics']) {
    this.config = {
      ...config,
      enabled: config.enabled !== undefined ? config.enabled : true,
      interval: config.interval || 5000,
      retention: config.retention || 7,
      exportFormat: config.exportFormat || 'json',
    };

    if (this.config.enabled) {
      this.initializeCollection();
      this.registerDefaultMetrics();
    }
  }

  /**
   * Initialize automatic metrics collection
   */
  private initializeCollection(): void {
    if (this.config.interval > 0) {
      this.collectionInterval = setInterval(() => {
        this.collectSystemMetrics();
        this.cleanupOldMetrics();
      }, this.config.interval);
    }
  }

  /**
   * Register default system metrics
   */
  private registerDefaultMetrics(): void {
    // Test execution metrics
    this.register({
      name: 'test_executions_total',
      type: 'counter',
      description: 'Total number of test executions',
      labels: ['engine', 'status'],
    });

    this.register({
      name: 'test_execution_duration_seconds',
      type: 'histogram',
      description: 'Test execution duration in seconds',
      labels: ['engine', 'test_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
    });

    // Healing metrics
    this.register({
      name: 'healing_attempts_total',
      type: 'counter',
      description: 'Total number of healing attempts',
      labels: ['strategy', 'failure_type', 'success'],
    });

    this.register({
      name: 'healing_success_rate',
      type: 'gauge',
      description: 'Current healing success rate',
      labels: ['strategy'],
    });

    this.register({
      name: 'healing_duration_seconds',
      type: 'histogram',
      description: 'Healing attempt duration in seconds',
      labels: ['strategy', 'failure_type'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });

    // API metrics
    this.register({
      name: 'http_requests_total',
      type: 'counter',
      description: 'Total number of HTTP requests',
      labels: ['method', 'endpoint', 'status_code'],
    });

    this.register({
      name: 'http_request_duration_seconds',
      type: 'histogram',
      description: 'HTTP request duration in seconds',
      labels: ['method', 'endpoint'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    // System metrics
    this.register({
      name: 'system_cpu_usage_percent',
      type: 'gauge',
      description: 'Current CPU usage percentage',
      labels: ['core'],
    });

    this.register({
      name: 'system_memory_usage_bytes',
      type: 'gauge',
      description: 'Current memory usage in bytes',
      labels: ['type'],
    });

    this.register({
      name: 'active_test_engines',
      type: 'gauge',
      description: 'Number of currently active test engines',
      labels: ['engine_type'],
    });
  }

  /**
   * Register a new metric
   */
  register(registration: MetricRegistration): void {
    this.registrations.set(registration.name, registration);
    
    // Initialize empty metrics array for this metric
    if (!this.metrics.has(registration.name)) {
      this.metrics.set(registration.name, []);
    }
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    if (!this.config.enabled) return;

    const registration = this.registrations.get(name);
    if (!registration || registration.type !== 'counter') {
      console.warn(`Counter metric '${name}' not registered`);
      return;
    }

    const metric: CounterMetric = {
      type: 'counter',
      name,
      timestamp: new Date(),
      labels,
      value,
    };

    this.addMetric(name, metric);
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, labels: Record<string, string> = {}, value: number): void {
    if (!this.config.enabled) return;

    const registration = this.registrations.get(name);
    if (!registration || registration.type !== 'gauge') {
      console.warn(`Gauge metric '${name}' not registered`);
      return;
    }

    const metric: GaugeMetric = {
      type: 'gauge',
      name,
      timestamp: new Date(),
      labels,
      value,
    };

    this.addMetric(name, metric);
  }

  /**
   * Observe a value for a histogram metric
   */
  observeHistogram(name: string, labels: Record<string, string> = {}, value: number): void {
    if (!this.config.enabled) return;

    const registration = this.registrations.get(name);
    if (!registration || registration.type !== 'histogram') {
      console.warn(`Histogram metric '${name}' not registered`);
      return;
    }

    // Find or create histogram buckets
    const buckets = registration.buckets || [0.1, 0.5, 1, 2, 5, 10];
    const bucketCounts: Record<string, number> = {};
    
    // Count in appropriate buckets
    buckets.forEach(bucket => {
      const key = `le_${bucket}`;
      bucketCounts[key] = value <= bucket ? 1 : 0;
    });
    bucketCounts['le_+Inf'] = 1;

    const metric: HistogramMetric = {
      type: 'histogram',
      name,
      timestamp: new Date(),
      labels,
      buckets: bucketCounts,
      sum: value,
      count: 1,
    };

    this.addMetric(name, metric);
  }

  /**
   * Start a timer for duration measurement
   */
  startTimer(name: string, labels: Record<string, string> = {}): string {
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, {
      start: performance.now(),
      labels,
    });
    return timerId;
  }

  /**
   * End a timer and record the duration
   */
  endTimer(timerId: string, name: string): void {
    if (!this.config.enabled) return;

    const timer = this.timers.get(timerId);
    if (!timer) {
      console.warn(`Timer '${timerId}' not found`);
      return;
    }

    const duration = performance.now() - timer.start;
    this.timers.delete(timerId);

    const registration = this.registrations.get(name);
    if (!registration || registration.type !== 'timer') {
      console.warn(`Timer metric '${name}' not registered`);
      return;
    }

    const metric: TimerMetric = {
      type: 'timer',
      name,
      timestamp: new Date(),
      labels: timer.labels,
      duration,
      unit: 'ms',
    };

    this.addMetric(name, metric);

    // Also observe as histogram if histogram exists
    const histogramName = `${name}_duration_seconds`;
    if (this.registrations.has(histogramName)) {
      this.observeHistogram(histogramName, timer.labels, duration / 1000);
    }
  }

  /**
   * Convenience method for timing operations
   */
  time<T>(name: string, labels: Record<string, string> = {}, operation: () => T): T {
    const timerId = this.startTimer(name, labels);
    try {
      return operation();
    } finally {
      this.endTimer(timerId, name);
    }
  }

  /**
   * Convenience method for timing async operations
   */
  async timeAsync<T>(name: string, labels: Record<string, string> = {}, operation: () => Promise<T>): Promise<T> {
    const timerId = this.startTimer(name, labels);
    try {
      return await operation();
    } finally {
      this.endTimer(timerId, name);
    }
  }

  /**
   * Add a metric to the collection
   */
  private addMetric(name: string, metric: Metric): void {
    const metrics = this.metrics.get(name) || [];
    metrics.push(metric);
    this.metrics.set(name, metrics);
  }

  /**
   * Collect system metrics (CPU, memory, etc.)
   */
  private collectSystemMetrics(): void {
    try {
      // Collect memory usage
      const memUsage = process.memoryUsage();
      this.setGauge('system_memory_usage_bytes', { type: 'rss' }, memUsage.rss);
      this.setGauge('system_memory_usage_bytes', { type: 'heap_used' }, memUsage.heapUsed);
      this.setGauge('system_memory_usage_bytes', { type: 'heap_total' }, memUsage.heapTotal);
      this.setGauge('system_memory_usage_bytes', { type: 'external' }, memUsage.external);

      // Collect CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.setGauge('system_cpu_usage_percent', { type: 'user' }, cpuUsage.user / 1000);
      this.setGauge('system_cpu_usage_percent', { type: 'system' }, cpuUsage.system / 1000);

      // Collect event loop lag
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        this.setGauge('nodejs_eventloop_lag_seconds', {}, lag / 1000);
      });

    } catch (error) {
      console.warn('Failed to collect system metrics:', error);
    }
  }

  /**
   * Clean up old metrics based on retention policy
   */
  private cleanupOldMetrics(): void {
    const retentionMs = this.config.retention * 24 * 60 * 60 * 1000; // Convert days to ms
    const cutoff = new Date(Date.now() - retentionMs);

    this.metrics.forEach((metrics, name) => {
      const filtered = metrics.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(name, filtered);
    });
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): MetricsData {
    const allMetrics: Metric[] = [];
    
    this.metrics.forEach((metrics) => {
      allMetrics.push(...metrics);
    });

    return {
      metrics: allMetrics,
      timestamp: new Date(),
      source: 'test-automation-harness',
      metadata: {
        collectionInterval: this.config.interval,
        totalMetrics: allMetrics.length,
        environment: process.env['NODE_ENV'] || 'development',
      },
    };
  }

  /**
   * Get metrics for a specific metric name
   */
  getMetrics(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    this.registrations.forEach((registration, name) => {
      const metrics = this.metrics.get(name) || [];
      
      if (metrics.length === 0) return;

      // Add HELP line
      lines.push(`# HELP ${name} ${registration.description}`);
      lines.push(`# TYPE ${name} ${registration.type}`);

      // Add metrics
      metrics.forEach(metric => {
        const labelPairs = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        
        const labelString = labelPairs ? `{${labelPairs}}` : '';

        if (metric.type === 'histogram') {
          const histMetric = metric as HistogramMetric;
          
          // Add bucket metrics
          Object.entries(histMetric.buckets).forEach(([bucket, count]) => {
            lines.push(`${name}_bucket{${labelPairs ? labelPairs + ',' : ''}le="${bucket}"} ${count}`);
          });
          
          // Add sum and count
          lines.push(`${name}_sum${labelString} ${histMetric.sum}`);
          lines.push(`${name}_count${labelString} ${histMetric.count}`);
        } else {
          const value = 'value' in metric ? metric.value : 
                       'duration' in metric ? metric.duration : 0;
          lines.push(`${name}${labelString} ${value}`);
        }
      });

      lines.push(''); // Empty line between metrics
    });

    return lines.join('\n');
  }

  /**
   * Get metric registrations
   */
  getRegistrations(): MetricRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get metrics summary statistics
   */
  getMetricsSummary(): {
    totalMetrics: number;
    metricsByType: Record<string, number>;
    registeredMetrics: number;
    memoryUsage: number;
  } {
    let totalMetrics = 0;
    const metricsByType: Record<string, number> = {};

    this.metrics.forEach((metrics) => {
      totalMetrics += metrics.length;
      metrics.forEach(metric => {
        metricsByType[metric.type] = (metricsByType[metric.type] || 0) + 1;
      });
    });

    return {
      totalMetrics,
      metricsByType,
      registeredMetrics: this.registrations.size,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined!;
    }
    
    this.metrics.clear();
    this.timers.clear();
  }
}
