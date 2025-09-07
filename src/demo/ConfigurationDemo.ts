/**
 * Configuration System Demo
 * Demonstrates the YAML-based configuration management system
 */

import { initializeConfig, getConfig, getConfigSummary, reloadConfig, setEnvironment } from '../config';

export class ConfigurationDemo {
  private configPath: string;

  constructor(configPath: string = './config') {
    this.configPath = configPath;
  }

  /**
   * Run the complete configuration demo
   */
  async runDemo(): Promise<void> {
    console.log('🚀 Configuration Management System Demo\n');
    console.log('=' .repeat(60));

    try {
      // Demo 1: Load development configuration
      await this.demoEnvironmentLoading('development');

      // Demo 2: Show configuration sections
      await this.demoConfigurationSections();

      // Demo 3: Environment switching
      await this.demoEnvironmentSwitching();

      // Demo 4: Configuration validation
      await this.demoConfigurationValidation();

      // Demo 5: Environment variable overrides
      await this.demoEnvironmentOverrides();

      console.log('\n✅ Configuration demo completed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Demo failed:', errorMessage);
      throw error;
    }
  }

  /**
   * Demo 1: Load configuration for a specific environment
   */
  private async demoEnvironmentLoading(environment: string): Promise<void> {
    console.log(`\n📋 Demo 1: Loading ${environment} configuration`);
    console.log('-'.repeat(40));

    const config = await initializeConfig(this.configPath, environment);
    
    console.log(`✅ Configuration loaded for environment: ${config.app.environment}`);
    console.log(`📱 App: ${config.app.name} v${config.app.version}`);
    console.log(`🔧 Debug mode: ${config.app.debug}`);
    console.log(`🌐 API Port: ${config.api.port}`);
    console.log(`📊 Log Level: ${config.observability.logging.level}`);
    
    // Show engine status
    console.log('\n🔧 Test Engines:');
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
   * Demo 2: Show different configuration sections
   */
  private async demoConfigurationSections(): Promise<void> {
    console.log('\n📋 Demo 2: Configuration Sections');
    console.log('-'.repeat(40));

    const config = getConfig();

    // API Configuration
    console.log('\n🌐 API Configuration:');
    console.log(`  Port: ${config.api.port}`);
    console.log(`  Timeout: ${config.api.timeout}ms`);
    console.log(`  Retries: ${config.api.retries}`);
    console.log(`  CORS Enabled: ${config.api.cors.enabled}`);
    console.log(`  Rate Limiting: ${config.api.rateLimit.enabled} (${config.api.rateLimit.max} req/${config.api.rateLimit.windowMs}ms)`);

    // Observability Configuration
    console.log('\n📊 Observability Configuration:');
    console.log(`  Metrics: ${config.observability.metrics.enabled ? '✅' : '❌'}`);
    console.log(`  Logging Level: ${config.observability.logging.level}`);
    console.log(`  Log Format: ${config.observability.logging.format}`);
    console.log(`  Tracing: ${config.observability.tracing.enabled ? '✅' : '❌'}`);

    // Security Configuration
    console.log('\n🔒 Security Configuration:');
    console.log(`  Enabled: ${config.security.enabled ? '✅' : '❌'}`);
    console.log(`  Authentication: ${config.security.authentication.enabled ? '✅' : '❌'}`);
    console.log(`  Encryption: ${config.security.encryption.enabled ? '✅' : '❌'}`);

    // Orchestration Configuration
    console.log('\n🎯 Orchestration Configuration:');
    console.log(`  Parallel Execution: ${config.orchestration.parallel ? '✅' : '❌'}`);
    console.log(`  Max Concurrency: ${config.orchestration.maxConcurrency}`);
    console.log(`  Timeout: ${config.orchestration.timeout}ms`);
    console.log(`  Reporting Formats: ${config.orchestration.reporting.formats.join(', ')}`);
  }

  /**
   * Demo 3: Environment switching
   */
  private async demoEnvironmentSwitching(): Promise<void> {
    console.log('\n📋 Demo 3: Environment Switching');
    console.log('-'.repeat(40));

    const environments = ['development', 'staging', 'production'];

    for (const env of environments) {
      try {
        console.log(`\n🔄 Switching to ${env} environment...`);
        setEnvironment(env);
        const config = await reloadConfig();
        
        console.log(`✅ Loaded ${env} configuration:`);
        console.log(`  Debug: ${config.app.debug}`);
        console.log(`  API Port: ${config.api.port}`);
        console.log(`  Log Level: ${config.observability.logging.level}`);
        console.log(`  Playwright Headless: ${config.engines.playwright.headless}`);
        console.log(`  Healing Confidence: ${config.healing.confidenceThreshold}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️  ${env} configuration not available: ${errorMessage}`);
      }
    }
  }

  /**
   * Demo 4: Configuration validation
   */
  private async demoConfigurationValidation(): Promise<void> {
    console.log('\n📋 Demo 4: Configuration Validation');
    console.log('-'.repeat(40));

    const config = getConfig();
    
    console.log('🔍 Validating configuration...');
    
    // Check required fields
    const requiredFields = [
      'app.name',
      'app.version',
      'app.environment',
      'api.port',
      'healing.confidenceThreshold'
    ];

    let validationPassed = true;
    
    for (const field of requiredFields) {
      const value = this.getNestedValue(config, field);
      if (value === undefined || value === null) {
        console.log(`❌ Missing required field: ${field}`);
        validationPassed = false;
      } else {
        console.log(`✅ ${field}: ${value}`);
      }
    }

    // Check numeric ranges
    const numericChecks = [
      { field: 'api.port', min: 1, max: 65535 },
      { field: 'healing.confidenceThreshold', min: 0, max: 1 },
      { field: 'api.timeout', min: 1000 }
    ];

    for (const check of numericChecks) {
      const value = this.getNestedValue(config, check.field);
      if (typeof value === 'number') {
        if (value < check.min || (check.max !== undefined && value > check.max)) {
          console.log(`❌ ${check.field} out of range: ${value} (expected: ${check.min}-${check.max})`);
          validationPassed = false;
        } else {
          console.log(`✅ ${check.field}: ${value} (valid range)`);
        }
      }
    }

    if (validationPassed) {
      console.log('\n✅ Configuration validation passed!');
    } else {
      console.log('\n❌ Configuration validation failed!');
    }
  }

  /**
   * Demo 5: Environment variable overrides
   */
  private async demoEnvironmentOverrides(): Promise<void> {
    console.log('\n📋 Demo 5: Environment Variable Overrides');
    console.log('-'.repeat(40));

    // Set some environment variables
    const originalEnv = { ...process.env };
    
    try {
      console.log('🔧 Setting environment variables...');
      process.env['API_PORT'] = '8080';
      process.env['HEALING_CONFIDENCE_THRESHOLD'] = '0.9';
      process.env['PLAYWRIGHT_HEADLESS'] = 'false';
      process.env['LOG_LEVEL'] = 'debug';

      // Reload configuration to pick up environment variables
      const config = await reloadConfig();

      console.log('✅ Environment variable overrides applied:');
      console.log(`  API Port: ${config.api.port} (from API_PORT)`);
      console.log(`  Healing Confidence: ${config.healing.confidenceThreshold} (from HEALING_CONFIDENCE_THRESHOLD)`);
      console.log(`  Playwright Headless: ${config.engines.playwright.headless} (from PLAYWRIGHT_HEADLESS)`);
      console.log(`  Log Level: ${config.observability.logging.level} (from LOG_LEVEL)`);

    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  }

  /**
   * Show configuration summary
   */
  showConfigSummary(): void {
    console.log('\n📋 Configuration Summary');
    console.log('-'.repeat(40));
    
    const summary = getConfigSummary();
    console.log(JSON.stringify(summary, null, 2));
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

/**
 * Run the configuration demo
 */
export async function runConfigurationDemo(): Promise<void> {
  const demo = new ConfigurationDemo();
  await demo.runDemo();
  demo.showConfigSummary();
}
