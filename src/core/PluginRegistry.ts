/**
 * Plugin registration and management system
 * 
 * This class manages the registration, discovery, and lifecycle of plugins
 * in the Self-Healing Test Automation Harness.
 */

import { 
  ITestEngine, 
  IHealingStrategy, 
  IConfigurationProvider,
  IPluginMetadata,
  IPluginLifecycle,
  IObservablePlugin,
  TestType,
  FailureType
} from '../types';
import { logger } from '../utils/logger';

/**
 * Plugin registry for managing all plugins in the system
 * 
 * This class provides a centralized registry for all plugins, including
 * test engines, healing strategies, and configuration providers.
 */
export class PluginRegistry {
  private testEngines: Map<string, ITestEngine> = new Map();
  private healingStrategies: Map<string, IHealingStrategy> = new Map();
  private configurationProviders: Map<string, IConfigurationProvider> = new Map();
  private pluginMetadata: Map<string, IPluginMetadata> = new Map();
  private pluginLifecycles: Map<string, IPluginLifecycle> = new Map();
  private observablePlugins: Map<string, IObservablePlugin> = new Map();
  
  /**
   * Register a test engine
   * 
   * @param engine - The test engine to register
   * @param metadata - Optional metadata for the engine
   */
  public registerTestEngine(engine: ITestEngine, metadata?: IPluginMetadata): void {
    const key = this.generatePluginKey(engine.name, engine.version);
    
    if (this.testEngines.has(key)) {
      logger.warn(`Test engine already registered: ${key}`);
      return;
    }
    
    this.testEngines.set(key, engine);
    
    if (metadata) {
      this.pluginMetadata.set(key, metadata);
    }
    
    // Register lifecycle if implemented
    if (this.implementsLifecycle(engine)) {
      this.pluginLifecycles.set(key, engine as IPluginLifecycle);
    }
    
    // Register observable if implemented
    if (this.implementsObservable(engine)) {
      this.observablePlugins.set(key, engine as IObservablePlugin);
    }
    
    logger.info(`Registered test engine: ${key}`);
  }
  
  /**
   * Register a healing strategy
   * 
   * @param strategy - The healing strategy to register
   * @param metadata - Optional metadata for the strategy
   */
  public registerHealingStrategy(strategy: IHealingStrategy, metadata?: IPluginMetadata): void {
    const key = this.generatePluginKey(strategy.name, strategy.version);
    
    if (this.healingStrategies.has(key)) {
      logger.warn(`Healing strategy already registered: ${key}`);
      return;
    }
    
    this.healingStrategies.set(key, strategy);
    
    if (metadata) {
      this.pluginMetadata.set(key, metadata);
    }
    
    // Register lifecycle if implemented
    if (this.implementsLifecycle(strategy)) {
      this.pluginLifecycles.set(key, strategy as IPluginLifecycle);
    }
    
    // Register observable if implemented
    if (this.implementsObservable(strategy)) {
      this.observablePlugins.set(key, strategy as IObservablePlugin);
    }
    
    logger.info(`Registered healing strategy: ${key}`);
  }
  
  /**
   * Register a configuration provider
   * 
   * @param provider - The configuration provider to register
   * @param metadata - Optional metadata for the provider
   */
  public registerConfigurationProvider(provider: IConfigurationProvider, metadata?: IPluginMetadata): void {
    const key = this.generatePluginKey(provider.name, provider.version);
    
    if (this.configurationProviders.has(key)) {
      logger.warn(`Configuration provider already registered: ${key}`);
      return;
    }
    
    this.configurationProviders.set(key, provider);
    
    if (metadata) {
      this.pluginMetadata.set(key, metadata);
    }
    
    // Register lifecycle if implemented
    if (this.implementsLifecycle(provider)) {
      this.pluginLifecycles.set(key, provider as IPluginLifecycle);
    }
    
    // Register observable if implemented
    if (this.implementsObservable(provider)) {
      this.observablePlugins.set(key, provider as IObservablePlugin);
    }
    
    logger.info(`Registered configuration provider: ${key}`);
  }
  
  /**
   * Get a test engine by name and version
   * 
   * @param name - The name of the test engine
   * @param version - The version of the test engine (optional)
   * @returns The test engine or undefined if not found
   */
  public getTestEngine(name: string, version?: string): ITestEngine | undefined {
    if (version) {
      return this.testEngines.get(this.generatePluginKey(name, version));
    }
    
    // Find the latest version if no version specified
    let latestEngine: ITestEngine | undefined;
    let latestVersion: string = '';
    
    for (const [key, engine] of this.testEngines.entries()) {
      if (engine.name === name) {
        const engineVersion = this.extractVersionFromKey(key);
        if (this.isVersionNewer(engineVersion, latestVersion)) {
          latestEngine = engine;
          latestVersion = engineVersion;
        }
      }
    }
    
    return latestEngine;
  }
  
  /**
   * Get a healing strategy by name and version
   * 
   * @param name - The name of the healing strategy
   * @param version - The version of the healing strategy (optional)
   * @returns The healing strategy or undefined if not found
   */
  public getHealingStrategy(name: string, version?: string): IHealingStrategy | undefined {
    if (version) {
      return this.healingStrategies.get(this.generatePluginKey(name, version));
    }
    
    // Find the latest version if no version specified
    let latestStrategy: IHealingStrategy | undefined;
    let latestVersion: string = '';
    
    for (const [key, strategy] of this.healingStrategies.entries()) {
      if (strategy.name === name) {
        const strategyVersion = this.extractVersionFromKey(key);
        if (this.isVersionNewer(strategyVersion, latestVersion)) {
          latestStrategy = strategy;
          latestVersion = strategyVersion;
        }
      }
    }
    
    return latestStrategy;
  }
  
  /**
   * Get a configuration provider by name and version
   * 
   * @param name - The name of the configuration provider
   * @param version - The version of the configuration provider (optional)
   * @returns The configuration provider or undefined if not found
   */
  public getConfigurationProvider(name: string, version?: string): IConfigurationProvider | undefined {
    if (version) {
      return this.configurationProviders.get(this.generatePluginKey(name, version));
    }
    
    // Find the latest version if no version specified
    let latestProvider: IConfigurationProvider | undefined;
    let latestVersion: string = '';
    
    for (const [key, provider] of this.configurationProviders.entries()) {
      if (provider.name === name) {
        const providerVersion = this.extractVersionFromKey(key);
        if (this.isVersionNewer(providerVersion, latestVersion)) {
          latestProvider = provider;
          latestVersion = providerVersion;
        }
      }
    }
    
    return latestProvider;
  }
  
  /**
   * Get all test engines
   * 
   * @returns Array of all registered test engines
   */
  public getAllTestEngines(): ITestEngine[] {
    return Array.from(this.testEngines.values());
  }
  
  /**
   * Get all healing strategies
   * 
   * @returns Array of all registered healing strategies
   */
  public getAllHealingStrategies(): IHealingStrategy[] {
    return Array.from(this.healingStrategies.values());
  }
  
  /**
   * Get all configuration providers
   * 
   * @returns Array of all registered configuration providers
   */
  public getAllConfigurationProviders(): IConfigurationProvider[] {
    return Array.from(this.configurationProviders.values());
  }
  
  /**
   * Get test engines by test type
   * 
   * @param testType - The type of tests to filter by
   * @returns Array of test engines that support the specified test type
   */
  public getTestEnginesByType(testType: TestType): ITestEngine[] {
    return this.getAllTestEngines().filter(engine => engine.testType === testType);
  }
  
  /**
   * Get healing strategies by failure type
   * 
   * @param failureType - The type of failure to filter by
   * @returns Array of healing strategies that can handle the specified failure type
   */
  public getHealingStrategiesByFailureType(failureType: FailureType): IHealingStrategy[] {
    return this.getAllHealingStrategies().filter(strategy => 
      strategy.supportedFailureTypes.includes(failureType)
    );
  }
  
  /**
   * Get plugin metadata
   * 
   * @param name - The name of the plugin
   * @param version - The version of the plugin
   * @returns The plugin metadata or undefined if not found
   */
  public getPluginMetadata(name: string, version: string): IPluginMetadata | undefined {
    return this.pluginMetadata.get(this.generatePluginKey(name, version));
  }
  
  /**
   * Unregister a plugin
   * 
   * @param name - The name of the plugin
   * @param version - The version of the plugin
   * @param type - The type of plugin to unregister
   */
  public unregisterPlugin(name: string, version: string, type: 'testEngine' | 'healingStrategy' | 'configurationProvider'): void {
    const key = this.generatePluginKey(name, version);
    
    switch (type) {
      case 'testEngine':
        this.testEngines.delete(key);
        break;
      case 'healingStrategy':
        this.healingStrategies.delete(key);
        break;
      case 'configurationProvider':
        this.configurationProviders.delete(key);
        break;
    }
    
    this.pluginMetadata.delete(key);
    this.pluginLifecycles.delete(key);
    this.observablePlugins.delete(key);
    
    logger.info(`Unregistered plugin: ${key}`);
  }
  
  /**
   * Initialize all plugins with lifecycle support
   * 
   * @param context - The plugin context for initialization
   */
  public async initializeAllPlugins(context: any): Promise<void> {
    logger.info('Initializing all plugins with lifecycle support');
    
    const initializationPromises = Array.from(this.pluginLifecycles.entries()).map(
      async ([key, lifecycle]) => {
        try {
          await lifecycle.initialize(context);
          logger.info(`Initialized plugin: ${key}`);
        } catch (error) {
          logger.error(`Failed to initialize plugin ${key}:`, error);
          throw error;
        }
      }
    );
    
    await Promise.all(initializationPromises);
    logger.info('All plugins initialized successfully');
  }
  
  /**
   * Clean up all plugins with lifecycle support
   */
  public async cleanupAllPlugins(): Promise<void> {
    logger.info('Cleaning up all plugins with lifecycle support');
    
    const cleanupPromises = Array.from(this.pluginLifecycles.entries()).map(
      async ([key, lifecycle]) => {
        try {
          await lifecycle.destroy();
          logger.info(`Cleaned up plugin: ${key}`);
        } catch (error) {
          logger.error(`Failed to cleanup plugin ${key}:`, error);
        }
      }
    );
    
    await Promise.all(cleanupPromises);
    logger.info('All plugins cleaned up');
  }
  
  /**
   * Get names of all registered test engines
   * 
   * @returns Array of registered test engine names
   */
  public getRegisteredEngines(): string[] {
    const engineNames: string[] = [];
    for (const engine of this.testEngines.values()) {
      if (!engineNames.includes(engine.name)) {
        engineNames.push(engine.name);
      }
    }
    return engineNames;
  }
  
  /**
   * Unregister a test engine by name
   * 
   * @param name - The name of the test engine to unregister
   */
  public unregisterTestEngine(name: string): void {
    // Find and remove all versions of this engine
    const keysToDelete: string[] = [];
    for (const [key, engine] of this.testEngines.entries()) {
      if (engine.name === name) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.testEngines.delete(key);
      this.pluginMetadata.delete(key);
      this.pluginLifecycles.delete(key);
      this.observablePlugins.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      logger.info(`Unregistered test engine: ${name} (${keysToDelete.length} versions)`);
    }
  }

  /**
   * Get registry statistics
   * 
   * @returns Statistics about the registry
   */
  public getStatistics(): RegistryStatistics {
    return {
      totalPlugins: this.testEngines.size + this.healingStrategies.size + this.configurationProviders.size,
      testEngines: this.testEngines.size,
      healingStrategies: this.healingStrategies.size,
      configurationProviders: this.configurationProviders.size,
      pluginsWithLifecycle: this.pluginLifecycles.size,
      pluginsWithObservability: this.observablePlugins.size,
    };
  }
  
  /**
   * Generate a plugin key from name and version
   * 
   * @param name - The plugin name
   * @param version - The plugin version
   * @returns The generated plugin key
   */
  private generatePluginKey(name: string, version: string): string {
    return `${name}@${version}`;
  }
  
  /**
   * Extract version from plugin key
   * 
   * @param key - The plugin key
   * @returns The version string
   */
  private extractVersionFromKey(key: string): string {
    const parts = key.split('@');
    return parts.length > 1 ? (parts[1] || '0.0.0') : '0.0.0';
  }
  
  /**
   * Check if version A is newer than version B
   * 
   * @param versionA - First version to compare
   * @param versionB - Second version to compare
   * @returns True if version A is newer than version B
   */
  private isVersionNewer(versionA: string, versionB: string): boolean {
    if (!versionB) return true;
    
    // Simple version comparison (can be enhanced with semver)
    const partsA = versionA.split('.').map(Number);
    const partsB = versionB.split('.').map(Number);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const a = partsA[i] || 0;
      const b = partsB[i] || 0;
      
      if (a > b) return true;
      if (a < b) return false;
    }
    
    return false;
  }
  
  /**
   * Check if a plugin implements the lifecycle interface
   * 
   * @param plugin - The plugin to check
   * @returns True if the plugin implements lifecycle
   */
  private implementsLifecycle(plugin: any): plugin is IPluginLifecycle {
    return plugin && typeof plugin.initialize === 'function' && typeof plugin.destroy === 'function';
  }
  
  /**
   * Check if a plugin implements the observable interface
   * 
   * @param plugin - The plugin to check
   * @returns True if the plugin implements observable
   */
  private implementsObservable(plugin: any): plugin is IObservablePlugin {
    return plugin && typeof plugin.emit === 'function' && typeof plugin.getMetrics === 'function';
  }
}

/**
 * Interface for registry statistics
 */
export interface RegistryStatistics {
  totalPlugins: number;
  testEngines: number;
  healingStrategies: number;
  configurationProviders: number;
  pluginsWithLifecycle: number;
  pluginsWithObservability: number;
}
