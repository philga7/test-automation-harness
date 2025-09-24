# AI Agent Guidelines - Self-Healing Test Automation Harness

## Project Architecture Overview

This is a **Self-Healing Test Automation Harness** built with TypeScript/Node.js that orchestrates multiple test types (unit, e2e, performance, security) with AI-powered self-healing capabilities.

### Core Components
- **Core Orchestrator**: Manages test execution and coordination
- **Plugin Architecture**: Swappable test engines for different test types
- **Healing Engine**: AI-powered test recovery and adaptation
- **Configuration System**: YAML-based test and environment configuration
- **Observability Layer**: Metrics collection and reporting
- **REST API**: Task execution, result retrieval, healing statistics, and app analysis
- **Web Dashboard**: Responsive UI for system monitoring and control

### Test Engines
- **Playwright**: E2E testing with auto-heal capabilities
- **Jest/Vitest**: Unit and integration testing
- **k6**: Performance and load testing
- **OWASP ZAP**: Security testing
- **App Analysis**: Automated app analysis and test generation with self-healing capabilities
- **WebAppAnalyzer**: Complete web application analysis with DOM extraction and UI element identification
- **TestScenarioGenerator**: Converts app analysis results into Playwright test scenarios with comprehensive test generation
- **AITestGenerator**: AI-powered intelligent test scenario generation using LLM integration for natural language processing

## AI Agent Responsibilities

### Memory Management
- **ALWAYS** store project-specific knowledge in Cipher memory
- **ALWAYS** search existing memories before implementing new features
- **NEVER** duplicate existing functionality without checking memory first
- **ALWAYS** update memories when architecture changes

### Code Generation
- **ALWAYS** follow TypeScript strict mode requirements
- **ALWAYS** implement proper error handling and logging
- **ALWAYS** use the established folder structure (src/core, src/engines, etc.)
- **NEVER** create files outside the established architecture
- **ALWAYS** implement interfaces before concrete classes

### Plugin Architecture
- **ALWAYS** create abstract interfaces for new test engines
- **ALWAYS** implement the base engine class before concrete implementations
- **ALWAYS** follow the plugin registration pattern
- **NEVER** hardcode engine-specific logic in the core orchestrator

### Plugin Integration Standards
- **ALWAYS** add configuration schema interface extending TestEngineConfig
- **ALWAYS** update AppConfig.engines type definition with bracket notation for new engines
- **ALWAYS** add comprehensive default configuration values in DEFAULT_CONFIG
- **ALWAYS** include environment-specific overrides in YAML configuration
- **ALWAYS** test constructor registration with TestEngineFactory
- **ALWAYS** test plugin registry integration and engine discovery
- **ALWAYS** test complete lifecycle management (initialization → execution → cleanup)
- **ALWAYS** use TDD methodology for plugin integration (RED-GREEN-REFACTOR)

### Self-Healing Implementation
- **ALWAYS** implement confidence scoring for healing actions
- **ALWAYS** provide fallback strategies (ID, CSS, XPath, neighbor analysis)
- **ALWAYS** log healing attempts and success rates
- **NEVER** auto-heal without user-configurable confidence thresholds

### UI/Dashboard Development
- **ALWAYS** use semantic HTML with proper ARIA labels
- **ALWAYS** implement mobile-first responsive design
- **ALWAYS** follow glassmorphism design patterns for consistency
- **ALWAYS** provide real-time data updates with auto-refresh
- **ALWAYS** implement proper error handling and user feedback
- **NEVER** hardcode API endpoints in frontend code
- **ALWAYS** use `/static/` prefix for CSS/JS paths in HTML
- **ALWAYS** set explicit MIME type headers in Express.js server
- **ALWAYS** rebuild (`npm run build`) after UI changes (server serves from `dist/`)
- **ALWAYS** implement comprehensive test results visualization with filtering, pagination, and artifact viewing
- **ALWAYS** provide modal-based detailed views for test results, artifacts, and healing attempts

## Development Patterns

### TypeScript Standards
```typescript
// ALWAYS use strict interfaces
interface TestEngine {
  name: string;
  version: string;
  execute(config: TestConfig): Promise<TestResult>;
  heal(failure: TestFailure): Promise<HealingResult>;
}

// ALWAYS implement proper error handling
class TestOrchestrator {
  async executeTests(config: TestConfig): Promise<TestResult[]> {
    try {
      const results = await this.runEngines(config);
      return results;
    } catch (error) {
      logger.error('Test execution failed:', error);
      throw new TestExecutionError('Failed to execute tests', error);
    }
  }
}

// ALWAYS use bracket notation for Record<string, any> properties in strict mode
class AppAnalysisEngine extends TestEngine {
  protected async doExecute(config: TestConfig): Promise<TestResult> {
    // ✅ CORRECT: Use bracket notation for dynamic properties
    const url = config.parameters['url'] as string;
    const analysisType = config.parameters['analysisType'] || 'basic';
    
    // ❌ WRONG: Dot notation fails in TypeScript strict mode
    // const url = config.parameters.url;
    
    return this.createTestResult(config, 'passed');
  }
}

// ALWAYS implement Error classes with proper TypeScript strict mode compliance
class AnalysisError extends Error {
  public override readonly cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'AnalysisError';
    // ✅ CORRECT: Conditional assignment for exactOptionalPropertyTypes
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

// ALWAYS use conditional assignment for optional properties in strict mode
class AnalysisConfigurationError extends AnalysisError {
  public readonly configField?: string;
  
  constructor(message: string, configField?: string, cause?: Error) {
    super(message, cause);
    this.name = 'AnalysisConfigurationError';
    if (configField !== undefined) {
      this.configField = configField;
    }
  }
}
```

### Plugin Registration Pattern
```typescript
// ALWAYS register plugins through the registry
class EngineRegistry {
  private engines = new Map<string, TestEngine>();
  
  register(engine: TestEngine): void {
    this.engines.set(engine.name, engine);
    logger.info(`Registered test engine: ${engine.name}`);
  }
  
  getEngine(name: string): TestEngine | undefined {
    return this.engines.get(name);
  }
}
```

### Configuration Management
```typescript
// ALWAYS use YAML configuration with validation
interface TestConfig {
  engines: EngineConfig[];
  healing: HealingConfig;
  observability: ObservabilityConfig;
}

// ALWAYS validate configuration on load
class ConfigManager {
  loadConfig(path: string): TestConfig {
    const config = yaml.load(fs.readFileSync(path, 'utf8'));
    return this.validateConfig(config);
  }
}
```

### Plugin Integration Patterns
```typescript
// ALWAYS add engine-specific configuration interface
export interface AppAnalysisConfig extends TestEngineConfig {
  analysisDepth?: 'basic' | 'comprehensive' | 'detailed';
  outputFormat?: 'json' | 'xml' | 'html';
  includeScreenshots?: boolean;
}

// ALWAYS update AppConfig.engines with bracket notation
engines: {
  playwright: PlaywrightConfig;
  jest: JestConfig;
  k6: K6Config;
  zap: ZapConfig;
  'app-analysis': AppAnalysisConfig;  // Use bracket notation for dynamic keys
};

// ALWAYS test plugin registration
factory.registerEngineConstructor('app-analysis', AppAnalysisEngine);
expect(factory.isEngineTypeAvailable('app-analysis')).toBe(true);

// ALWAYS test complete integration workflow
const engine = await factory.createEngine(config);
registry.registerTestEngine(engine);
const retrievedEngine = registry.getTestEngine('app-analysis');
expect(retrievedEngine).toBe(engine);
```

### Analysis Configuration and Types Patterns
```typescript
// ALWAYS organize analysis types in structured modules
// src/analysis/types/
// ├── config.ts          # AppAnalysisConfig with comprehensive options
// ├── results.ts          # AppAnalysisResult with nested type definitions  
// ├── errors.ts           # Error hierarchy with proper inheritance
// ├── validation.ts       # JSON schemas and runtime validation
// ├── patterns.ts         # TypeScript strict mode patterns
// └── index.ts           # Consolidated exports

// ALWAYS extend base interfaces with analysis-specific options
export interface AppAnalysisConfig extends TestEngineConfig {
  analysisDepth?: 'basic' | 'comprehensive' | 'detailed';
  outputFormat?: 'json' | 'xml' | 'html';
  ai?: {
    enabled?: boolean;
    provider?: 'openai' | 'claude' | 'local';
    model?: string;
  };
  // Comprehensive JSDoc documentation with @example blocks
}

// ALWAYS provide comprehensive result structures with nested types
export interface AppAnalysisResult {
  id: string;
  status: AnalysisStatus;
  domStructure?: { elementCount: number; depth: number; complexity: string };
  uiElements?: AnalysisUIElement[];
  userFlows?: AnalysisUserFlow[];
  artifacts?: { screenshots: string[]; reports: string[] };
  performance?: { analysisTime: number; elementExtractionTime: number };
}
```

### AI-Powered Test Generation Patterns
```typescript
// ALWAYS implement AI service integration with multiple providers
interface AIServiceConfig {
  provider: 'openai' | 'claude' | 'local';
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

// ALWAYS implement performance monitoring and caching
class AITestGenerator {
  private requestCache = new Map<string, { result: any; timestamp: number }>();
  private performanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    cacheHitRate: 0,
    averageResponseTime: 0
  };

  async generateFromUserStory(userStory: string): Promise<AITestGenerationResponse> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.getCacheKey('generate_scenarios', { userStory });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.updateCacheHitRate(true);
      return cached;
    }

    // Call AI service with comprehensive error handling
    try {
      const result = await this.callAIService('generate_scenarios', { userStory });
      this.setCache(cacheKey, result);
      this.updatePerformanceMetrics(true, Date.now() - startTime);
      return result;
    } catch (error) {
      this.handleAIServiceError(error);
      throw error;
    }
  }
}

// ALWAYS provide fallback mechanisms for AI service unavailability
class AITestGenerator {
  async generateWithFallback(userStory: string): Promise<AITestGenerationResponse> {
    try {
      return await this.generateFromUserStory(userStory);
    } catch (error) {
      // Fallback to TestScenarioGenerator
      const fallbackScenarios = await this.testScenarioGenerator.generateUserFlowScenarios([]);
      return {
        scenarios: fallbackScenarios.map(s => ({ ...s, metadata: { fallbackGenerated: true } })),
        confidence: 0.5,
        reasoning: 'Generated using fallback due to AI service unavailability'
      };
    }
  }
}
```

### UI/Dashboard Patterns
```typescript
// ALWAYS use semantic HTML structure
<nav class="navbar" role="navigation" aria-label="Main navigation">
  <ul class="nav-menu" role="menubar">
    <li role="none">
      <a href="#overview" role="menuitem" class="nav-link">Overview</a>
    </li>
  </ul>
</nav>

// ALWAYS implement responsive CSS with CSS custom properties
:root {
  --primary-color: #667eea;
  --background-glass: rgba(255, 255, 255, 0.1);
  --border-glass: rgba(255, 255, 255, 0.2);
}

// ALWAYS provide real-time data updates
class Dashboard {
  async loadSystemStatus() {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      this.updateElement('system-status', data.status);
    } catch (error) {
      this.showNotification('Failed to load status', 'error');
    }
  }
}
```

## File Interaction Standards

### Directory Structure
```
src/
├── analysis/       # App analysis engine implementation
│   ├── AppAnalysisEngine.ts      # Analysis engine implementation
│   ├── WebAppAnalyzer.ts         # Web app analyzer component
│   ├── UserFlowDetector.ts       # User journey identification and flow analysis
│   ├── TestScenarioGenerator.ts  # Converts analysis results to Playwright test scenarios
│   └── AITestGenerator.ts        # NEW! AI-powered intelligent test generation with LLM integration
├── core/           # Core orchestration logic
├── engines/        # Test engine implementations
├── healing/        # Self-healing algorithms
├── config/         # Configuration management
├── api/            # REST API endpoints
├── observability/  # Metrics and monitoring
├── types/          # TypeScript type definitions
├── ui/             # Web dashboard and UI components
│   └── public/     # Static assets (HTML, CSS, JS)
└── utils/          # Shared utilities
```

### File Naming Conventions
- **ALWAYS** use kebab-case for file names
- **ALWAYS** use PascalCase for class names
- **ALWAYS** use camelCase for function and variable names
- **ALWAYS** use UPPER_CASE for constants

### Import Standards
```typescript
// ALWAYS use path aliases
import { TestEngine } from '@/types/engine';
import { logger } from '@/utils/logger';
import { config } from '@/config';

// ALWAYS group imports
import express from 'express';
import { Request, Response } from 'express';

import { TestOrchestrator } from '@/core/orchestrator';
import { HealingEngine } from '@/healing/engine';
```

## Decision-Making Guidelines

### Priority Order
1. **Safety First**: Never break existing functionality
2. **Performance**: Maintain <500ms healing actions
3. **Reliability**: Achieve 60% healing success rate
4. **Maintainability**: Follow established patterns
5. **Extensibility**: Support new test engines easily

### When to Implement New Features
- **ALWAYS** check if similar functionality exists
- **ALWAYS** implement interfaces first
- **ALWAYS** add comprehensive error handling
- **ALWAYS** include logging and observability
- **ALWAYS** write tests for new functionality

### When to Refactor
- **ALWAYS** refactor when adding new test engines
- **ALWAYS** refactor when healing strategies change
- **NEVER** refactor without understanding the impact
- **ALWAYS** maintain backward compatibility

## Code Review Checklist

### Before Committing
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate
- [ ] Configuration is validated
- [ ] Documentation is updated

### Architecture Review
- [ ] Follows plugin architecture pattern
- [ ] Implements proper interfaces
- [ ] Maintains separation of concerns
- [ ] Supports extensibility
- [ ] Includes observability hooks

### Documentation Standards
```typescript
// ALWAYS provide comprehensive JSDoc with examples
/**
 * Comprehensive configuration interface for App Analysis Engine
 * 
 * Extends the base TestEngineConfig with analysis-specific options for:
 * - DOM extraction and UI element identification
 * - User flow detection and test scenario generation  
 * - AI-powered test generation capabilities
 * - Browser automation and screenshot capture
 * - Output formatting and artifact management
 * 
 * @example
 * ```typescript
 * const config: AppAnalysisConfig = {
 *   enabled: true,
 *   timeout: 30000,
 *   analysisDepth: 'comprehensive',
 *   outputFormat: 'json',
 *   includeScreenshots: true,
 *   ai: {
 *     enabled: true,
 *     provider: 'openai',
 *     model: 'gpt-4'
 *   }
 * };
 * ```
 */
export interface AppAnalysisConfig extends TestEngineConfig {
  /**
   * Analysis depth configuration
   * - 'basic': Fast analysis with core elements only
   * - 'comprehensive': Balanced analysis with most elements and flows
   * - 'detailed': Deep analysis with all elements, flows, and edge cases
   * @default 'comprehensive'
   */
  analysisDepth?: 'basic' | 'comprehensive' | 'detailed';
}
```

## Prohibited Actions

### NEVER Do These
- **NEVER** hardcode test engine logic in core
- **NEVER** skip error handling in critical paths
- **NEVER** implement healing without confidence scoring
- **NEVER** create circular dependencies
- **NEVER** ignore TypeScript strict mode warnings
- **NEVER** commit without proper logging
- **NEVER** implement Error classes without conditional assignment for optional properties
- **NEVER** use dot notation for Record<string, any> properties in strict mode

### Security Considerations
- **NEVER** expose sensitive configuration in logs
- **NEVER** allow arbitrary code execution in healing
- **ALWAYS** validate input parameters
- **ALWAYS** sanitize test results before storage

## AI Communication Standards

### When Reporting Progress
- **ALWAYS** mention which component you're working on
- **ALWAYS** explain the impact on other components
- **ALWAYS** mention any configuration changes needed
- **ALWAYS** provide verification steps

### When Asking Questions
- **ALWAYS** check existing memories first
- **ALWAYS** provide context about the current task
- **ALWAYS** mention any constraints or requirements
- **ALWAYS** suggest potential solutions

## Memory-Specific Guidelines

### Knowledge Storage
- **ALWAYS** store project architecture decisions
- **ALWAYS** store configuration patterns
- **ALWAYS** store integration examples
- **ALWAYS** store troubleshooting solutions

### Knowledge Retrieval
- **ALWAYS** search memories before implementing
- **ALWAYS** check for similar patterns
- **ALWAYS** verify current relevance
- **ALWAYS** update outdated information

## Integration Standards

### MCP Integration
- **ALWAYS** use Cipher memory for project knowledge
- **ALWAYS** store implementation patterns
- **ALWAYS** retrieve existing solutions
- **ALWAYS** update memories with new learnings

### API Integration
- **ALWAYS** implement proper error handling
- **ALWAYS** include request/response validation
- **ALWAYS** provide comprehensive logging
- **ALWAYS** support graceful degradation
- **ALWAYS** follow established middleware patterns (validation, error handling, async handlers)
- **ALWAYS** integrate with existing server configuration and route registration

## Testing Standards

### Unit Testing
- **ALWAYS** test core orchestration logic
- **ALWAYS** test healing strategies
- **ALWAYS** test configuration validation
- **ALWAYS** test error scenarios
- **ALWAYS** use unique variable names for global test declarations to prevent TypeScript conflicts
- **ALWAYS** search for existing global declarations before creating new test files (`grep -r "const mockFetch" tests/`)
- **ALWAYS** follow strict TDD methodology: RED-GREEN-REFACTOR cycle for new engines
- **ALWAYS** test TypeScript strict mode compliance with bracket notation for dynamic properties
- **ALWAYS** test module existence before implementation using require() with try-catch patterns
- **ALWAYS** use conditional assignment for optional properties in exactOptionalPropertyTypes mode
- **ALWAYS** implement Error class inheritance with proper override modifiers and conditional assignment

### Integration Testing
- **ALWAYS** test engine registration
- **ALWAYS** test healing workflows
- **ALWAYS** test API endpoints
- **ALWAYS** test observability hooks
- **ALWAYS** test plugin factory integration
- **ALWAYS** test engine configuration validation
- **ALWAYS** test API route integration with Express.js server
- **ALWAYS** test middleware integration (validation, error handling, async handlers)
- **ALWAYS** test API endpoint request/response validation with Joi schemas

## Performance Guidelines

### Healing Performance
- **ALWAYS** maintain <500ms healing actions
- **ALWAYS** implement timeout mechanisms
- **ALWAYS** cache frequently used data
- **ALWAYS** monitor healing success rates

### System Performance
- **ALWAYS** implement proper resource cleanup
- **ALWAYS** use connection pooling
- **ALWAYS** implement rate limiting
- **ALWAYS** monitor memory usage

## Troubleshooting

### Common Issues
1. **Engine Registration Failures**: Check interface implementation
2. **Healing Timeouts**: Verify confidence thresholds
3. **Configuration Errors**: Validate YAML syntax
4. **Memory Leaks**: Check resource cleanup
5. **CSS/JS Not Loading**: Check MIME type headers, `/static/` paths, rebuild dist/
6. **Dashboard Not Updating**: Clear browser cache, verify API endpoints
7. **API Route Not Found**: Check server integration and route registration
8. **Validation Errors**: Verify Joi schema definitions and request format
9. **Async Handler Issues**: Ensure proper error handling in async route handlers

### Debug Steps
1. Check logs for error messages
2. Verify configuration validity
3. Test individual components
4. Check memory usage
5. Verify network connectivity

---

**Remember**: This is a self-healing test automation system. Every decision should consider how it affects the overall healing capabilities and system reliability.
