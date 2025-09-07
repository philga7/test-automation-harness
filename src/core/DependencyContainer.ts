/**
 * Simple dependency injection container
 * 
 * This class provides a basic dependency injection container for managing
 * dependencies and their lifecycle in the Self-Healing Test Automation Harness.
 */

import { logger } from '../utils/logger';

/**
 * Type for dependency constructors
 */
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Type for dependency factories
 */
type Factory<T = {}> = (...args: any[]) => T;

/**
 * Dependency registration options
 */
interface DependencyOptions {
  /** Whether the dependency is a singleton */
  singleton?: boolean;
  
  /** Whether the dependency should be eagerly instantiated */
  eager?: boolean;
  
  /** Dependencies that this dependency requires */
  dependencies?: string[];
}

/**
 * Dependency registration entry
 */
interface DependencyEntry<T = any> {
  /** The constructor or factory function */
  constructor: Constructor<T> | Factory<T>;
  
  /** Registration options */
  options: DependencyOptions;
  
  /** The singleton instance (if singleton) */
  instance?: T;
  
  /** Whether the dependency has been instantiated */
  instantiated: boolean;
}

/**
 * Simple dependency injection container
 * 
 * This container manages the creation and lifecycle of dependencies,
 * supporting both singleton and transient instances.
 */
export class DependencyContainer {
  private dependencies: Map<string, DependencyEntry> = new Map();
  private instances: Map<string, any> = new Map();
  
  /**
   * Register a dependency
   * 
   * @param name - The name of the dependency
   * @param constructor - The constructor or factory function
   * @param options - Registration options
   */
  public register<T>(
    name: string,
    constructor: Constructor<T> | Factory<T>,
    options: DependencyOptions = {}
  ): void {
    const entry: DependencyEntry<T> = {
      constructor,
      options: {
        singleton: false,
        eager: false,
        dependencies: [],
        ...options,
      },
      instantiated: false,
    };
    
    this.dependencies.set(name, entry);
    logger.info(`Registered dependency: ${name}`);
  }
  
  /**
   * Register a singleton dependency
   * 
   * @param name - The name of the dependency
   * @param constructor - The constructor or factory function
   * @param options - Additional registration options
   */
  public registerSingleton<T>(
    name: string,
    constructor: Constructor<T> | Factory<T>,
    options: Omit<DependencyOptions, 'singleton'> = {}
  ): void {
    this.register(name, constructor, { ...options, singleton: true });
  }
  
  /**
   * Register an instance
   * 
   * @param name - The name of the dependency
   * @param instance - The instance to register
   */
  public registerInstance<T>(name: string, instance: T): void {
    this.instances.set(name, instance);
    logger.info(`Registered instance: ${name}`);
  }
  
  /**
   * Resolve a dependency
   * 
   * @param name - The name of the dependency to resolve
   * @returns The resolved dependency instance
   */
  public resolve<T>(name: string, resolving: Set<string> = new Set()): T {
    // Check for circular dependency
    if (resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }
    
    // Check if we already have an instance
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }
    
    // Get the dependency entry
    const entry = this.dependencies.get(name);
    if (!entry) {
      throw new Error(`Dependency not found: ${name}`);
    }
    
    // Add to resolving set
    resolving.add(name);
    
    try {
      // Create the instance
      const instance = this.createInstance(entry, resolving);
      
      // Store the instance if it's a singleton
      if (entry.options.singleton) {
        this.instances.set(name, instance);
      }
      
      entry.instantiated = true;
      return instance as T;
    } finally {
      // Remove from resolving set
      resolving.delete(name);
    }
  }
  
  /**
   * Check if a dependency is registered
   * 
   * @param name - The name of the dependency
   * @returns True if the dependency is registered
   */
  public isRegistered(name: string): boolean {
    return this.dependencies.has(name) || this.instances.has(name);
  }
  
  /**
   * Get all registered dependency names
   * 
   * @returns Array of registered dependency names
   */
  public getRegisteredDependencies(): string[] {
    const dependencyNames = Array.from(this.dependencies.keys());
    const instanceNames = Array.from(this.instances.keys());
    return [...dependencyNames, ...instanceNames];
  }
  
  /**
   * Initialize all eager dependencies
   * 
   * This method initializes all dependencies marked as eager in the correct order.
   */
  public async initializeEagerDependencies(): Promise<void> {
    logger.info('Initializing eager dependencies');
    
    // Find all eager dependencies that haven't been instantiated yet
    const eagerDependencies = Array.from(this.dependencies.entries())
      .filter(([_, entry]) => entry.options.eager && !entry.instantiated)
      .map(([name, _]) => name);
    
    // Sort by dependency order
    const sortedDependencies = this.sortDependenciesByOrder(eagerDependencies);
    
    // Initialize each dependency
    for (const name of sortedDependencies) {
      try {
        await this.resolve(name, new Set());
        logger.info(`Initialized eager dependency: ${name}`);
      } catch (error) {
        logger.error(`Failed to initialize eager dependency ${name}:`, error);
        throw error;
      }
    }
    
    logger.info('All eager dependencies initialized');
  }
  
  /**
   * Clear all dependencies and instances
   */
  public clear(): void {
    this.dependencies.clear();
    this.instances.clear();
    logger.info('Cleared all dependencies');
  }
  
  /**
   * Create an instance of a dependency
   * 
   * @param entry - The dependency entry
   * @returns The created instance
   */
  private createInstance(entry: DependencyEntry, resolving: Set<string> = new Set()): any {
    try {
      // Resolve dependencies
      const dependencies = entry.options.dependencies || [];
      const resolvedDependencies = dependencies.map(dep => this.resolve(dep, resolving));
      
      // Create the instance
      if (entry.constructor.prototype && entry.constructor.prototype.constructor === entry.constructor) {
        // It's a constructor function
        return new (entry.constructor as Constructor)(...resolvedDependencies);
      } else {
        // It's a factory function
        return (entry.constructor as Factory)(...resolvedDependencies);
      }
    } catch (error) {
      logger.error('Failed to create dependency instance:', error);
      throw new Error(`Failed to create dependency instance: ${error}`);
    }
  }
  
  /**
   * Sort dependencies by their dependency order
   * 
   * @param dependencies - Array of dependency names
   * @returns Sorted array of dependency names
   */
  private sortDependenciesByOrder(dependencies: string[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (name: string): void => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }
      
      if (visited.has(name)) {
        return;
      }
      
      visiting.add(name);
      
      const entry = this.dependencies.get(name);
      if (entry && entry.options.dependencies) {
        for (const dep of entry.options.dependencies) {
          visit(dep);
        }
      }
      
      visiting.delete(name);
      if (!visited.has(name)) {
        visited.add(name);
        sorted.push(name);
      }
    };
    
    for (const name of dependencies) {
      visit(name);
    }
    
    return sorted;
  }
}

/**
 * Global dependency container instance
 */
export const container = new DependencyContainer();
