/**
 * Integrated Demo: Configuration + Plugin Architecture
 * 
 * This demo shows how the configuration system powers the plugin architecture,
 * demonstrating the complete system working together.
 */

import { initializeConfig, getConfig, getConfigManager } from '../config';
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

export class IntegratedDemo {
  private registry: PluginRegistry;
  private factory: TestEngineFactory;
  private container: DependencyContainer;
  private configManager: any;

  constructor() {
    this.container = new DependencyContainer();
    this.registry = new PluginRegistry();
    this.factory = new TestEngineFactory(this.registry);
  }

  /**
   * Run the integrated demo showing configuration + plugin architecture
   */
  async runDemo(): Promise<void> {
    console.log('🎯 Self-Healing Test Automation Harness');
    console.log('🔗 Integrated Demo: Configuration + Plugin Architecture');
    console.log('=' .repeat(70));

    try {
      // Step 1: Initialize Configuration System
      await this.initializeConfiguration();

      // Step 2: Setup Plugin Architecture with Configuration
      await this.setupPluginArchitecture();

      // Step 3: Execute Tests Using Configuration
      await this.executeConfiguredTests();

      // Step 4: Demonstrate Configuration-Driven Healing
      await this.demonstrateConfiguredHealing();

      // Step 5: Show Configuration Impact
      await this.showConfigurationImpact();

      console.log('\n✅ Integrated demo completed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Integrated demo failed:', errorMessage);
      throw error;
    }
  }

  /**
   * Step 1: Initialize the configuration system
   */
  private async initializeConfiguration(): Promise<void> {
    console.log('\n📋 Step 1: Initializing Configuration System');
    console.log('-'.repeat(50));

    // Initialize configuration for development environment
    const config = await initializeConfig('./config', 'development');
    this.configManager = getConfigManager();

    console.log(`✅ Configuration loaded for: ${config.app.environment}`);
    console.log(`📱 App: ${config.app.name} v${config.app.version}`);
    console.log(`🔧 Debug mode: ${config.app.debug}`);
    console.log(`🌐 API Port: ${config.api.port}`);
    console.log(`📊 Log Level: ${config.observability.logging.level}`);

    // Show engine configuration
    console.log('\n🔧 Test Engine Configuration:');
    Object.entries(config.engines).forEach(([name, engine]) => {
      console.log(`  ${name}: ${engine.enabled ? '✅' : '❌'} (timeout: ${engine.timeout}ms)`);
    });

    // Show healing configuration
    console.log('\n🩹 Healing Configuration:');
    console.log(`  Enabled: ${config.healing.enabled ? '✅' : '❌'}`);
    console.log(`  Confidence Threshold: ${config.healing.confidenceThreshold}`);
    console.log(`  Max Retries: ${config.healing.maxRetries}`);
  }

  /**
   * Step 2: Setup plugin architecture using configuration
   */
  private async setupPluginArchitecture(): Promise<void> {
    console.log('\n🔌 Step 2: Setting Up Plugin Architecture with Configuration');
    console.log('-'.repeat(50));

    const config = getConfig();

    // Register dependency injection with configuration
    this.container.registerSingleton('pluginRegistry', () => this.registry);
    this.container.registerSingleton('testEngineFactory', () => this.factory);
    this.container.registerInstance('configurationManager', this.configManager);
    this.container.registerInstance('appConfig', config);

    // Register Hello World engine with configuration-driven settings
    this.factory.registerEngineConstructor('hello-world', HelloWorldEngine as any);

    // Register healing strategy with configuration
    const healingStrategy = new SimpleHealingStrategy();
    this.registry.registerHealingStrategy(healingStrategy as any, {
      name: 'simple-healing',
      version: '1.0.0',
      description: 'Simple healing strategy configured via YAML',
      author: 'Integrated Demo',
      dependencies: [],
      capabilities: ['assertion_failed', 'timeout', 'element_not_found', 'network_error'],
    });

    console.log('✅ Plugin architecture setup with configuration complete');
    console.log(`📦 Registered ${this.registry.getStatistics().totalPlugins} plugins`);
  }

  /**
   * Step 3: Execute tests using configuration values
   */
  private async executeConfiguredTests(): Promise<void> {
    console.log('\n🧪 Step 3: Executing Tests with Configuration Values');
    console.log('-'.repeat(50));

    const config = getConfig();

    // Create engine configuration from YAML config
    const engineConfig: EngineConfig = {
      engine: 'hello-world',
      version: '1.0.0',
      settings: {
        timeout: config.engines.jest.timeout, // Use configured timeout
        retries: config.engines.jest.retries || 2,
      },
    };

    // Create and register the engine
    const engine = await this.factory.createEngine(engineConfig, {
      name: 'hello-world',
      version: '1.0.0',
      description: 'Hello World engine with YAML configuration',
      author: 'Integrated Demo',
      dependencies: [],
      capabilities: ['unit', 'healing'],
    });

    // Test 1: Successful test with configured settings
    const successTest: TestConfig = {
      name: 'configured-successful-test',
      type: 'unit',
      filePath: '/demo/configured-test.js',
      timeout: config.engines.jest.timeout, // Use configured timeout
      environment: config.app.environment, // Use configured environment
      parameters: {},
      engineConfig,
      healingConfig: {
        enabled: config.healing.enabled, // Use configured healing settings
        confidenceThreshold: config.healing.confidenceThreshold,
        maxAttempts: config.healing.maxRetries,
        strategies: ['simple-healing'],
        timeout: config.api.timeout, // Use configured API timeout
      },
      retryConfig: {
        maxRetries: config.api.retries, // Use configured retries
        delay: 1000,
        backoffMultiplier: 1.5,
        maxDelay: 5000,
      },
    };

    console.log('🔧 Test Configuration from YAML:');
    console.log(`  Timeout: ${successTest.timeout}ms (from engines.jest.timeout)`);
    console.log(`  Environment: ${successTest.environment} (from app.environment)`);
    console.log(`  Healing Enabled: ${successTest.healingConfig.enabled} (from healing.enabled)`);
    console.log(`  Confidence Threshold: ${successTest.healingConfig.confidenceThreshold} (from healing.confidenceThreshold)`);
    console.log(`  Max Retries: ${successTest.retryConfig.maxRetries} (from api.retries)`);

    console.log('\n🚀 Running configured test...');
    const successResult = await engine.execute(successTest);
    console.log(`✅ Test result: ${successResult.status} - ${successResult.output}`);

    // Test 2: Failing test to demonstrate healing
    const failTest: TestConfig = {
      ...successTest,
      name: 'configured-failing-test',
    };

    console.log('\n🚀 Running configured failing test...');
    const failResult = await engine.execute(failTest);
    console.log(`❌ Test result: ${failResult.status} - ${failResult.errors[0]?.message}`);

    console.log('✅ Configured test execution completed');
  }

  /**
   * Step 4: Demonstrate configuration-driven healing
   */
  private async demonstrateConfiguredHealing(): Promise<void> {
    console.log('\n🩹 Step 4: Configuration-Driven Healing Demonstration');
    console.log('-'.repeat(50));

    const config = getConfig();

    // Get the Hello World engine
    const engine = this.registry.getTestEngine('hello-world');
    if (!engine) {
      throw new Error('Hello World engine not found');
    }

    // Create a test failure
    const failure: TestFailure = {
      id: 'configured-failure-1',
      testId: 'configured-test-1',
      type: 'assertion_failed',
      message: 'Configuration-driven healing demonstration',
      timestamp: new Date(),
      context: {
        testConfig: {
          name: 'configured-test',
          type: 'unit',
          filePath: '/demo/test.js',
          timeout: config.engines.jest.timeout,
          environment: config.app.environment,
          parameters: {},
          engineConfig: { engine: 'hello-world', version: '1.0.0', settings: {} },
          healingConfig: { 
            enabled: config.healing.enabled, 
            confidenceThreshold: config.healing.confidenceThreshold, 
            maxAttempts: config.healing.maxRetries, 
            strategies: [], 
            timeout: config.api.timeout 
          },
          retryConfig: { 
            maxRetries: config.api.retries, 
            delay: 1000, 
            backoffMultiplier: 1.5, 
            maxDelay: 5000 
          },
        },
        environment: {
          os: 'demo',
          nodeVersion: process.version,
          environment: config.app.environment,
          availableMemory: 1024,
          cpuCount: 1,
        },
        custom: {},
      },
      previousAttempts: [],
    };

    console.log('🔧 Healing Configuration from YAML:');
    console.log(`  Enabled: ${config.healing.enabled}`);
    console.log(`  Confidence Threshold: ${config.healing.confidenceThreshold}`);
    console.log(`  Max Retries: ${config.healing.maxRetries}`);
    console.log(`  Strategies: ${Object.keys(config.healing.strategies).filter(k => config.healing.strategies[k as keyof typeof config.healing.strategies]).join(', ')}`);

    // Attempt to heal the failure
    console.log('\n🚀 Attempting configuration-driven healing...');
    const healingResult = await engine.heal!(failure);
    console.log(`🔧 Healing result: ${healingResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Confidence: ${(healingResult.confidence * 100).toFixed(1)}% (threshold: ${(config.healing.confidenceThreshold * 100).toFixed(1)}%)`);
    console.log(`   Message: ${healingResult.message}`);
    console.log(`   Actions taken: ${healingResult.actions.length}`);

    // Show healing actions
    healingResult.actions.forEach((action, index) => {
      console.log(`   Action ${index + 1}: ${action.type} - ${action.description}`);
    });

    console.log('✅ Configuration-driven healing demonstration completed');
  }

  /**
   * Step 5: Show how configuration impacts the system
   */
  private async showConfigurationImpact(): Promise<void> {
    console.log('\n📊 Step 5: Configuration Impact Analysis');
    console.log('-'.repeat(50));

    const config = getConfig();

    console.log('🎯 Configuration Impact Summary:');
    console.log(`  Environment: ${config.app.environment}`);
    console.log(`  Debug Mode: ${config.app.debug ? 'Enabled (verbose logging)' : 'Disabled (production mode)'}`);
    console.log(`  API Port: ${config.api.port} (affects server binding)`);
    console.log(`  Log Level: ${config.observability.logging.level} (affects log verbosity)`);
    console.log(`  Parallel Execution: ${config.orchestration.parallel ? 'Enabled' : 'Disabled'}`);
    console.log(`  Max Concurrency: ${config.orchestration.maxConcurrency} (affects test execution)`);

    console.log('\n🔧 Engine Configuration Impact:');
    Object.entries(config.engines).forEach(([name, engine]) => {
      if (engine.enabled) {
        console.log(`  ${name}: Active (timeout: ${engine.timeout}ms)`);
      } else {
        console.log(`  ${name}: Disabled`);
      }
    });

    console.log('\n🩹 Healing Configuration Impact:');
    console.log(`  Healing: ${config.healing.enabled ? 'Active' : 'Disabled'}`);
    if (config.healing.enabled) {
      console.log(`  Confidence Threshold: ${config.healing.confidenceThreshold} (affects healing decisions)`);
      console.log(`  Max Retries: ${config.healing.maxRetries} (affects retry behavior)`);
      console.log(`  Available Strategies: ${Object.keys(config.healing.strategies).filter(k => config.healing.strategies[k as keyof typeof config.healing.strategies]).length}`);
    }

    console.log('\n📈 System Statistics:');
    const registryStats = this.registry.getStatistics();
    console.log(`  Total Plugins: ${registryStats.totalPlugins}`);
    console.log(`  Test Engines: ${registryStats.testEngines}`);
    console.log(`  Healing Strategies: ${registryStats.healingStrategies}`);

    console.log('✅ Configuration impact analysis completed');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up integrated demo resources...');
    
    try {
      await this.registry.cleanupAllPlugins();
      this.container.clear();
      console.log('✅ Cleanup completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Cleanup failed:', errorMessage);
    }
  }
}

/**
 * Run the integrated demo
 */
export async function runIntegratedDemo(): Promise<void> {
  const demo = new IntegratedDemo();
  
  try {
    await demo.runDemo();
  } finally {
    await demo.cleanup();
  }
}
