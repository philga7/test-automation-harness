/**
 * Plugin Architecture Demo
 * 
 * This demo application demonstrates the complete plugin architecture
 * by creating, registering, and executing a simple test engine.
 */

import { 
  TestConfig, 
  EngineConfig, 
  TestFailure
} from '../types';
import { PluginRegistry } from '../core/PluginRegistry';
import { TestEngineFactory } from '../core/TestEngineFactory';
import { DependencyContainer } from '../core/DependencyContainer';
import { HelloWorldEngine } from '../engines/HelloWorldEngine';
import { SimpleHealingStrategy } from '../healing/SimpleHealingStrategy';
import { logger } from '../utils/logger';

/**
 * Plugin Architecture Demo Application
 * 
 * This class demonstrates the complete plugin architecture by:
 * 1. Setting up the dependency injection container
 * 2. Creating and registering plugins
 * 3. Executing tests
 * 4. Demonstrating healing capabilities
 */
export class PluginArchitectureDemo {
  private registry: PluginRegistry;
  private factory: TestEngineFactory;
  private container: DependencyContainer;
  
  constructor() {
    this.container = new DependencyContainer();
    this.registry = new PluginRegistry();
    this.factory = new TestEngineFactory(this.registry);
    
    logger.info('Created PluginArchitectureDemo');
  }
  
  /**
   * Run the complete demo
   */
  public async run(): Promise<void> {
    try {
      logger.info('🚀 Starting Plugin Architecture Demo');
      
      // Step 1: Setup dependency injection
      await this.setupDependencyInjection();
      
      // Step 2: Register plugins
      await this.registerPlugins();
      
      // Step 3: Execute tests
      await this.executeTests();
      
      // Step 4: Demonstrate healing
      await this.demonstrateHealing();
      
      // Step 5: Show statistics
      this.showStatistics();
      
      logger.info('✅ Plugin Architecture Demo completed successfully');
    } catch (error) {
      logger.error('❌ Plugin Architecture Demo failed:', error);
      throw error;
    }
  }
  
  /**
   * Setup dependency injection container
   */
  private async setupDependencyInjection(): Promise<void> {
    logger.info('📦 Setting up dependency injection container');
    
    // Register the plugin registry as a singleton
    this.container.registerSingleton('pluginRegistry', () => this.registry);
    
    // Register the test engine factory as a singleton
    this.container.registerSingleton('testEngineFactory', () => this.factory);
    
    // Register the dependency container itself
    this.container.registerInstance('dependencyContainer', this.container);
    
    logger.info('✅ Dependency injection container setup complete');
  }
  
  /**
   * Register all plugins
   */
  private async registerPlugins(): Promise<void> {
    logger.info('🔌 Registering plugins');
    
    // Register the Hello World engine constructor
    this.factory.registerEngineConstructor('hello-world', HelloWorldEngine as any);
    
    // Register the Simple Healing Strategy
    const healingStrategy = new SimpleHealingStrategy();
    this.registry.registerHealingStrategy(healingStrategy as any, {
      name: 'simple-healing',
      version: '1.0.0',
      description: 'Simple healing strategy for common failure types',
      author: 'Plugin Architecture Demo',
      dependencies: [],
      capabilities: ['assertion_failed', 'timeout', 'element_not_found', 'network_error'],
    });
    
    logger.info('✅ Plugins registered successfully');
  }
  
  /**
   * Execute various tests
   */
  private async executeTests(): Promise<void> {
    logger.info('🧪 Executing tests');
    
    // Create engine configuration
    const engineConfig: EngineConfig = {
      engine: 'hello-world',
      version: '1.0.0',
      settings: {
        timeout: 30000,
        retries: 2,
      },
    };
    
    // Create and register the engine
    const engine = await this.factory.createEngine(engineConfig, {
      name: 'hello-world',
      version: '1.0.0',
      description: 'Hello World test engine for demonstration',
      author: 'Plugin Architecture Demo',
      dependencies: [],
      capabilities: ['unit', 'healing'],
    });
    
    // Test 1: Successful test
    const successTest: TestConfig = {
      name: 'successful-test',
      type: 'unit',
      filePath: '/demo/successful-test.js',
      timeout: 5000,
      environment: 'demo',
      parameters: {},
      engineConfig,
      healingConfig: {
        enabled: true,
        confidenceThreshold: 0.6,
        maxAttempts: 3,
        strategies: ['simple-healing'],
        timeout: 10000,
      },
      retryConfig: {
        maxRetries: 2,
        delay: 1000,
        backoffMultiplier: 1.5,
        maxDelay: 5000,
      },
    };
    
    logger.info('Running successful test...');
    const successResult = await engine.execute(successTest);
    logger.info(`✅ Test result: ${successResult.status} - ${successResult.output}`);
    
    // Test 2: Failing test
    const failTest: TestConfig = {
      ...successTest,
      name: 'failing-test',
    };
    
    logger.info('Running failing test...');
    const failResult = await engine.execute(failTest);
    logger.info(`❌ Test result: ${failResult.status} - ${failResult.errors[0]?.message}`);
    
    logger.info('✅ Test execution completed');
  }
  
  /**
   * Demonstrate healing capabilities
   */
  private async demonstrateHealing(): Promise<void> {
    logger.info('🔧 Demonstrating healing capabilities');
    
    // Get the Hello World engine
    const engine = this.registry.getTestEngine('hello-world');
    if (!engine) {
      throw new Error('Hello World engine not found');
    }
    
    // Create a test failure
    const failure: TestFailure = {
      id: 'demo-failure-1',
      testId: 'demo-test-1',
      type: 'assertion_failed',
      message: 'Demo assertion failure',
      timestamp: new Date(),
      context: {
        testConfig: {
          name: 'demo-test',
          type: 'unit',
          filePath: '/demo/test.js',
          timeout: 5000,
          environment: 'demo',
          parameters: {},
          engineConfig: { engine: 'hello-world', version: '1.0.0', settings: {} },
          healingConfig: { enabled: true, confidenceThreshold: 0.6, maxAttempts: 3, strategies: [], timeout: 10000 },
          retryConfig: { maxRetries: 2, delay: 1000, backoffMultiplier: 1.5, maxDelay: 5000 },
        },
        environment: {
          os: 'demo',
          nodeVersion: process.version,
          environment: 'demo',
          availableMemory: 1024,
          cpuCount: 1,
        },
        custom: {},
      },
      previousAttempts: [],
    };
    
    // Attempt to heal the failure
    logger.info('Attempting to heal test failure...');
    const healingResult = await engine.heal!(failure);
    logger.info(`🔧 Healing result: ${healingResult.success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`   Confidence: ${(healingResult.confidence * 100).toFixed(1)}%`);
    logger.info(`   Message: ${healingResult.message}`);
    logger.info(`   Actions taken: ${healingResult.actions.length}`);
    
    // Show healing actions
    healingResult.actions.forEach((action, index) => {
      logger.info(`   Action ${index + 1}: ${action.type} - ${action.description}`);
    });
    
    logger.info('✅ Healing demonstration completed');
  }
  
  /**
   * Show system statistics
   */
  private showStatistics(): void {
    logger.info('📊 System Statistics');
    
    // Registry statistics
    const registryStats = this.registry.getStatistics();
    logger.info(`   Total plugins: ${registryStats.totalPlugins}`);
    logger.info(`   Test engines: ${registryStats.testEngines}`);
    logger.info(`   Healing strategies: ${registryStats.healingStrategies}`);
    logger.info(`   Configuration providers: ${registryStats.configurationProviders}`);
    
    // Engine statistics
    const engine = this.registry.getTestEngine('hello-world');
    if (engine && 'getStatistics' in engine) {
      const engineStats = (engine as any).getStatistics();
      logger.info(`   Engine: ${engineStats.name} v${engineStats.version}`);
      logger.info(`   Total tests: ${engineStats.totalTests}`);
      logger.info(`   Success rate: ${(engineStats.successRate * 100).toFixed(1)}%`);
      logger.info(`   Health: ${engineStats.isHealthy ? 'Healthy' : 'Unhealthy'}`);
    }
    
    // Healing strategy statistics
    const healingStrategy = this.registry.getHealingStrategy('simple-healing');
    if (healingStrategy && 'getStatistics' in healingStrategy) {
      const strategyStats = (healingStrategy as any).getStatistics();
      logger.info(`   Healing strategy: ${strategyStats.name} v${strategyStats.version}`);
      logger.info(`   Total attempts: ${strategyStats.totalAttempts}`);
      logger.info(`   Success rate: ${(strategyStats.successRate * 100).toFixed(1)}%`);
    }
    
    logger.info('✅ Statistics display completed');
  }
  
  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up demo resources');
    
    try {
      // Cleanup all plugins
      await this.registry.cleanupAllPlugins();
      
      // Clear dependency container
      this.container.clear();
      
      logger.info('✅ Demo cleanup completed');
    } catch (error) {
      logger.error('❌ Demo cleanup failed:', error);
    }
  }
}

/**
 * Main demo function
 */
export async function runPluginArchitectureDemo(): Promise<void> {
  const demo = new PluginArchitectureDemo();
  
  try {
    await demo.run();
  } finally {
    await demo.cleanup();
  }
}
