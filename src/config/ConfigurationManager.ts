/**
 * Configuration Manager for the Self-Healing Test Automation Harness
 * Handles YAML configuration loading, validation, and environment-specific merging
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { logger } from '../utils/logger';
import {
  AppConfig,
  DEFAULT_CONFIG,
  CONFIG_VALIDATION_RULES,
  EnvironmentConfig,
} from './schemas';

export class ConfigurationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConfigurationManager {
  private config: AppConfig | null = null;
  private configPath: string;
  private environment: string;

  constructor(configPath: string = './config', environment: string = 'development') {
    this.configPath = configPath;
    this.environment = environment;
  }

  /**
   * Load and merge configuration from YAML files
   */
  async loadConfig(): Promise<AppConfig> {
    try {
      logger.info(`Loading configuration for environment: ${this.environment}`);

      // Start with default configuration
      let mergedConfig = this.deepMerge({}, DEFAULT_CONFIG) as AppConfig;

      // Load base configuration
      const baseConfigPath = path.join(this.configPath, 'default.yaml');
      if (fs.existsSync(baseConfigPath)) {
        const baseConfig = await this.loadYamlFile(baseConfigPath);
        mergedConfig = this.deepMerge(mergedConfig, baseConfig);
        logger.info('Loaded base configuration from default.yaml');
      }

      // Load environment-specific configuration
      const envConfigPath = path.join(this.configPath, `${this.environment}.yaml`);
      if (fs.existsSync(envConfigPath)) {
        const envConfig = await this.loadYamlFile(envConfigPath);
        mergedConfig = this.deepMerge(mergedConfig, envConfig);
        logger.info(`Loaded environment configuration from ${this.environment}.yaml`);
      }

      // Apply environment variables overrides
      mergedConfig = this.applyEnvironmentOverrides(mergedConfig);

      // Validate the final configuration
      this.validateConfig(mergedConfig);

      this.config = mergedConfig;
      logger.info('Configuration loaded and validated successfully');
      return mergedConfig;
    } catch (error) {
      logger.error('Failed to load configuration:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(`Failed to load configuration: ${errorMessage}`);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get a specific configuration section
   */
  getSection<T>(section: keyof AppConfig): T {
    const config = this.getConfig();
    return config[section] as T;
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(envName: string): EnvironmentConfig | undefined {
    const config = this.getConfig();
    return config.environments[envName];
  }

  /**
   * Reload configuration (useful for development)
   */
  async reloadConfig(): Promise<AppConfig> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Set the current environment
   */
  setEnvironment(environment: string): void {
    this.environment = environment;
    logger.info(`Environment changed to: ${environment}`);
  }

  /**
   * Load a YAML file and parse it
   */
  private async loadYamlFile(filePath: string): Promise<any> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = yaml.load(fileContent);
      
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(`Invalid YAML structure in ${filePath}`);
      }

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(`Failed to load YAML file ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          result[key] &&
          typeof result[key] === 'object' &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: AppConfig): AppConfig {
    const overrides: any = {};

    // Map environment variables to config paths
    const envMappings = {
      'APP_NAME': 'app.name',
      'APP_VERSION': 'app.version',
      'APP_ENVIRONMENT': 'app.environment',
      'APP_DEBUG': 'app.debug',
      'API_PORT': 'api.port',
      'API_TIMEOUT': 'api.timeout',
      'API_RETRIES': 'api.retries',
      'HEALING_ENABLED': 'healing.enabled',
      'HEALING_CONFIDENCE_THRESHOLD': 'healing.confidenceThreshold',
      'HEALING_MAX_RETRIES': 'healing.maxRetries',
      'PLAYWRIGHT_ENABLED': 'engines.playwright.enabled',
      'PLAYWRIGHT_TIMEOUT': 'engines.playwright.timeout',
      'PLAYWRIGHT_HEADLESS': 'engines.playwright.headless',
      'JEST_ENABLED': 'engines.jest.enabled',
      'JEST_TIMEOUT': 'engines.jest.timeout',
      'K6_ENABLED': 'engines.k6.enabled',
      'K6_TIMEOUT': 'engines.k6.timeout',
      'ZAP_ENABLED': 'engines.zap.enabled',
      'ZAP_TIMEOUT': 'engines.zap.timeout',
      'LOG_LEVEL': 'observability.logging.level',
      'METRICS_ENABLED': 'observability.metrics.enabled',
    };

    // Apply environment variable overrides
    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(overrides, configPath, this.parseEnvValue(value));
      }
    }

    return this.deepMerge(config, overrides);
  }

  /**
   * Set a nested value in an object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && !(key in current)) {
        current[key] = {};
      }
      if (key) {
        current = current[key];
      }
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private parseEnvValue(value: string): any {
    // Boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Numeric values
    if (!isNaN(Number(value))) return Number(value);

    // String values
    return value;
  }

  /**
   * Validate configuration against schema rules
   */
  private validateConfig(config: AppConfig): void {
    logger.info('Validating configuration...');

    for (const rule of CONFIG_VALIDATION_RULES) {
      const value = this.getNestedValue(config, rule.field);
      
      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        throw new ConfigurationError(
          `Required field '${rule.field}' is missing`,
          rule.field
        );
      }

      // Skip validation if value is undefined and not required
      if (value === undefined) continue;

      // Type validation
      if (!this.validateType(value, rule.type)) {
        throw new ConfigurationError(
          `Field '${rule.field}' must be of type ${rule.type}, got ${typeof value}`,
          rule.field,
          value
        );
      }

      // Numeric range validation
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          throw new ConfigurationError(
            `Field '${rule.field}' must be >= ${rule.min}, got ${value}`,
            rule.field,
            value
          );
        }
        if (rule.max !== undefined && value > rule.max) {
          throw new ConfigurationError(
            `Field '${rule.field}' must be <= ${rule.max}, got ${value}`,
            rule.field,
            value
          );
        }
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        throw new ConfigurationError(
          `Field '${rule.field}' must be one of [${rule.enum.join(', ')}], got ${value}`,
          rule.field,
          value
        );
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        throw new ConfigurationError(
          `Field '${rule.field}' does not match required pattern`,
          rule.field,
          value
        );
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          const message = typeof result === 'string' ? result : `Custom validation failed for field '${rule.field}'`;
          throw new ConfigurationError(message, rule.field, value);
        }
      }
    }

    logger.info('Configuration validation passed');
  }

  /**
   * Get a nested value from an object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate value type
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Export current configuration to YAML
   */
  exportToYaml(outputPath: string): void {
    if (!this.config) {
      throw new ConfigurationError('No configuration to export');
    }

    try {
      const yamlContent = yaml.dump(this.config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });

      fs.writeFileSync(outputPath, yamlContent, 'utf8');
      logger.info(`Configuration exported to ${outputPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(`Failed to export configuration: ${errorMessage}`);
    }
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): any {
    if (!this.config) {
      return { error: 'Configuration not loaded' };
    }

    return {
      environment: this.environment,
      app: {
        name: this.config.app.name,
        version: this.config.app.version,
        environment: this.config.app.environment,
        debug: this.config.app.debug,
      },
      engines: {
        playwright: { enabled: this.config.engines.playwright.enabled },
        jest: { enabled: this.config.engines.jest.enabled },
        k6: { enabled: this.config.engines.k6.enabled },
        zap: { enabled: this.config.engines.zap.enabled },
      },
      healing: {
        enabled: this.config.healing.enabled,
        confidenceThreshold: this.config.healing.confidenceThreshold,
        maxRetries: this.config.healing.maxRetries,
      },
      api: {
        enabled: this.config.api.enabled,
        port: this.config.api.port,
      },
    };
  }
}
