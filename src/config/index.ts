/**
 * Configuration management for the Self-Healing Test Automation Harness
 * 
 * This module provides a unified configuration system using YAML files
 * with environment-specific overrides and validation.
 */

import { ConfigurationManager, ConfigurationError } from './ConfigurationManager';
import { AppConfig } from './schemas';
import { logger } from '../utils/logger';

// Global configuration manager instance
let configManager: ConfigurationManager | null = null;
let cachedConfig: AppConfig | null = null;

/**
 * Initialize the configuration system
 */
export async function initializeConfig(
  configPath: string = './config',
  environment: string = process.env['NODE_ENV'] || 'development'
): Promise<AppConfig> {
  try {
    configManager = new ConfigurationManager(configPath, environment);
    cachedConfig = await configManager.loadConfig();
    logger.info(`Configuration initialized for environment: ${environment}`);
    return cachedConfig;
  } catch (error) {
    logger.error('Failed to initialize configuration:', error);
    throw error;
  }
}

/**
 * Get the current configuration
 * @throws {ConfigurationError} If configuration is not initialized
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    throw new ConfigurationError(
      'Configuration not initialized. Call initializeConfig() first.'
    );
  }
  return cachedConfig;
}

/**
 * Get a specific configuration section
 */
export function getConfigSection<T extends keyof AppConfig>(section: T): AppConfig[T] {
  const config = getConfig();
  return config[section];
}

/**
 * Get the configuration manager instance
 */
export function getConfigManager(): ConfigurationManager {
  if (!configManager) {
    throw new ConfigurationError(
      'Configuration manager not initialized. Call initializeConfig() first.'
    );
  }
  return configManager;
}

/**
 * Reload configuration (useful for development)
 */
export async function reloadConfig(): Promise<AppConfig> {
  if (!configManager) {
    throw new ConfigurationError(
      'Configuration manager not initialized. Call initializeConfig() first.'
    );
  }
  
  try {
    cachedConfig = await configManager.reloadConfig();
    logger.info('Configuration reloaded successfully');
    return cachedConfig;
  } catch (error) {
    logger.error('Failed to reload configuration:', error);
    throw error;
  }
}

/**
 * Set the current environment
 */
export function setEnvironment(environment: string): void {
  if (!configManager) {
    throw new ConfigurationError(
      'Configuration manager not initialized. Call initializeConfig() first.'
    );
  }
  
  configManager.setEnvironment(environment);
  // Clear cached config to force reload
  cachedConfig = null;
}

/**
 * Get configuration summary for debugging
 */
export function getConfigSummary(): any {
  if (!configManager) {
    return { error: 'Configuration manager not initialized' };
  }
  return configManager.getConfigSummary();
}

// Legacy compatibility - maintain backward compatibility with existing code
export const config = {
  get port() {
    return getConfig().api.port;
  },
  get nodeEnv() {
    return getConfig().app.environment;
  },
  get logLevel() {
    return getConfig().observability.logging.level;
  },
  get api() {
    return getConfig().api;
  },
  get testEngines() {
    const engines = getConfig().engines;
    return {
      playwright: {
        enabled: engines.playwright.enabled,
        timeout: engines.playwright.timeout,
      },
      jest: {
        enabled: engines.jest.enabled,
        timeout: engines.jest.timeout,
      },
      k6: {
        enabled: engines.k6.enabled,
        timeout: engines.k6.timeout,
      },
      zap: {
        enabled: engines.zap.enabled,
        timeout: engines.zap.timeout,
      },
    };
  },
  get healing() {
    return getConfig().healing;
  },
};

// Export types and classes for external use
export { ConfigurationManager, ConfigurationError } from './ConfigurationManager';
export { AppConfig } from './schemas';
export * from './schemas';
