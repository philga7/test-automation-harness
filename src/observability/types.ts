/**
 * Type definitions for the observability system
 * 
 * These types define the structure of metrics, logs, health checks,
 * and reporting data throughout the test automation harness.
 */

/**
 * Base metric interface for all metric types
 */
export interface BaseMetric {
  name: string;
  timestamp: Date;
  labels: Record<string, string>;
}

/**
 * Counter metric - tracks cumulative values
 */
export interface CounterMetric extends BaseMetric {
  type: 'counter';
  value: number;
}

/**
 * Gauge metric - tracks current values
 */
export interface GaugeMetric extends BaseMetric {
  type: 'gauge';
  value: number;
}

/**
 * Histogram metric - tracks distribution of values
 */
export interface HistogramMetric extends BaseMetric {
  type: 'histogram';
  buckets: Record<string, number>;
  sum: number;
  count: number;
}

/**
 * Timer metric - tracks duration measurements
 */
export interface TimerMetric extends BaseMetric {
  type: 'timer';
  duration: number;
  unit: 'ms' | 's' | 'us';
}

/**
 * Union type for all metric types
 */
export type Metric = CounterMetric | GaugeMetric | HistogramMetric | TimerMetric;

/**
 * Aggregated metrics data for API responses
 */
export interface MetricsData {
  metrics: Metric[];
  timestamp: Date;
  source: string;
  metadata: {
    collectionInterval: number;
    totalMetrics: number;
    environment: string;
  };
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context: {
    component: string;
    operation?: string;
    requestId?: string;
    userId?: string;
    testId?: string;
    engineId?: string;
  };
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Health check status for individual components
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  component: string;
  timestamp: Date;
  uptime: number;
  details: {
    version?: string;
    dependencies?: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    metrics?: Record<string, number>;
    lastError?: string;
  };
}

/**
 * System-wide health overview
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: HealthStatus[];
  summary: {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
    unhealthyComponents: number;
    uptime: number;
  };
}

/**
 * Test execution metrics
 */
export interface TestExecutionMetrics {
  testId: string;
  engineType: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metrics: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    healingAttempts: number;
    healingSuccesses: number;
  };
}

/**
 * Healing statistics
 */
export interface HealingStats {
  strategyName: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  averageConfidence: number;
  averageDuration: number;
  failureTypes: Record<string, number>;
}

/**
 * Report generation data
 */
export interface ReportData {
  id: string;
  type: 'test-execution' | 'healing-summary' | 'system-health' | 'performance';
  title: string;
  description: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  data: any; // Flexible data structure based on report type
  metadata: {
    version: string;
    generator: string;
    format: 'json' | 'html' | 'pdf';
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  component: string;
  operation: string;
  timestamp: Date;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    concurrentOperations: number;
  };
}

/**
 * Observability configuration options
 */
export interface ObservabilityConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    endpoint?: string;
    interval: number;
    retention: number; // days
    exportFormat: 'prometheus' | 'json' | 'opentelemetry';
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    file?: string;
    maxFileSize: string;
    maxFiles: number;
    includeStackTrace: boolean;
  };
  tracing: {
    enabled: boolean;
    endpoint?: string;
    sampleRate: number;
    serviceName: string;
  };
  health: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  reporting: {
    enabled: boolean;
    schedule: string; // cron expression
    formats: ('json' | 'html' | 'pdf')[];
    outputDir: string;
    retention: number; // days
  };
}

/**
 * Event types for observability system
 */
export interface ObservabilityEvent {
  type: 'metric' | 'log' | 'health' | 'trace';
  timestamp: Date;
  source: string;
  data: Metric | LogEntry | HealthStatus | any;
}

/**
 * Alert configuration and status
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: {
    metric: string;
    operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
    threshold: number;
    duration: number; // seconds
  };
  actions: {
    type: 'email' | 'webhook' | 'slack';
    target: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  widgets: {
    type: 'metric' | 'chart' | 'table' | 'health' | 'log';
    title: string;
    query: string;
    visualization: 'line' | 'bar' | 'pie' | 'gauge' | 'table';
    timeRange: string;
    refreshInterval: number;
  }[];
}
