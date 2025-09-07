# Healing Strategies Documentation

## Overview

Healing strategies are the core components that implement specific approaches to recover from test failures. Each strategy focuses on a particular type of failure or uses a specific technique to locate and interact with elements. This document provides detailed information about each available strategy and how to implement custom strategies.

## Available Strategies

### SimpleLocatorStrategy

**Purpose**: Provides basic locator recovery with wait and retry mechanisms.

**Best For**: Simple element location failures, timeout issues, and basic retry scenarios.

**Supported Failure Types**:
- `element_not_found`
- `timeout`

**Key Features**:
- Wait for element to appear
- Try alternative selectors
- Increase timeout values
- Simple retry logic

**Configuration**:
```typescript
interface SimpleLocatorConfig {
  waitTimeout: number;        // Time to wait for element (default: 1000ms)
  retryAttempts: number;      // Number of retry attempts (default: 2)
  alternativeSelectors: string[]; // Alternative selectors to try
}
```

**Usage Example**:
```typescript
import { SimpleLocatorStrategy } from './src/healing/strategies/SimpleLocatorStrategy';

const strategy = new SimpleLocatorStrategy();
healingEngine.registerStrategy(strategy);
```

**Healing Actions**:
1. **Wait for Element**: Waits for the element to appear in the DOM
2. **Try Alternative Selector**: Attempts to find the element using alternative selectors
3. **Increase Timeout**: Increases the timeout value for slow-loading elements

**Confidence Scoring**:
- Base confidence: 0.6
- Element not found: +0.1
- Timeout: +0.2
- System load adjustment: ±0.1

### IDFallbackStrategy

**Purpose**: ID-based element location with fuzzy matching capabilities.

**Best For**: Elements with ID attributes, when CSS classes or other selectors fail.

**Supported Failure Types**:
- `element_not_found`
- `timeout`

**Key Features**:
- Extract potential IDs from failed selectors
- Try ID-based selectors
- Use fuzzy matching for similar IDs
- Generate alternative ID patterns

**Configuration**:
```typescript
interface IDFallbackConfig {
  enableFuzzyMatching: boolean;    // Enable fuzzy ID matching (default: true)
  maxFuzzyDistance: number;        // Maximum edit distance for fuzzy matching (default: 2)
  enableIDExtraction: boolean;     // Extract IDs from other selector types (default: true)
  enableAlternativeSelectors: boolean; // Generate alternative selectors (default: true)
}
```

**Usage Example**:
```typescript
import { IDFallbackStrategy } from './src/healing/strategies/IDFallbackStrategy';

const strategy = new IDFallbackStrategy({
  enableFuzzyMatching: true,
  maxFuzzyDistance: 3,
  enableIDExtraction: true
});
healingEngine.registerStrategy(strategy);
```

**Healing Actions**:
1. **Extract ID from Selector**: Parses the failed selector to find potential IDs
2. **Try ID Selector**: Attempts to locate the element using ID-based selectors
3. **Fuzzy ID Matching**: Uses fuzzy matching to find similar IDs
4. **Generate Alternatives**: Creates alternative ID-based selectors

**Confidence Scoring**:
- Base confidence: 0.5
- ID found in selector: +0.3
- Fuzzy match quality: +0.1 to +0.2
- System load adjustment: ±0.1

### CSSFallbackStrategy

**Purpose**: CSS selector alternatives and wildcard matching.

**Best For**: Complex CSS selectors, when specific selectors become stale.

**Supported Failure Types**:
- `element_not_found`
- `timeout`

**Key Features**:
- Parse CSS selector components
- Generate wildcard alternatives
- Try attribute-based selectors
- Use structural selectors

**Configuration**:
```typescript
interface CSSFallbackConfig {
  enableWildcardMatching: boolean;     // Enable wildcard selectors (default: true)
  enableAttributeFallback: boolean;    // Try attribute-based selectors (default: true)
  enableStructuralSelectors: boolean;  // Use structural CSS selectors (default: true)
  maxWildcardDepth: number;           // Maximum wildcard nesting depth (default: 3)
}
```

**Usage Example**:
```typescript
import { CSSFallbackStrategy } from './src/healing/strategies/CSSFallbackStrategy';

const strategy = new CSSFallbackStrategy({
  enableWildcardMatching: true,
  enableAttributeFallback: true,
  maxWildcardDepth: 2
});
healingEngine.registerStrategy(strategy);
```

**Healing Actions**:
1. **Parse Selector Components**: Breaks down the CSS selector into components
2. **Generate Wildcards**: Creates wildcard alternatives for failed selectors
3. **Try Attribute Selectors**: Attempts attribute-based selectors
4. **Use Structural Selectors**: Applies structural CSS selectors

**Confidence Scoring**:
- Base confidence: 0.4
- Wildcard match: +0.2
- Attribute match: +0.1
- Structural match: +0.1

### XPathFallbackStrategy

**Purpose**: XPath expression recovery and alternatives.

**Best For**: Complex XPath expressions, when XPath selectors become invalid.

**Supported Failure Types**:
- `element_not_found`
- `timeout`

**Key Features**:
- Parse XPath expressions
- Generate alternative XPath patterns
- Use text-based and attribute-based XPath
- Try positional and structural XPath

**Configuration**:
```typescript
interface XPathFallbackConfig {
  enableTextBased: boolean;        // Enable text-based XPath (default: true)
  enableAttributeBased: boolean;   // Enable attribute-based XPath (default: true)
  enablePositional: boolean;       // Enable positional XPath (default: true)
  enableStructural: boolean;       // Enable structural XPath (default: true)
}
```

**Usage Example**:
```typescript
import { XPathFallbackStrategy } from './src/healing/strategies/XPathFallbackStrategy';

const strategy = new XPathFallbackStrategy({
  enableTextBased: true,
  enableAttributeBased: true,
  enablePositional: false
});
healingEngine.registerStrategy(strategy);
```

**Healing Actions**:
1. **Parse XPath Expression**: Analyzes the failed XPath expression
2. **Generate Text-Based XPath**: Creates XPath expressions based on text content
3. **Try Attribute-Based XPath**: Uses attribute-based XPath expressions
4. **Apply Structural XPath**: Uses structural XPath patterns

**Confidence Scoring**:
- Base confidence: 0.4
- Text-based match: +0.2
- Attribute-based match: +0.1
- Structural match: +0.1

### NeighborAnalysisStrategy

**Purpose**: Contextual element analysis using nearby elements.

**Best For**: Dynamic content, when elements don't have stable identifiers.

**Supported Failure Types**:
- `element_not_found`
- `timeout`

**Key Features**:
- Analyze sibling elements
- Use parent-child relationships
- Consider element context and positioning
- Generate contextual selectors

**Configuration**:
```typescript
interface NeighborAnalysisConfig {
  enableSiblingAnalysis: boolean;      // Analyze sibling elements (default: true)
  enableParentChildAnalysis: boolean;  // Use parent-child relationships (default: true)
  enableContextualAnalysis: boolean;   // Consider element context (default: true)
  maxContextDepth: number;            // Maximum context analysis depth (default: 3)
}
```

**Usage Example**:
```typescript
import { NeighborAnalysisStrategy } from './src/healing/strategies/NeighborAnalysisStrategy';

const strategy = new NeighborAnalysisStrategy({
  enableSiblingAnalysis: true,
  enableParentChildAnalysis: true,
  maxContextDepth: 2
});
healingEngine.registerStrategy(strategy);
```

**Healing Actions**:
1. **Analyze Siblings**: Examines sibling elements for patterns
2. **Use Parent-Child Relationships**: Leverages DOM hierarchy
3. **Apply Contextual Analysis**: Considers element context and positioning
4. **Generate Contextual Selectors**: Creates selectors based on context

**Confidence Scoring**:
- Base confidence: 0.4
- Sibling relationship: +0.2
- Parent-child relationship: +0.1
- Contextual match: +0.1

## Strategy Selection Guidelines

### When to Use Each Strategy

#### SimpleLocatorStrategy
- **Use when**: You have simple element location failures
- **Best for**: Basic retry scenarios, timeout issues
- **Avoid when**: Complex selector recovery is needed

#### IDFallbackStrategy
- **Use when**: Elements have ID attributes
- **Best for**: When CSS classes or other selectors fail
- **Avoid when**: Elements don't have stable IDs

#### CSSFallbackStrategy
- **Use when**: Working with complex CSS selectors
- **Best for**: When specific selectors become stale
- **Avoid when**: XPath or ID-based approaches are more appropriate

#### XPathFallbackStrategy
- **Use when**: Using XPath expressions
- **Best for**: Complex element location scenarios
- **Avoid when**: CSS selectors are more efficient

#### NeighborAnalysisStrategy
- **Use when**: Elements don't have stable identifiers
- **Best for**: Dynamic content, complex DOM structures
- **Avoid when**: Simple selectors are sufficient

### Strategy Combination

For best results, combine multiple strategies:

```typescript
// Register strategies in order of preference
healingEngine.registerStrategy(new SimpleLocatorStrategy());
healingEngine.registerStrategy(new IDFallbackStrategy());
healingEngine.registerStrategy(new CSSFallbackStrategy());
healingEngine.registerStrategy(new XPathFallbackStrategy());
healingEngine.registerStrategy(new NeighborAnalysisStrategy());
```

## Custom Strategy Implementation

### Creating a Custom Strategy

To create a custom healing strategy, extend the `HealingStrategy` base class:

```typescript
import { HealingStrategy } from '../core/HealingStrategy';
import { TestFailure, HealingContext, HealingResult } from '../types';

export class CustomHealingStrategy extends HealingStrategy {
  constructor(config: Partial<CustomConfig> = {}) {
    super('custom-healing', '1.0.0', ['element_not_found', 'timeout']);
    
    this.config = {
      customOption: true,
      customTimeout: 5000,
      ...config
    };
  }

  protected async doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    try {
      // Implement custom healing logic
      const actions = [];
      
      // Try custom approach
      const success = await this.tryCustomApproach(failure, context);
      
      if (success) {
        actions.push(this.createHealingAction(
          'custom_action',
          'Applied custom healing approach',
          { approach: 'custom', success: true },
          'success'
        ));
        
        return this.createSuccessResult(actions, 0.8, 'Custom healing successful');
      }
      
      return this.createFailureResult('Custom healing failed');
    } catch (error) {
      return this.createFailureResult(`Custom healing error: ${error}`);
    }
  }

  protected async doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    let confidence = 0.5; // Base confidence
    
    // Implement custom confidence calculation
    if (failure.type === 'element_not_found') {
      confidence += 0.2;
    }
    
    if (failure.message.includes('custom-pattern')) {
      confidence += 0.3;
    }
    
    // Adjust based on system state
    if (context.systemState.load.activeTests < 5) {
      confidence += 0.1;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  private async tryCustomApproach(failure: TestFailure, context: HealingContext): Promise<boolean> {
    // Implement custom healing logic
    // This is where you would implement your specific healing approach
    
    // Example: Try to find element using custom method
    const selector = this.extractSelector(failure);
    if (selector) {
      // Simulate element lookup
      await new Promise(resolve => setTimeout(resolve, 100));
      return true; // Simplified for example
    }
    
    return false;
  }

  private extractSelector(failure: TestFailure): string | null {
    // Extract selector from failure context
    return failure.context?.custom?.['selector'] || null;
  }
}
```

### Strategy Configuration Interface

Define a configuration interface for your custom strategy:

```typescript
export interface CustomConfig {
  customOption: boolean;
  customTimeout: number;
  customRetries: number;
  customPatterns: string[];
}
```

### Registering Custom Strategies

```typescript
import { CustomHealingStrategy } from './src/healing/strategies/CustomHealingStrategy';

// Create and configure custom strategy
const customStrategy = new CustomHealingStrategy({
  customOption: true,
  customTimeout: 10000,
  customRetries: 3,
  customPatterns: ['pattern1', 'pattern2']
});

// Register with healing engine
healingEngine.registerStrategy(customStrategy);
```

## Strategy Testing

### Unit Testing Strategies

Create comprehensive unit tests for your custom strategies:

```typescript
import { CustomHealingStrategy } from '../../src/healing/strategies/CustomHealingStrategy';
import { TestFailure, HealingContext } from '../../src/types';

describe('CustomHealingStrategy', () => {
  let strategy: CustomHealingStrategy;
  let testFailure: TestFailure;
  let healingContext: HealingContext;

  beforeEach(() => {
    strategy = new CustomHealingStrategy();
    // Setup test failure and context
  });

  it('should have correct properties', () => {
    expect(strategy.name).toBe('custom-healing');
    expect(strategy.version).toBe('1.0.0');
    expect(strategy.supportedFailureTypes).toContain('element_not_found');
  });

  it('should calculate confidence correctly', async () => {
    const confidence = await strategy.calculateConfidence(testFailure, healingContext);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('should heal supported failure types', async () => {
    const result = await strategy.heal(testFailure, healingContext);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should return failure for unsupported failure types', async () => {
    const unsupportedFailure = { ...testFailure, type: 'network_error' };
    const result = await strategy.heal(unsupportedFailure, healingContext);
    expect(result.success).toBe(false);
  });
});
```

## Performance Optimization

### Strategy Performance Tips

1. **Efficient Selector Parsing**: Use efficient regex patterns for selector parsing
2. **Caching**: Cache parsed selectors and results when possible
3. **Early Exit**: Exit early when healing is not possible
4. **Resource Management**: Limit resource usage and timeouts
5. **Parallel Processing**: Use parallel processing for multiple healing attempts

### Monitoring Strategy Performance

```typescript
// Get strategy-specific statistics
const stats = healingEngine.getStatistics();
console.log('Strategy performance:', stats.successRateByStrategy);

// Monitor individual strategy performance
const strategyStats = stats.successRateByStrategy['custom-healing'];
console.log('Custom strategy success rate:', strategyStats);
```

## Best Practices

### Strategy Design

1. **Single Responsibility**: Each strategy should focus on one healing approach
2. **Fail Fast**: Return failure results quickly when healing is not possible
3. **Comprehensive Logging**: Log all healing attempts and results
4. **Error Handling**: Handle errors gracefully and provide meaningful messages
5. **Configuration**: Make strategies configurable for different use cases

### Strategy Implementation

1. **Extend Base Class**: Always extend the `HealingStrategy` base class
2. **Implement Required Methods**: Implement all required abstract methods
3. **Use Helper Methods**: Use base class helper methods for common operations
4. **Validate Inputs**: Validate inputs and handle edge cases
5. **Test Thoroughly**: Create comprehensive tests for all scenarios

### Strategy Registration

1. **Order Matters**: Register strategies in order of preference
2. **Avoid Duplicates**: Don't register the same strategy multiple times
3. **Monitor Performance**: Track strategy performance and adjust as needed
4. **Configuration**: Configure strategies appropriately for your use case

## Troubleshooting

### Common Strategy Issues

#### Strategy Not Triggering
- **Cause**: Strategy not registered or doesn't support failure type
- **Solution**: Verify registration and supported failure types

#### Low Success Rate
- **Cause**: Strategy not well-suited for the failure type
- **Solution**: Adjust strategy or add more appropriate strategies

#### Performance Issues
- **Cause**: Inefficient implementation or resource usage
- **Solution**: Optimize implementation and limit resource usage

#### Configuration Issues
- **Cause**: Incorrect configuration values
- **Solution**: Verify configuration and use appropriate defaults

### Debugging Strategies

1. **Enable Detailed Logging**: Set `enableDetailedLogging: true`
2. **Test Individually**: Test each strategy in isolation
3. **Monitor Confidence Scores**: Check if confidence calculations are appropriate
4. **Review Healing Actions**: Examine the actions taken by strategies
5. **Check System Resources**: Ensure adequate system resources

## Conclusion

Healing strategies are the building blocks of the self-healing system. By understanding the available strategies and how to implement custom ones, you can create a robust, adaptable healing system that handles various failure scenarios effectively.

The key to successful healing is choosing the right combination of strategies and configuring them appropriately for your specific use case. Regular monitoring and optimization of strategy performance will ensure continued effectiveness as your application evolves.
