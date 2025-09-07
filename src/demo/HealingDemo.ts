/**
 * Self-Healing Engine Demo
 * 
 * This demo showcases the self-healing capabilities of the test automation harness.
 * It simulates various locator failures and demonstrates how the healing engine
 * recovers using multiple strategies with confidence scoring and success rate tracking.
 */

import { HealingEngine } from '../healing/HealingEngine';
import { SimpleLocatorStrategy } from '../healing/strategies/SimpleLocatorStrategy';
import { 
  TestFailure, 
  HealingContext, 
  FailureType
} from '../types';
import { logger } from '../utils/logger';

/**
 * Demo configuration
 */
interface HealingDemoConfig {
  /** Number of test failures to simulate */
  numberOfFailures: number;
  
  /** Whether to show detailed output */
  verbose: boolean;
  
  /** Whether to include success rate metrics */
  showMetrics: boolean;
  
  /** Delay between healing attempts (ms) */
  delayBetweenAttempts: number;
}

/**
 * Self-Healing Engine Demo
 * 
 * This class demonstrates the self-healing capabilities by simulating
 * various test failures and showing how the healing engine recovers.
 */
export class HealingDemo {
  private healingEngine: HealingEngine;
  private config: HealingDemoConfig;
  private demoResults: DemoResult[] = [];
  
  constructor(config: Partial<HealingDemoConfig> = {}) {
    this.config = {
      numberOfFailures: 10,
      verbose: true,
      showMetrics: true,
      delayBetweenAttempts: 0,
      ...config
    };
    
    // Initialize the healing engine
    this.healingEngine = new HealingEngine({
      maxAttempts: 3,
      minConfidenceThreshold: 0.3,
      strategyTimeout: 5000,
      enableMetrics: true,
      enableDetailedLogging: true
    });
    
    // Register all healing strategies
    this.registerStrategies();
    
    logger.info('HealingDemo initialized', { config: this.config });
  }
  
  /**
   * Run the complete healing demo
   */
  public async runDemo(): Promise<void> {
    console.log('\n🚀 Starting Self-Healing Engine Demo\n');
    console.log('=' .repeat(60));
    
    try {
      // Show initial configuration
      this.showInitialConfiguration();
      
      // Generate test failures
      const testFailures = this.generateTestFailures();
      
      // Run healing attempts
      await this.runHealingAttempts(testFailures);
      
      // Show results
      this.showResults();
      
      // Show metrics
      if (this.config.showMetrics) {
        this.showMetrics();
      }
      
      console.log('\n✅ Demo completed successfully!\n');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error);
      throw error;
    }
  }
  
  /**
   * Register all healing strategies
   */
  private registerStrategies(): void {
    // Register simple locator strategy with no delay for demo
    const locatorStrategy = new SimpleLocatorStrategy(0);
    this.healingEngine.registerStrategy(locatorStrategy);
    
    console.log('📋 Registered healing strategies:');
    console.log('   • Simple Locator Strategy');
  }
  
  /**
   * Show initial configuration
   */
  private showInitialConfiguration(): void {
    console.log('\n⚙️  Configuration:');
    console.log(`   • Number of test failures: ${this.config.numberOfFailures}`);
    console.log(`   • Max healing attempts: 3`);
    console.log(`   • Min confidence threshold: 0.3`);
    console.log(`   • Strategy timeout: 5000ms`);
    console.log(`   • Verbose output: ${this.config.verbose ? 'Yes' : 'No'}`);
  }
  
  /**
   * Generate test failures for the demo
   */
  private generateTestFailures(): TestFailure[] {
    const failures: TestFailure[] = [];
    
    // Generate various types of failures
    const failureTypes: Array<{ type: FailureType; selector: string; description: string }> = [
      { type: 'element_not_found', selector: '.old-button-class', description: 'Button with old CSS class' },
      { type: 'element_not_found', selector: '#old-button-id', description: 'Button with old ID' },
      { type: 'element_not_found', selector: '//button[text()="Old Text"]', description: 'Button with old text' },
      { type: 'element_not_found', selector: '[data-old-attr="value"]', description: 'Element with old attribute' },
      { type: 'timeout', selector: '.slow-loading-element', description: 'Slow loading element' },
      { type: 'element_not_found', selector: '.dynamic-content', description: 'Dynamic content element' },
      { type: 'element_not_found', selector: '#form-submit-btn', description: 'Form submit button' },
      { type: 'element_not_found', selector: '//input[@type="submit"]', description: 'Submit input field' },
      { type: 'element_not_found', selector: '.modal-close-btn', description: 'Modal close button' },
      { type: 'element_not_found', selector: '[data-testid="old-test-id"]', description: 'Element with old test ID' }
    ];
    
    for (let i = 0; i < this.config.numberOfFailures; i++) {
      const failureType = failureTypes[i % failureTypes.length]!;
      
      failures.push({
        id: `failure-${i + 1}`,
        testId: `test-${i + 1}`,
        type: failureType.type,
        message: `Element not found: ${failureType.selector}`,
        timestamp: new Date(),
        context: {
          testConfig: {} as any,
          environment: {} as any,
          custom: {
            selector: failureType.selector,
            description: failureType.description,
            locator: failureType.selector
          }
        },
        previousAttempts: []
      });
    }
    
    return failures;
  }
  
  /**
   * Run healing attempts for all test failures
   */
  private async runHealingAttempts(failures: TestFailure[]): Promise<void> {
    console.log('\n🔧 Running healing attempts...\n');
    
    for (let i = 0; i < failures.length; i++) {
      const failure = failures[i]!;
      const context = this.createHealingContext();
      
      console.log(`📝 Test Failure ${i + 1}/${failures.length}:`);
      console.log(`   Type: ${failure.type}`);
      console.log(`   Selector: ${failure.context?.custom?.['selector'] || 'unknown'}`);
      console.log(`   Description: ${failure.context?.custom?.['description'] || 'unknown'}`);
      
      try {
        // Attempt healing
        const startTime = Date.now();
        const result = await this.healingEngine.heal(failure, context);
        const duration = Date.now() - startTime;
        
        // Store result
        this.demoResults.push({
          failure,
          result,
          duration,
          success: result.success
        });
        
        // Show result
        this.showHealingResult(result, duration);
        
        // Add delay between attempts
        if (i < failures.length - 1) {
          if (this.config.delayBetweenAttempts > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenAttempts));
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Healing failed: ${error}`);
        this.demoResults.push({
          failure: failure,
          result: null,
          duration: 0,
          success: false
        });
      }
      
      console.log(''); // Empty line for readability
    }
  }
  
  /**
   * Create healing context for demo
   */
  private createHealingContext(): HealingContext {
    return {
      availableStrategies: ['simple-locator'],
      previousAttempts: [],
      systemState: {
        load: Math.random() * 0.5 + 0.3, // Random load between 0.3 and 0.8
        resources: {
          memory: Math.random() * 0.4 + 0.4, // Random memory between 0.4 and 0.8
          cpu: Math.random() * 0.3 + 0.5, // Random CPU between 0.5 and 0.8
          disk: Math.random() * 0.2 + 0.6 // Random disk between 0.6 and 0.8
        },
        activeTests: Math.floor(Math.random() * 5) + 1,
        queueLength: Math.floor(Math.random() * 10)
      },
      userPreferences: {
        preferredStrategies: ['simple-locator'],
        riskTolerance: 'medium',
        notifications: {
          onHealingAttempt: true,
          onHealingSuccess: true,
          onHealingFailure: true
        }
      }
    };
  }
  
  /**
   * Show healing result
   */
  private showHealingResult(result: any, duration: number): void {
    if (result.success) {
      console.log(`   ✅ Healing successful!`);
      console.log(`   Strategy: ${result.metadata?.strategy}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Message: ${result.message}`);
      
      if (this.config.verbose && result.actions.length > 0) {
        console.log(`   Actions taken:`);
        result.actions.forEach((action: any, index: number) => {
          console.log(`     ${index + 1}. ${action.description} (${action.result})`);
        });
      }
    } else {
      console.log(`   ❌ Healing failed`);
      console.log(`   Message: ${result.message}`);
      console.log(`   Duration: ${duration}ms`);
    }
  }
  
  /**
   * Show overall results
   */
  private showResults(): void {
    console.log('\n📊 Results Summary:');
    console.log('=' .repeat(40));
    
    const totalAttempts = this.demoResults.length;
    const successfulHealings = this.demoResults.filter(r => r.success).length;
    const failedHealings = totalAttempts - successfulHealings;
    const successRate = totalAttempts > 0 ? (successfulHealings / totalAttempts) * 100 : 0;
    
    console.log(`Total healing attempts: ${totalAttempts}`);
    console.log(`Successful healings: ${successfulHealings}`);
    console.log(`Failed healings: ${failedHealings}`);
    console.log(`Success rate: ${successRate.toFixed(1)}%`);
    
    // Show results by failure type
    const resultsByType = this.groupResultsByFailureType();
    console.log('\nResults by failure type:');
    Object.entries(resultsByType).forEach(([type, results]) => {
      const typeSuccessRate = results.length > 0 ? (results.filter(r => r.success).length / results.length) * 100 : 0;
      console.log(`  ${type}: ${typeSuccessRate.toFixed(1)}% (${results.filter(r => r.success).length}/${results.length})`);
    });
  }
  
  /**
   * Show detailed metrics
   */
  private showMetrics(): void {
    console.log('\n📈 Detailed Metrics:');
    console.log('=' .repeat(40));
    
    const stats = this.healingEngine.getStats();
    console.log(`Overall success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`Total attempts: ${stats.totalAttempts}`);
    console.log(`Successful attempts: ${stats.successfulAttempts}`);
    console.log(`Failed attempts: ${stats.failedAttempts}`);
    console.log(`Average duration: ${stats.averageDuration.toFixed(1)}ms`);
    
    // Show success rate by strategy
    console.log('\nSuccess rate by strategy:');
    Object.entries(stats.successRateByStrategy).forEach(([strategy, rate]) => {
      console.log(`  ${strategy}: ${(rate * 100).toFixed(1)}%`);
    });
    
    // Show success rate by failure type
    console.log('\nSuccess rate by failure type:');
    Object.entries(stats.successRateByType).forEach(([type, rate]) => {
      console.log(`  ${type}: ${(rate * 100).toFixed(1)}%`);
    });
  }
  
  /**
   * Group results by failure type
   */
  private groupResultsByFailureType(): Record<string, DemoResult[]> {
    const grouped: Record<string, DemoResult[]> = {};
    
    this.demoResults.forEach(result => {
      const type = result.failure.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(result);
    });
    
    return grouped;
  }
  
  /**
   * Get demo results
   */
  public getResults(): DemoResult[] {
    return this.demoResults;
  }
  
  /**
   * Get healing engine statistics
   */
  public getStats() {
    return this.healingEngine.getStats();
  }
}

/**
 * Interface for demo results
 */
interface DemoResult {
  failure: TestFailure;
  result: any;
  duration: number;
  success: boolean;
}

/**
 * Run the healing demo
 */
export async function runHealingDemo(): Promise<void> {
  const demo = new HealingDemo({
    numberOfFailures: 15,
    verbose: true,
    showMetrics: true,
    delayBetweenAttempts: 150
  });
  
  await demo.runDemo();
}

// Export for use in other modules
export { DemoResult };
