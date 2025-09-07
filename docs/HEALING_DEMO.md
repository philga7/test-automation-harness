# Healing Demo Documentation

## Overview

The Healing Demo is a comprehensive demonstration of the self-healing engine's capabilities. It simulates various test failure scenarios and showcases how the healing engine automatically recovers from these failures using different healing strategies.

## Demo Components

### HealingDemo Class

The main demo class that orchestrates the healing demonstration:

```typescript
class HealingDemo {
  constructor(config: HealingDemoConfig)
  async runDemo(): Promise<DemoResult>
  private registerStrategies(): void
  private generateTestFailures(): TestFailure[]
  private createHealingContext(): HealingContext
  private runHealingAttempts(failures: TestFailure[]): Promise<DemoResult>
  private showHealingResult(failure: TestFailure, result: HealingResult): void
  private showResultsSummary(results: DemoResult): void
}
```

### Configuration

```typescript
interface HealingDemoConfig {
  numberOfFailures: number;        // Number of test failures to simulate
  verbose: boolean;               // Enable verbose output
  showMetrics: boolean;           // Show detailed metrics
  delayBetweenAttempts: number;   // Delay between healing attempts
}
```

## Running the Demo

### Basic Usage

```typescript
import { HealingDemo } from './src/demo/HealingDemo';

// Create demo with default configuration
const demo = new HealingDemo();
await demo.runDemo();
```

### Advanced Configuration

```typescript
import { HealingDemo } from './src/demo/HealingDemo';

// Create demo with custom configuration
const demo = new HealingDemo({
  numberOfFailures: 10,
  verbose: true,
  showMetrics: true,
  delayBetweenAttempts: 200
});

const result = await demo.runDemo();
console.log(`Demo completed with ${result.successRate * 100}% success rate`);
```

### Command Line Usage

```bash
# Run the healing demo
npx ts-node src/demo/run-healing-demo.ts

# Run with custom configuration
npx ts-node -e "
import { HealingDemo } from './src/demo/HealingDemo';
const demo = new HealingDemo({ numberOfFailures: 5, verbose: true });
demo.runDemo().then(() => console.log('Demo completed!')).catch(console.error);
"
```

## Demo Scenarios

### Simulated Test Failures

The demo generates various types of test failures to demonstrate different healing scenarios:

#### Element Not Found Failures
- **CSS Class Selector**: `.old-button-class`
- **ID Selector**: `#old-button-id`
- **XPath Selector**: `//button[text()="Old Text"]`
- **Attribute Selector**: `[data-old-attr="value"]`

#### Timeout Failures
- **Slow Loading Element**: `.slow-loading-element`
- **Network Timeout**: Elements that take too long to load
- **Dynamic Content**: Elements that appear after delays

### Healing Strategies Demonstrated

The demo showcases all available healing strategies:

1. **SimpleLocatorStrategy**: Basic wait and retry mechanisms
2. **IDFallbackStrategy**: ID-based element location
3. **CSSFallbackStrategy**: CSS selector alternatives
4. **XPathFallbackStrategy**: XPath expression recovery
5. **NeighborAnalysisStrategy**: Contextual element analysis

## Demo Output

### Verbose Output Example

```
🚀 Starting Self-Healing Engine Demo

============================================================

⚙️  Configuration:
   • Number of test failures: 5
   • Max healing attempts: 3
   • Min confidence threshold: 0.3
   • Strategy timeout: 5000ms
   • Verbose output: Yes

🔧 Running healing attempts...

📝 Test Failure 1/5:
   Type: element_not_found
   Selector: .old-button-class
   Description: Button with old CSS class
   ✅ Healing successful!
   Strategy: simple-locator
   Confidence: 60.0%
   Duration: 102ms
   Message: Successfully healed element not found by trying alternative selectors
   Actions taken:
     1. Waiting for element to appear (success)
     2. Trying alternative selector (success)

📝 Test Failure 2/5:
   Type: element_not_found
   Selector: #old-button-id
   Description: Button with old ID
   ✅ Healing successful!
   Strategy: id-fallback
   Confidence: 70.0%
   Duration: 95ms
   Message: Successfully healed using ID fallback strategy
   Actions taken:
     1. Extracting ID from selector (success)
     2. Trying ID-based selector (success)

📊 Results Summary:
========================================
Total healing attempts: 5
Successful healings: 5
Failed healings: 0
Success rate: 100.0%

Results by failure type:
  element_not_found: 100.0% (4/4)
  timeout: 100.0% (1/1)

📈 Detailed Metrics:
========================================
Overall success rate: 100.0%
Total attempts: 5
Successful attempts: 5
Failed attempts: 0
Average duration: 100.8ms

Success rate by strategy:
  simple-locator: 100.0%
  id-fallback: 100.0%

Success rate by failure type:
  element_not_found: 100.0%
  timeout: 100.0%

✅ Demo completed successfully!
```

### Non-Verbose Output Example

```
🚀 Starting Self-Healing Engine Demo
🔧 Running healing attempts...
📊 Results Summary:
Total healing attempts: 5
Successful healings: 5
Failed healings: 0
Success rate: 100.0%
✅ Demo completed successfully!
```

## Demo Results

### DemoResult Interface

```typescript
interface DemoResult {
  totalAttempts: number;
  successfulHealings: number;
  failedHealings: number;
  successRate: number;
  resultsByFailureType: Record<string, { success: number; total: number; rate: number }>;
  resultsByStrategy: Record<string, { success: number; total: number; rate: number }>;
  averageDuration: number;
  totalDuration: number;
  healingResults: HealingResult[];
}
```

### Metrics Provided

The demo provides comprehensive metrics:

1. **Overall Statistics**:
   - Total healing attempts
   - Successful healings
   - Failed healings
   - Success rate

2. **Results by Failure Type**:
   - Success rate for each failure type
   - Number of attempts per failure type

3. **Results by Strategy**:
   - Success rate for each strategy
   - Number of attempts per strategy

4. **Performance Metrics**:
   - Average healing duration
   - Total demo duration
   - Individual healing durations

## Customizing the Demo

### Adding Custom Failure Types

```typescript
import { HealingDemo } from './src/demo/HealingDemo';
import { TestFailure, FailureType } from './src/types';

class CustomHealingDemo extends HealingDemo {
  protected generateTestFailures(): TestFailure[] {
    const failures = super.generateTestFailures();
    
    // Add custom failure types
    const customFailures: TestFailure[] = [
      {
        id: 'custom-failure-1',
        testId: 'custom-test-1',
        type: 'network_error' as FailureType,
        message: 'Network timeout occurred',
        timestamp: new Date(),
        context: {
          testConfig: {
            name: 'custom-test',
            type: 'e2e',
            filePath: '/custom-test.js',
            timeout: 5000,
            environment: 'test',
            parameters: {},
            engineConfig: {
              engine: 'playwright',
              version: '1.0.0',
              settings: {}
            },
            healingConfig: {
              enabled: true,
              confidenceThreshold: 0.6,
              maxAttempts: 3,
              strategies: ['simple-locator'],
              timeout: 10000
            },
            retryConfig: {
              maxRetries: 2,
              delay: 1000,
              backoffMultiplier: 1.5,
              maxDelay: 5000
            }
          },
          environment: {
            os: 'test',
            nodeVersion: '20.0.0',
            environment: 'test',
            availableMemory: 1024,
            cpuCount: 1
          },
          custom: {
            selector: '.network-element',
            description: 'Network-dependent element'
          }
        },
        previousAttempts: []
      }
    ];
    
    return [...failures, ...customFailures];
  }
}

// Use custom demo
const customDemo = new CustomHealingDemo({ numberOfFailures: 3 });
await customDemo.runDemo();
```

### Adding Custom Strategies

```typescript
import { HealingDemo } from './src/demo/HealingDemo';
import { CustomHealingStrategy } from './src/healing/strategies/CustomHealingStrategy';

class CustomStrategyDemo extends HealingDemo {
  protected registerStrategies(): void {
    super.registerStrategies();
    
    // Add custom strategy
    const customStrategy = new CustomHealingStrategy();
    this.healingEngine.registerStrategy(customStrategy);
  }
}

// Use demo with custom strategy
const customDemo = new CustomStrategyDemo({ numberOfFailures: 5 });
await customDemo.runDemo();
```

### Customizing Output Format

```typescript
import { HealingDemo } from './src/demo/HealingDemo';

class CustomOutputDemo extends HealingDemo {
  protected showHealingResult(failure: TestFailure, result: HealingResult): void {
    // Custom output format
    console.log(`🔧 ${failure.type}: ${result.success ? '✅' : '❌'} ${result.confidence * 100}%`);
    
    if (this.config.verbose) {
      console.log(`   Strategy: ${result.metadata?.strategy}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Message: ${result.message}`);
    }
  }
  
  protected showResultsSummary(results: DemoResult): void {
    // Custom summary format
    console.log('🎯 Demo Results:');
    console.log(`   Success Rate: ${(results.successRate * 100).toFixed(1)}%`);
    console.log(`   Total Attempts: ${results.totalAttempts}`);
    console.log(`   Average Duration: ${results.averageDuration.toFixed(1)}ms`);
  }
}

// Use custom output demo
const customDemo = new CustomOutputDemo({ verbose: true });
await customDemo.runDemo();
```

## Integration with Test Suites

### Running Demo in CI/CD

```typescript
// In your test setup
import { HealingDemo } from './src/demo/HealingDemo';

describe('Self-Healing Engine', () => {
  it('should demonstrate healing capabilities', async () => {
    const demo = new HealingDemo({
      numberOfFailures: 3,
      verbose: false,
      showMetrics: true
    });
    
    const result = await demo.runDemo();
    
    expect(result.successRate).toBeGreaterThan(0.8); // 80% success rate
    expect(result.totalAttempts).toBe(3);
  });
});
```

### Performance Testing

```typescript
import { HealingDemo } from './src/demo/HealingDemo';

describe('Healing Performance', () => {
  it('should complete healing within acceptable time', async () => {
    const startTime = Date.now();
    
    const demo = new HealingDemo({
      numberOfFailures: 10,
      verbose: false,
      delayBetweenAttempts: 0 // No delay for performance testing
    });
    
    const result = await demo.runDemo();
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.successRate).toBeGreaterThan(0.7); // 70% success rate
  });
});
```

## Demo Scripts

### run-healing-demo.ts

Simple script to run the healing demo:

```typescript
#!/usr/bin/env ts-node

import { HealingDemo } from './src/demo/HealingDemo';

async function main() {
  console.log('🚀 Starting Self-Healing Engine Demo\n');
  
  const demo = new HealingDemo({
    numberOfFailures: 5,
    verbose: true,
    showMetrics: true,
    delayBetweenAttempts: 100
  });
  
  try {
    const result = await demo.runDemo();
    console.log(`\n🎉 Demo completed with ${(result.successRate * 100).toFixed(1)}% success rate!`);
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
```

### Integration with run-all-demos.ts

The healing demo is integrated into the main demo runner:

```typescript
import { runHealingDemo } from './run-healing-demo';

async function main() {
  console.log('🚀 Starting Test Automation Harness Demos\n');
  
  // Run all demos
  await runConfigurationDemo();
  await runPluginArchitectureDemo();
  await runHealingDemo(); // Healing demo integration
  
  console.log('\n✅ All demos completed successfully!');
  console.log('📊 System Status:');
  console.log('   • Configuration Management: Ready');
  console.log('   • Plugin Architecture: Ready');
  console.log('   • Self-Healing Engine: Ready');
}

main().catch(console.error);
```

## Best Practices

### Demo Configuration

1. **Appropriate Failure Count**: Use 3-10 failures for most demos
2. **Verbose Output**: Enable for development, disable for CI/CD
3. **Reasonable Delays**: Use 100-200ms delays for better visualization
4. **Metrics Collection**: Always enable metrics for analysis

### Demo Usage

1. **Development**: Use verbose output for debugging
2. **CI/CD**: Use non-verbose output with metrics
3. **Presentations**: Use moderate failure counts with delays
4. **Performance Testing**: Use higher failure counts without delays

### Demo Customization

1. **Extend Base Class**: Extend `HealingDemo` for custom behavior
2. **Override Methods**: Override specific methods for customization
3. **Add Custom Strategies**: Register custom strategies for specific scenarios
4. **Custom Output**: Customize output format for specific needs

## Troubleshooting

### Common Demo Issues

#### Demo Hangs
- **Cause**: Infinite loops in healing strategies
- **Solution**: Check strategy timeouts and error handling

#### Low Success Rate
- **Cause**: Strategies not well-suited for demo scenarios
- **Solution**: Adjust strategy configuration or add more strategies

#### Performance Issues
- **Cause**: Too many failures or slow strategies
- **Solution**: Reduce failure count or optimize strategies

#### Output Issues
- **Cause**: Console output conflicts or formatting issues
- **Solution**: Check output formatting and console handling

### Debugging Tips

1. **Enable Verbose Output**: Use `verbose: true` for detailed information
2. **Check Strategy Registration**: Verify all strategies are registered
3. **Monitor Performance**: Watch for slow healing attempts
4. **Review Error Messages**: Check for strategy-specific errors
5. **Test Individual Strategies**: Test strategies in isolation

## Conclusion

The Healing Demo provides a comprehensive way to showcase and test the self-healing engine's capabilities. By simulating various failure scenarios and demonstrating different healing strategies, it helps users understand how the system works and validates its effectiveness.

The demo is highly customizable and can be adapted for different use cases, from development and testing to presentations and CI/CD integration. Regular use of the demo helps ensure the healing system remains effective as the application evolves.
