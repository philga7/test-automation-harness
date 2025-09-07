/**
 * Core TypeScript interfaces for the Self-Healing Test Automation Harness
 * 
 * These interfaces define the contracts that all plugins must implement,
 * enabling a flexible and extensible plugin architecture.
 */

import { 
  TestResult, 
  TestConfig, 
  HealingResult, 
  TestType,
  TestFailure,
  EngineConfig,
  EngineHealth,
  FailureType,
  HealingContext,
  ValidationResult,
  PluginContext,
  PluginHealth,
  PluginMetrics
} from './types';

/**
 * Core interface for all test engines
 * 
 * This is the main contract that every test engine (Playwright, Jest, k6, etc.)
 * must implement. It defines the essential operations for test execution
 * and self-healing capabilities.
 */
export interface ITestEngine {
  /** Unique identifier for the test engine */
  readonly name: string;
  
  /** Version of the test engine */
  readonly version: string;
  
  /** Type of tests this engine can handle */
  readonly testType: TestType;
  
  /** Whether this engine supports self-healing */
  readonly supportsHealing: boolean;
  
  /**
   * Execute tests using this engine
   * @param config - Test configuration
   * @returns Promise resolving to test results
   */
  execute(config: TestConfig): Promise<TestResult>;
  
  /**
   * Attempt to heal a failed test
   * @param failure - Information about the test failure
   * @returns Promise resolving to healing result
   */
  heal?(failure: TestFailure): Promise<HealingResult>;
  
  /**
   * Initialize the test engine
   * @param config - Engine-specific configuration
   */
  initialize(config: EngineConfig): Promise<void>;
  
  /**
   * Clean up resources used by the engine
   */
  cleanup(): Promise<void>;
  
  /**
   * Get engine health status
   */
  getHealth(): Promise<EngineHealth>;
}

/**
 * Interface for healing strategies
 * 
 * Healing strategies define how the system should attempt to recover
 * from test failures. Different strategies can be used for different
 * types of failures.
 */
export interface IHealingStrategy {
  /** Unique identifier for the healing strategy */
  readonly name: string;
  
  /** Version of the healing strategy */
  readonly version: string;
  
  /** Types of failures this strategy can handle */
  readonly supportedFailureTypes: FailureType[];
  
  /**
   * Attempt to heal a test failure
   * @param failure - Information about the test failure
   * @param context - Additional context for healing decisions
   * @returns Promise resolving to healing result
   */
  heal(failure: TestFailure, context: HealingContext): Promise<HealingResult>;
  
  /**
   * Calculate confidence score for healing attempt
   * @param failure - Information about the test failure
   * @param context - Additional context for healing decisions
   * @returns Confidence score between 0 and 1
   */
  calculateConfidence(failure: TestFailure, context: HealingContext): Promise<number>;
  
  /**
   * Check if this strategy can handle the given failure
   * @param failure - Information about the test failure
   * @returns True if strategy can handle this failure type
   */
  canHeal(failure: TestFailure): boolean;
}

/**
 * Interface for configuration providers
 * 
 * Configuration providers abstract how configuration is loaded and managed,
 * allowing for different sources (files, databases, APIs, etc.)
 */
export interface IConfigurationProvider {
  /** Unique identifier for the configuration provider */
  readonly name: string;
  
  /** Version of the configuration provider */
  readonly version: string;
  
  /**
   * Load configuration from the provider
   * @param source - Configuration source identifier
   * @returns Promise resolving to configuration object
   */
  loadConfig(source: string): Promise<TestConfig>;
  
  /**
   * Save configuration to the provider
   * @param source - Configuration source identifier
   * @param config - Configuration to save
   */
  saveConfig(source: string, config: TestConfig): Promise<void>;
  
  /**
   * Validate configuration
   * @param config - Configuration to validate
   * @returns Validation result with any errors
   */
  validateConfig(config: TestConfig): ValidationResult;
  
  /**
   * Watch for configuration changes
   * @param source - Configuration source identifier
   * @param callback - Callback to invoke when configuration changes
   */
  watchConfig(source: string, callback: (config: TestConfig) => void): void;
}

/**
 * Interface for plugin metadata
 * 
 * This interface provides metadata about plugins for registration
 * and discovery purposes.
 */
export interface IPluginMetadata {
  /** Plugin name */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin description */
  description: string;
  
  /** Plugin author */
  author: string;
  
  /** Plugin dependencies */
  dependencies: string[];
  
  /** Plugin capabilities */
  capabilities: string[];
  
  /** Plugin configuration schema */
  configSchema?: Record<string, any>;
}

/**
 * Interface for plugin lifecycle management
 * 
 * This interface defines the lifecycle methods that plugins
 * can implement for initialization and cleanup.
 */
export interface IPluginLifecycle {
  /**
   * Initialize the plugin
   * @param context - Plugin initialization context
   */
  initialize(context: PluginContext): Promise<void>;
  
  /**
   * Clean up plugin resources
   */
  destroy(): Promise<void>;
  
  /**
   * Get plugin health status
   */
  getHealth(): Promise<PluginHealth>;
}

/**
 * Interface for observable plugins
 * 
 * This interface allows plugins to emit events and metrics
 * for observability and monitoring.
 */
export interface IObservablePlugin {
  /**
   * Emit an event
   * @param event - Event to emit
   * @param data - Event data
   */
  emit(event: string, data: any): void;
  
  /**
   * Get plugin metrics
   */
  getMetrics(): Promise<PluginMetrics>;
}
