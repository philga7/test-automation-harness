/**
 * Type definitions for the Self-Healing Test Automation Harness
 * 
 * This file contains all the core types used throughout the system,
 * providing a consistent type system for test results, healing actions,
 * configuration, and plugin metadata.
 */

/**
 * Types of tests supported by the system
 */
export type TestType = 'unit' | 'integration' | 'e2e' | 'performance' | 'security';

/**
 * Types of test failures that can occur
 */
export type FailureType = 
  | 'element_not_found'
  | 'timeout'
  | 'assertion_failed'
  | 'network_error'
  | 'configuration_error'
  | 'environment_error'
  | 'unknown';

/**
 * Test execution status
 */
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'timeout';

/**
 * Healing action types
 */
export type HealingActionType = 
  | 'retry'
  | 'update_selector'
  | 'wait_for_element'
  | 'update_configuration'
  | 'skip_test'
  | 'fallback_strategy';

/**
 * Confidence level for healing actions
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Test configuration interface
 */
export interface TestConfig {
  /** Test name */
  name: string;
  
  /** Test type */
  type: TestType;
  
  /** Test file path */
  filePath: string;
  
  /** Test timeout in milliseconds */
  timeout: number;
  
  /** Test environment */
  environment: string;
  
  /** Test parameters */
  parameters: Record<string, any>;
  
  /** Engine-specific configuration */
  engineConfig: EngineConfig;
  
  /** Healing configuration */
  healingConfig: HealingConfig;
  
  /** Retry configuration */
  retryConfig: RetryConfig;
}

/**
 * Engine-specific configuration
 */
export interface EngineConfig {
  /** Engine name */
  engine: string;
  
  /** Engine version */
  version?: string;
  
  /** Engine-specific settings */
  settings: Record<string, any>;
  
  /** Browser configuration (for browser-based engines) */
  browser?: BrowserConfig;
  
  /** Network configuration */
  network?: NetworkConfig;
}

/**
 * Browser configuration
 */
export interface BrowserConfig {
  /** Browser type */
  type: 'chromium' | 'firefox' | 'webkit' | 'chrome' | 'edge';
  
  /** Browser version */
  version?: string;
  
  /** Headless mode */
  headless: boolean;
  
  /** Viewport size */
  viewport: {
    width: number;
    height: number;
  };
  
  /** User agent */
  userAgent?: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  /** Request timeout */
  timeout: number;
  
  /** Retry attempts */
  retries: number;
  
  /** Proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

/**
 * Healing configuration
 */
export interface HealingConfig {
  /** Whether healing is enabled */
  enabled: boolean;
  
  /** Confidence threshold for healing actions */
  confidenceThreshold: number;
  
  /** Maximum number of healing attempts */
  maxAttempts: number;
  
  /** Healing strategies to use */
  strategies: string[];
  
  /** Healing timeout */
  timeout: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  
  /** Retry delay in milliseconds */
  delay: number;
  
  /** Retry backoff multiplier */
  backoffMultiplier: number;
  
  /** Maximum retry delay */
  maxDelay: number;
}

/**
 * Test result interface
 */
export interface TestResult {
  /** Test identifier */
  id: string;
  
  /** Test name */
  name: string;
  
  /** Test status */
  status: TestStatus;
  
  /** Test start time */
  startTime: Date;
  
  /** Test end time */
  endTime?: Date;
  
  /** Test duration in milliseconds */
  duration?: number;
  
  /** Test output */
  output: string;
  
  /** Test errors */
  errors: TestError[];
  
  /** Test metrics */
  metrics: TestMetrics;
  
  /** Healing attempts made */
  healingAttempts: HealingAttempt[];
  
  /** Test artifacts */
  artifacts: TestArtifact[];
}

/**
 * Test error interface
 */
export interface TestError {
  /** Error message */
  message: string;
  
  /** Error stack trace */
  stack?: string;
  
  /** Error type */
  type: FailureType;
  
  /** Error timestamp */
  timestamp: Date;
  
  /** Error context */
  context: Record<string, any>;
}

/**
 * Test metrics interface
 */
export interface TestMetrics {
  /** Memory usage in MB */
  memoryUsage: number;
  
  /** CPU usage percentage */
  cpuUsage: number;
  
  /** Network requests count */
  networkRequests: number;
  
  /** Page load time in milliseconds */
  pageLoadTime?: number;
  
  /** Custom metrics */
  custom: Record<string, number>;
}

/**
 * Test artifact interface
 */
export interface TestArtifact {
  /** Artifact type */
  type: 'screenshot' | 'video' | 'log' | 'report' | 'trace';
  
  /** Artifact path */
  path: string;
  
  /** Artifact size in bytes */
  size: number;
  
  /** Artifact metadata */
  metadata: Record<string, any>;
}

/**
 * Test failure interface
 */
export interface TestFailure {
  /** Failure identifier */
  id: string;
  
  /** Test identifier */
  testId: string;
  
  /** Failure type */
  type: FailureType;
  
  /** Failure message */
  message: string;
  
  /** Failure stack trace */
  stack?: string;
  
  /** Failure timestamp */
  timestamp: Date;
  
  /** Failure context */
  context: FailureContext;
  
  /** Previous healing attempts */
  previousAttempts: HealingAttempt[];
}

/**
 * Failure context interface
 */
export interface FailureContext {
  /** Test configuration at time of failure */
  testConfig: TestConfig;
  
  /** Browser state (for browser-based tests) */
  browserState?: BrowserState;
  
  /** Network state */
  networkState?: NetworkState;
  
  /** Environment information */
  environment: EnvironmentInfo;
  
  /** Custom context data */
  custom: Record<string, any>;
}

/**
 * Browser state interface
 */
export interface BrowserState {
  /** Current URL */
  url: string;
  
  /** Page title */
  title: string;
  
  /** Viewport size */
  viewport: {
    width: number;
    height: number;
  };
  
  /** DOM snapshot */
  domSnapshot?: string;
  
  /** Console logs */
  consoleLogs: ConsoleLog[];
}

/**
 * Network state interface
 */
export interface NetworkState {
  /** Active requests */
  activeRequests: NetworkRequest[];
  
  /** Failed requests */
  failedRequests: NetworkRequest[];
  
  /** Network conditions */
  conditions: {
    offline: boolean;
    latency: number;
    downloadThroughput: number;
    uploadThroughput: number;
  };
}

/**
 * Environment information interface
 */
export interface EnvironmentInfo {
  /** Operating system */
  os: string;
  
  /** Node.js version */
  nodeVersion: string;
  
  /** Test environment */
  environment: string;
  
  /** Available memory */
  availableMemory: number;
  
  /** CPU count */
  cpuCount: number;
}

/**
 * Console log interface
 */
export interface ConsoleLog {
  /** Log level */
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  
  /** Log message */
  message: string;
  
  /** Log timestamp */
  timestamp: Date;
  
  /** Log arguments */
  args: any[];
}

/**
 * Network request interface
 */
export interface NetworkRequest {
  /** Request URL */
  url: string;
  
  /** Request method */
  method: string;
  
  /** Request headers */
  headers: Record<string, string>;
  
  /** Request body */
  body?: string;
  
  /** Response status */
  status?: number;
  
  /** Response headers */
  responseHeaders?: Record<string, string>;
  
  /** Response body */
  responseBody?: string;
  
  /** Request timestamp */
  timestamp: Date;
  
  /** Request duration */
  duration?: number;
}

/**
 * Healing result interface
 */
export interface HealingResult {
  /** Healing attempt identifier */
  id: string;
  
  /** Whether healing was successful */
  success: boolean;
  
  /** Healing actions taken */
  actions: HealingAction[];
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Healing duration in milliseconds */
  duration: number;
  
  /** Healing message */
  message: string;
  
  /** Healing metadata */
  metadata: Record<string, any>;
}

/**
 * Healing action interface
 */
export interface HealingAction {
  /** Action type */
  type: HealingActionType;
  
  /** Action description */
  description: string;
  
  /** Action parameters */
  parameters: Record<string, any>;
  
  /** Action timestamp */
  timestamp: Date;
  
  /** Action result */
  result: 'success' | 'failure' | 'skipped';
  
  /** Action message */
  message?: string;
}

/**
 * Healing attempt interface
 */
export interface HealingAttempt {
  /** Attempt identifier */
  id: string;
  
  /** Attempt number */
  attemptNumber: number;
  
  /** Strategy used */
  strategy: string;
  
  /** Attempt result */
  result: HealingResult;
  
  /** Attempt timestamp */
  timestamp: Date;
}

/**
 * Healing context interface
 */
export interface HealingContext {
  /** Available healing strategies */
  availableStrategies: string[];
  
  /** Previous healing attempts */
  previousAttempts: HealingAttempt[];
  
  /** System state */
  systemState: SystemState;
  
  /** User preferences */
  userPreferences: UserPreferences;
}

/**
 * System state interface
 */
export interface SystemState {
  /** Current load */
  load: number;
  
  /** Available resources */
  resources: {
    memory: number;
    cpu: number;
    disk: number;
  };
  
  /** Active tests */
  activeTests: number;
  
  /** Queue length */
  queueLength: number;
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  /** Preferred healing strategies */
  preferredStrategies: string[];
  
  /** Risk tolerance */
  riskTolerance: 'low' | 'medium' | 'high';
  
  /** Notification preferences */
  notifications: {
    onHealingAttempt: boolean;
    onHealingSuccess: boolean;
    onHealingFailure: boolean;
  };
}

/**
 * Plugin context interface
 */
export interface PluginContext {
  /** Plugin registry */
  registry: any; // Will be typed when we implement the registry
  
  /** Configuration provider */
  configProvider: any; // Will be typed when we implement the config provider
  
  /** Logger instance */
  logger: any; // Will be typed when we implement the logger
  
  /** Event emitter */
  eventEmitter: any; // Will be typed when we implement the event emitter
}

/**
 * Engine health interface
 */
export interface EngineHealth {
  /** Health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Health message */
  message: string;
  
  /** Health metrics */
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
  };
  
  /** Health timestamp */
  timestamp: Date;
}

/**
 * Plugin health interface
 */
export interface PluginHealth {
  /** Health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Health message */
  message: string;
  
  /** Health metrics */
  metrics: Record<string, any>;
  
  /** Health timestamp */
  timestamp: Date;
}

/**
 * Plugin metrics interface
 */
export interface PluginMetrics {
  /** Execution count */
  executionCount: number;
  
  /** Success rate */
  successRate: number;
  
  /** Average execution time */
  averageExecutionTime: number;
  
  /** Error count */
  errorCount: number;
  
  /** Custom metrics */
  custom: Record<string, number>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  /** Error path */
  path: string;
  
  /** Error message */
  message: string;
  
  /** Error code */
  code: string;
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  /** Warning path */
  path: string;
  
  /** Warning message */
  message: string;
  
  /** Warning code */
  code: string;
}
