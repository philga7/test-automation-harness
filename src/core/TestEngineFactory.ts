/**
 * Factory pattern for test engine instantiation
 * 
 * This class provides a centralized way to create and configure test engines
 * based on configuration and requirements.
 */

import { 
  ITestEngine, 
  TestType, 
  EngineConfig,
  IPluginMetadata 
} from '../types';
// TestEngine import removed as it's not used directly
import { PluginRegistry } from './PluginRegistry';
import { logger } from '../utils/logger';

/**
 * Factory for creating test engines
 * 
 * This factory provides methods to create test engines based on configuration
 * and automatically registers them with the plugin registry.
 */
export class TestEngineFactory {
  private registry: PluginRegistry;
  private engineConstructors: Map<string, new (...args: any[]) => ITestEngine> = new Map();
  
  constructor(registry: PluginRegistry) {
    this.registry = registry;
    logger.info('Created TestEngineFactory');
  }
  
  /**
   * Register an engine constructor
   * 
   * @param engineType - The type of engine (e.g., 'playwright', 'jest')
   * @param constructor - The constructor function for the engine
   */
  public registerEngineConstructor(
    engineType: string, 
    constructor: new (...args: any[]) => ITestEngine
  ): void {
    this.engineConstructors.set(engineType, constructor);
    logger.info(`Registered engine constructor: ${engineType}`);
  }
  
  /**
   * Create a test engine from configuration
   * 
   * @param config - The engine configuration
   * @param metadata - Optional metadata for the engine
   * @returns The created and registered test engine
   */
  public async createEngine(config: EngineConfig, metadata?: IPluginMetadata): Promise<ITestEngine> {
    try {
      logger.info(`Creating test engine: ${config.engine}`);
      
      // Get the constructor for this engine type
      const Constructor = this.engineConstructors.get(config.engine);
      if (!Constructor) {
        throw new Error(`Unknown engine type: ${config.engine}`);
      }
      
      // Create the engine instance
      const engine = new Constructor();
      
      // Initialize the engine with configuration
      await engine.initialize(config);
      
      // Register the engine with the registry
      this.registry.registerTestEngine(engine, metadata);
      
      logger.info(`Successfully created and registered test engine: ${config.engine}`);
      return engine;
    } catch (error) {
      logger.error(`Failed to create test engine ${config.engine}:`, error);
      throw new Error(`Failed to create test engine ${config.engine}: ${error}`);
    }
  }
  
  /**
   * Create multiple test engines from configuration array
   * 
   * @param configs - Array of engine configurations
   * @param metadata - Optional metadata for the engines
   * @returns Array of created and registered test engines
   */
  public async createEngines(
    configs: EngineConfig[], 
    metadata?: IPluginMetadata
  ): Promise<ITestEngine[]> {
    logger.info(`Creating ${configs.length} test engines`);
    
    const engines: ITestEngine[] = [];
    
    for (const config of configs) {
      try {
        const engine = await this.createEngine(config, metadata);
        engines.push(engine);
      } catch (error) {
        logger.error(`Failed to create engine ${config.engine}, skipping:`, error);
        // Continue with other engines even if one fails
      }
    }
    
    logger.info(`Successfully created ${engines.length} out of ${configs.length} test engines`);
    return engines;
  }
  
  /**
   * Create a test engine by type
   * 
   * @param engineType - The type of engine to create
   * @param testType - The type of tests this engine will run
   * @param supportsHealing - Whether this engine supports healing
   * @param customConfig - Custom configuration for the engine
   * @returns The created test engine
   */
  public async createEngineByType(
    engineType: string,
    _testType: TestType,
    _supportsHealing: boolean = false,
    customConfig: Partial<EngineConfig> = {}
  ): Promise<ITestEngine> {
    const config: EngineConfig = {
      engine: engineType,
      version: '1.0.0',
      settings: {},
      ...customConfig,
    };
    
    return this.createEngine(config);
  }
  
  /**
   * Get available engine types
   * 
   * @returns Array of available engine types
   */
  public getAvailableEngineTypes(): string[] {
    return Array.from(this.engineConstructors.keys());
  }
  
  /**
   * Check if an engine type is available
   * 
   * @param engineType - The engine type to check
   * @returns True if the engine type is available
   */
  public isEngineTypeAvailable(engineType: string): boolean {
    return this.engineConstructors.has(engineType);
  }
  
  /**
   * Get engine constructor
   * 
   * @param engineType - The engine type
   * @returns The engine constructor or undefined if not found
   */
  public getEngineConstructor(engineType: string): (new (...args: any[]) => ITestEngine) | undefined {
    return this.engineConstructors.get(engineType);
  }
  
  /**
   * Create a default engine configuration
   * 
   * @param engineType - The engine type
   * @param testType - The test type
   * @returns Default engine configuration
   */
  public createDefaultConfig(engineType: string, _testType: TestType): EngineConfig {
    const baseConfig: EngineConfig = {
      engine: engineType,
      version: '1.0.0',
      settings: {},
    };
    
    // Add engine-specific default settings
    switch (engineType) {
      case 'playwright':
        baseConfig.settings = {
          headless: true,
          timeout: 30000,
          retries: 2,
        };
        baseConfig.browser = {
          type: 'chromium',
          headless: true,
          viewport: { width: 1280, height: 720 },
        };
        break;
        
      case 'jest':
        baseConfig.settings = {
          timeout: 10000,
          verbose: true,
          collectCoverage: false,
        };
        break;
        
      case 'k6':
        baseConfig.settings = {
          vus: 1,
          duration: '30s',
          threshold: {
            http_req_duration: ['p(95)<2000'],
          },
        };
        break;
        
      case 'zap':
        baseConfig.settings = {
          timeout: 120000,
          context: 'default',
          policy: 'default',
        };
        break;
    }
    
    return baseConfig;
  }
  
  /**
   * Validate engine configuration
   * 
   * @param config - The engine configuration to validate
   * @returns Validation result
   */
  public validateEngineConfig(config: EngineConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!config.engine) {
      errors.push('Engine type is required');
    }
    
    if (!config.version) {
      warnings.push('Engine version is not specified, using default');
    }
    
    // Check if engine type is available
    if (config.engine && !this.isEngineTypeAvailable(config.engine)) {
      errors.push(`Unknown engine type: ${config.engine}`);
    }
    
    // Validate engine-specific settings
    if (config.engine) {
      const engineErrors = this.validateEngineSpecificSettings(config);
      errors.push(...engineErrors);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Validate engine-specific settings
   * 
   * @param config - The engine configuration
   * @returns Array of validation errors
   */
  private validateEngineSpecificSettings(config: EngineConfig): string[] {
    const errors: string[] = [];
    
    switch (config.engine) {
      case 'playwright':
        if (!config.browser) {
          errors.push('Browser configuration is required for Playwright engine');
        } else {
          if (!config.browser.type) {
            errors.push('Browser type is required for Playwright engine');
          }
          if (!config.browser.viewport) {
            errors.push('Browser viewport is required for Playwright engine');
          }
        }
        break;
        
      case 'jest':
        if (config.settings['timeout'] && config.settings['timeout'] < 1000) {
          errors.push('Jest timeout should be at least 1000ms');
        }
        break;
        
      case 'k6':
        if (config.settings['vus'] !== undefined && config.settings['vus'] < 1) {
          errors.push('K6 virtual users should be at least 1');
        }
        break;
        
      case 'zap':
        if (config.settings['timeout'] && config.settings['timeout'] < 30000) {
          errors.push('ZAP timeout should be at least 30000ms');
        }
        break;
    }
    
    return errors;
  }
}

/**
 * Interface for validation results
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
