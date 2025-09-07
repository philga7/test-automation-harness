# Self-Healing Engine Documentation

## Overview

The Self-Healing Engine is the core component of the Test Automation Harness that automatically recovers from test failures by attempting alternative approaches to locate and interact with elements. It implements a sophisticated strategy pattern that allows for multiple healing approaches, confidence scoring, and comprehensive metrics tracking.

## Architecture

### Core Components

#### HealingEngine
The main orchestrator that manages multiple healing strategies and coordinates the healing process.

```typescript
class HealingEngine {
  constructor(config?: HealingEngineConfig)
  registerStrategy(strategy: IHealingStrategy): void
  heal(failure: TestFailure, context: HealingContext): Promise<HealingResult>
  getStatistics(): HealingStatistics
  resetStatistics(): void
}
```

#### Healing Strategies
Individual strategies that implement specific healing approaches:

- **SimpleLocatorStrategy**: Basic locator recovery with wait and retry
- **IDFallbackStrategy**: ID-based element location with fuzzy matching
- **CSSFallbackStrategy**: CSS selector alternatives and wildcard matching
- **XPathFallbackStrategy**: XPath expression recovery and alternatives
- **NeighborAnalysisStrategy**: Contextual element analysis using nearby elements

### Strategy Pattern Implementation

The healing engine uses the Strategy pattern to allow for flexible and extensible healing approaches:

```typescript
interface IHealingStrategy {
  readonly name: string;
  readonly version: string;
  readonly supportedFailureTypes: FailureType[];
  
  heal(failure: TestFailure, context: HealingContext): Promise<HealingResult>;
  calculateConfidence(failure: TestFailure, context: HealingContext): Promise<number>;
  canHeal(failure: TestFailure): boolean;
}
```

## Configuration

### HealingEngine Configuration

```typescript
interface HealingEngineConfig {
  maxAttempts: number;           // Maximum healing attempts per failure
  minConfidenceThreshold: number; // Minimum confidence to accept healing
  strategyTimeout: number;       // Timeout for individual strategies
  enableMetrics: boolean;        // Enable metrics collection
  enableDetailedLogging: boolean; // Enable detailed logging
}
```

### Default Configuration

```typescript
const defaultConfig: HealingEngineConfig = {
  maxAttempts: 3,
  minConfidenceThreshold: 0.3,
  strategyTimeout: 5000,
  enableMetrics: true,
  enableDetailedLogging: true
};
```

## Healing Process

### 1. Failure Analysis
When a test failure occurs, the healing engine:
- Analyzes the failure type and context
- Extracts relevant information (selectors, error messages, etc.)
- Determines which strategies can handle the failure

### 2. Strategy Selection
The engine:
- Identifies available strategies for the failure type
- Calculates confidence scores for each strategy
- Selects the strategy with the highest confidence

### 3. Healing Execution
The selected strategy:
- Attempts to heal the failure using its specific approach
- Returns a healing result with actions taken
- Provides confidence score and metadata

### 4. Result Processing
The engine:
- Validates the healing result against confidence threshold
- Records metrics and statistics
- Returns the final healing result

## Healing Strategies

### SimpleLocatorStrategy

**Purpose**: Basic locator recovery with wait and retry mechanisms.

**Supported Failure Types**: `element_not_found`, `timeout`

**Approach**:
- Wait for element to appear
- Try alternative selectors
- Increase timeout values

**Configuration**:
```typescript
interface SimpleLocatorConfig {
  waitTimeout: number;        // Time to wait for element
  retryAttempts: number;      // Number of retry attempts
  alternativeSelectors: string[]; // Alternative selectors to try
}
```

### IDFallbackStrategy

**Purpose**: ID-based element location with fuzzy matching capabilities.

**Supported Failure Types**: `element_not_found`, `timeout`

**Approach**:
- Extract potential IDs from failed selectors
- Try ID-based selectors
- Use fuzzy matching for similar IDs
- Generate alternative ID patterns

**Configuration**:
```typescript
interface IDFallbackConfig {
  enableFuzzyMatching: boolean;    // Enable fuzzy ID matching
  maxFuzzyDistance: number;        // Maximum edit distance for fuzzy matching
  enableIDExtraction: boolean;     // Extract IDs from other selector types
  enableAlternativeSelectors: boolean; // Generate alternative selectors
}
```

### CSSFallbackStrategy

**Purpose**: CSS selector alternatives and wildcard matching.

**Supported Failure Types**: `element_not_found`, `timeout`

**Approach**:
- Parse CSS selector components
- Generate wildcard alternatives
- Try attribute-based selectors
- Use structural selectors

**Configuration**:
```typescript
interface CSSFallbackConfig {
  enableWildcardMatching: boolean;     // Enable wildcard selectors
  enableAttributeFallback: boolean;    // Try attribute-based selectors
  enableStructuralSelectors: boolean;  // Use structural CSS selectors
  maxWildcardDepth: number;           // Maximum wildcard nesting depth
}
```

### XPathFallbackStrategy

**Purpose**: XPath expression recovery and alternatives.

**Supported Failure Types**: `element_not_found`, `timeout`

**Approach**:
- Parse XPath expressions
- Generate alternative XPath patterns
- Use text-based and attribute-based XPath
- Try positional and structural XPath

**Configuration**:
```typescript
interface XPathFallbackConfig {
  enableTextBased: boolean;        // Enable text-based XPath
  enableAttributeBased: boolean;   // Enable attribute-based XPath
  enablePositional: boolean;       // Enable positional XPath
  enableStructural: boolean;       // Enable structural XPath
}
```

### NeighborAnalysisStrategy

**Purpose**: Contextual element analysis using nearby elements.

**Supported Failure Types**: `element_not_found`, `timeout`

**Approach**:
- Analyze sibling elements
- Use parent-child relationships
- Consider element context and positioning
- Generate contextual selectors

**Configuration**:
```typescript
interface NeighborAnalysisConfig {
  enableSiblingAnalysis: boolean;      // Analyze sibling elements
  enableParentChildAnalysis: boolean;  // Use parent-child relationships
  enableContextualAnalysis: boolean;   // Consider element context
  maxContextDepth: number;            // Maximum context analysis depth
}
```

## Confidence Scoring

### Scoring Factors

The confidence scoring system considers multiple factors:

1. **Failure Type Match**: How well the strategy handles the specific failure type
2. **Selector Complexity**: Simpler selectors get higher confidence
3. **Previous Success Rate**: Historical success rate for similar failures
4. **System Load**: Current system resource usage
5. **Strategy Specificity**: How specific the strategy is to the failure

### Confidence Calculation

```typescript
async calculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
  let confidence = 0.5; // Base confidence
  
  // Adjust based on failure type
  if (this.supportedFailureTypes.includes(failure.type)) {
    confidence += 0.2;
  }
  
  // Adjust based on system load
  if (context.systemState.load.activeTests < 10) {
    confidence += 0.1;
  }
  
  // Adjust based on strategy-specific factors
  confidence = await this.doCalculateConfidence(failure, context);
  
  return Math.min(1, Math.max(0, confidence));
}
```

## Metrics and Statistics

### Healing Statistics

The engine tracks comprehensive statistics:

```typescript
interface HealingStatistics {
  totalAttempts: number;           // Total healing attempts
  successfulAttempts: number;      // Successful healing attempts
  failedAttempts: number;          // Failed healing attempts
  successRate: number;             // Overall success rate
  averageConfidence: number;       // Average confidence score
  averageDuration: number;         // Average healing duration
  successRateByStrategy: Record<string, number>; // Success rate by strategy
  successRateByFailureType: Record<string, number>; // Success rate by failure type
}
```

### Metrics Collection

Metrics are automatically collected for:
- Individual healing attempts
- Strategy performance
- Failure type analysis
- System performance impact
- User preference effectiveness

## Usage Examples

### Basic Usage

```typescript
import { HealingEngine } from './src/healing/HealingEngine';
import { SimpleLocatorStrategy } from './src/healing/strategies/SimpleLocatorStrategy';

// Create and configure the healing engine
const healingEngine = new HealingEngine({
  maxAttempts: 3,
  minConfidenceThreshold: 0.6,
  strategyTimeout: 5000
});

// Register strategies
healingEngine.registerStrategy(new SimpleLocatorStrategy());

// Heal a failure
const result = await healingEngine.heal(testFailure, healingContext);

if (result.success) {
  console.log(`Healing successful with ${result.confidence} confidence`);
  console.log(`Actions taken: ${result.actions.length}`);
} else {
  console.log('Healing failed');
}
```

### Advanced Configuration

```typescript
import { HealingEngine } from './src/healing/HealingEngine';
import { IDFallbackStrategy } from './src/healing/strategies/IDFallbackStrategy';
import { CSSFallbackStrategy } from './src/healing/strategies/CSSFallbackStrategy';

// Create healing engine with custom configuration
const healingEngine = new HealingEngine({
  maxAttempts: 5,
  minConfidenceThreshold: 0.4,
  strategyTimeout: 10000,
  enableMetrics: true,
  enableDetailedLogging: true
});

// Register multiple strategies with custom configurations
healingEngine.registerStrategy(new IDFallbackStrategy({
  enableFuzzyMatching: true,
  maxFuzzyDistance: 2,
  enableIDExtraction: true
}));

healingEngine.registerStrategy(new CSSFallbackStrategy({
  enableWildcardMatching: true,
  enableAttributeFallback: true,
  maxWildcardDepth: 3
}));

// Get statistics
const stats = healingEngine.getStatistics();
console.log(`Success rate: ${stats.successRate * 100}%`);
console.log(`Total attempts: ${stats.totalAttempts}`);
```

### Custom Strategy Implementation

```typescript
import { HealingStrategy } from './src/core/HealingStrategy';
import { TestFailure, HealingContext, HealingResult } from './src/types';

class CustomHealingStrategy extends HealingStrategy {
  constructor() {
    super('custom-healing', '1.0.0', ['element_not_found', 'timeout']);
  }

  protected async doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    // Implement custom healing logic
    const actions = [];
    
    // Try custom approach
    const success = await this.tryCustomApproach(failure);
    
    if (success) {
      actions.push(this.createHealingAction(
        'custom_action',
        'Applied custom healing approach',
        { approach: 'custom' },
        'success'
      ));
      
      return this.createSuccessResult(actions, 0.8, 'Custom healing successful');
    }
    
    return this.createFailureResult('Custom healing failed');
  }

  protected async doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    // Implement custom confidence calculation
    let confidence = 0.6; // Base confidence
    
    // Adjust based on custom factors
    if (failure.message.includes('custom-pattern')) {
      confidence += 0.3;
    }
    
    return Math.min(1, confidence);
  }

  private async tryCustomApproach(failure: TestFailure): Promise<boolean> {
    // Implement custom healing logic
    return true; // Simplified for example
  }
}

// Register custom strategy
healingEngine.registerStrategy(new CustomHealingStrategy());
```

## Best Practices

### Strategy Selection

1. **Register Multiple Strategies**: Use multiple strategies for better coverage
2. **Order by Specificity**: Register more specific strategies first
3. **Configure Appropriately**: Tune strategy configurations for your use case
4. **Monitor Performance**: Track strategy performance and adjust as needed

### Configuration Tuning

1. **Confidence Thresholds**: Start with 0.3-0.6 and adjust based on results
2. **Timeout Settings**: Set appropriate timeouts for your test environment
3. **Max Attempts**: Balance between thoroughness and performance
4. **Metrics Collection**: Enable metrics for production monitoring

### Error Handling

1. **Graceful Degradation**: Ensure healing failures don't crash tests
2. **Comprehensive Logging**: Enable detailed logging for debugging
3. **Fallback Strategies**: Always have fallback approaches
4. **Monitoring**: Monitor healing success rates and performance

## Troubleshooting

### Common Issues

#### Low Success Rates
- **Cause**: Confidence thresholds too high or strategies not well-suited
- **Solution**: Lower confidence thresholds or add more appropriate strategies

#### Slow Performance
- **Cause**: Too many strategies or high timeout values
- **Solution**: Optimize strategy selection and reduce timeouts

#### Strategy Not Triggering
- **Cause**: Strategy not registered or doesn't support failure type
- **Solution**: Verify strategy registration and supported failure types

#### Memory Issues
- **Cause**: Too many healing attempts or large context data
- **Solution**: Limit max attempts and optimize context data

### Debugging Tips

1. **Enable Detailed Logging**: Set `enableDetailedLogging: true`
2. **Check Statistics**: Monitor healing statistics for patterns
3. **Test Strategies Individually**: Test each strategy in isolation
4. **Review Confidence Scores**: Check if confidence calculations are appropriate
5. **Monitor System Resources**: Ensure adequate system resources

## Performance Considerations

### Optimization Strategies

1. **Strategy Caching**: Cache strategy results for similar failures
2. **Parallel Execution**: Run multiple strategies in parallel when possible
3. **Resource Management**: Monitor and limit resource usage
4. **Timeout Management**: Use appropriate timeouts to prevent hanging

### Monitoring

1. **Success Rate Tracking**: Monitor overall and per-strategy success rates
2. **Performance Metrics**: Track healing duration and resource usage
3. **Error Analysis**: Analyze failed healing attempts for patterns
4. **System Impact**: Monitor impact on test execution performance

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**: Use ML to improve strategy selection
2. **Dynamic Strategy Loading**: Load strategies at runtime
3. **Cross-Test Learning**: Learn from healing patterns across tests
4. **Advanced Analytics**: Enhanced analytics and reporting
5. **Strategy Composition**: Combine multiple strategies for complex scenarios

### Extension Points

1. **Custom Confidence Algorithms**: Implement custom confidence scoring
2. **External Strategy Sources**: Load strategies from external sources
3. **Integration Hooks**: Add hooks for external system integration
4. **Advanced Metrics**: Custom metrics collection and analysis

## Conclusion

The Self-Healing Engine provides a robust, extensible foundation for automatic test failure recovery. By implementing the strategy pattern and providing comprehensive configuration options, it enables teams to build reliable, self-healing test automation that adapts to changing application interfaces and improves test stability over time.

The engine's modular design allows for easy extension and customization, while its comprehensive metrics and monitoring capabilities provide visibility into healing effectiveness and system performance.
