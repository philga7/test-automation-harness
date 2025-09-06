# Shrimp Rules - Self-Healing Test Automation Harness

## Project Overview

This is a **Self-Healing Test Automation Harness** that orchestrates multiple test types with AI-powered healing capabilities. The system is built with TypeScript/Node.js and follows a plugin-based architecture for extensibility.

### Key Technologies
- **TypeScript/Node.js**: Core runtime and language
- **Express**: REST API framework
- **Playwright**: E2E testing engine
- **Jest/Vitest**: Unit testing engine
- **k6**: Performance testing engine
- **OWASP ZAP**: Security testing engine
- **Docker**: Containerization
- **OpenTelemetry**: Observability

### Success Criteria
- **60% healing success rate** for locator recovery
- **<500ms healing actions** for performance
- **<10 minutes setup time** for deployment
- **Unified reporting** across all test types

## Architecture

### Core Components
```
src/
├── core/           # Test orchestration and coordination
├── engines/        # Test engine implementations (Playwright, Jest, k6, ZAP)
├── healing/        # AI-powered self-healing algorithms
├── config/         # Configuration management (YAML-based)
├── api/            # REST API endpoints
├── observability/  # Metrics, logging, and monitoring
├── types/          # TypeScript type definitions
└── utils/          # Shared utilities and helpers
```

### Plugin Architecture Pattern
- **Abstract Interfaces**: Define contracts for test engines
- **Base Classes**: Provide common functionality
- **Concrete Implementations**: Engine-specific logic
- **Registry Pattern**: Dynamic engine registration
- **Factory Pattern**: Engine instantiation

## Code Standards

### TypeScript Configuration
- **ALWAYS** use strict mode with all strict flags enabled
- **ALWAYS** use path aliases for clean imports (`@/core/*`, `@/engines/*`)
- **ALWAYS** implement proper error handling with custom error types
- **NEVER** use `any` type without explicit justification
- **ALWAYS** use interfaces for object shapes and contracts

### File Naming Conventions
- **Files**: kebab-case (`test-orchestrator.ts`, `healing-engine.ts`)
- **Classes**: PascalCase (`TestOrchestrator`, `HealingEngine`)
- **Functions/Variables**: camelCase (`executeTests`, `healingResult`)
- **Constants**: UPPER_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Interfaces**: PascalCase with descriptive names (`TestEngine`, `HealingStrategy`)

### Import Organization
```typescript
// 1. Node.js built-ins
import fs from 'fs';
import path from 'path';

// 2. External dependencies
import express from 'express';
import yaml from 'js-yaml';

// 3. Internal modules (using path aliases)
import { TestEngine } from '@/types/engine';
import { logger } from '@/utils/logger';
import { config } from '@/config';
```

## Component Standards

### Test Engine Implementation
```typescript
// ALWAYS implement the TestEngine interface
interface TestEngine {
  readonly name: string;
  readonly version: string;
  readonly capabilities: EngineCapabilities;
  
  initialize(config: EngineConfig): Promise<void>;
  execute(tests: TestSpec[]): Promise<TestResult[]>;
  cleanup(): Promise<void>;
}

// ALWAYS extend the base engine class
abstract class BaseTestEngine implements TestEngine {
  protected config: EngineConfig;
  protected logger: Logger;
  
  constructor(config: EngineConfig) {
    this.config = config;
    this.logger = logger.child({ engine: this.name });
  }
  
  abstract execute(tests: TestSpec[]): Promise<TestResult[]>;
}
```

### Healing Strategy Implementation
```typescript
// ALWAYS implement confidence scoring
interface HealingStrategy {
  readonly name: string;
  readonly confidence: number; // 0-1 scale
  
  canHeal(failure: TestFailure): boolean;
  heal(failure: TestFailure): Promise<HealingResult>;
}

// ALWAYS provide fallback strategies
class LocatorHealingStrategy implements HealingStrategy {
  private strategies: HealingStrategy[] = [
    new IdFallbackStrategy(),
    new CssFallbackStrategy(),
    new XPathFallbackStrategy(),
    new NeighborAnalysisStrategy()
  ];
  
  async heal(failure: TestFailure): Promise<HealingResult> {
    for (const strategy of this.strategies) {
      if (strategy.canHeal(failure)) {
        const result = await strategy.heal(failure);
        if (result.confidence >= this.minConfidence) {
          return result;
        }
      }
    }
    throw new HealingFailedError('No suitable healing strategy found');
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
  api: ApiConfig;
}

// ALWAYS validate configuration on load
class ConfigManager {
  loadConfig(path: string): TestConfig {
    try {
      const rawConfig = yaml.load(fs.readFileSync(path, 'utf8'));
      return this.validateConfig(rawConfig);
    } catch (error) {
      throw new ConfigError(`Failed to load config from ${path}`, error);
    }
  }
  
  private validateConfig(config: any): TestConfig {
    // ALWAYS validate required fields
    if (!config.engines || !Array.isArray(config.engines)) {
      throw new ConfigError('engines array is required');
    }
    
    // ALWAYS validate engine configurations
    for (const engine of config.engines) {
      this.validateEngineConfig(engine);
    }
    
    return config as TestConfig;
  }
}
```

## Service Layer Standards

### Orchestration Service
```typescript
// ALWAYS implement proper error handling and logging
class TestOrchestrator {
  private engines: Map<string, TestEngine> = new Map();
  private healingEngine: HealingEngine;
  
  async executeTests(config: TestConfig): Promise<TestResult[]> {
    const startTime = Date.now();
    this.logger.info('Starting test execution', { config });
    
    try {
      const results = await this.runEngines(config);
      const healedResults = await this.healingEngine.processFailures(results);
      
      const duration = Date.now() - startTime;
      this.logger.info('Test execution completed', { 
        duration, 
        totalTests: results.length,
        healedTests: healedResults.filter(r => r.healed).length
      });
      
      return healedResults;
    } catch (error) {
      this.logger.error('Test execution failed', { error });
      throw new TestExecutionError('Failed to execute tests', error);
    }
  }
}
```

### Healing Service
```typescript
// ALWAYS implement confidence-based healing
class HealingEngine {
  private strategies: HealingStrategy[] = [];
  private confidenceThreshold: number;
  
  async heal(failure: TestFailure): Promise<HealingResult> {
    this.logger.debug('Attempting to heal test failure', { failure });
    
    for (const strategy of this.strategies) {
      if (strategy.canHeal(failure)) {
        try {
          const result = await strategy.heal(failure);
          if (result.confidence >= this.confidenceThreshold) {
            this.logger.info('Healing successful', { 
              strategy: strategy.name, 
              confidence: result.confidence 
            });
            return result;
          }
        } catch (error) {
          this.logger.warn('Healing strategy failed', { 
            strategy: strategy.name, 
            error 
          });
        }
      }
    }
    
    throw new HealingFailedError('No suitable healing strategy found');
  }
}
```

## Custom Hook Standards

### Configuration Hooks
```typescript
// ALWAYS provide hooks for configuration changes
interface ConfigHooks {
  onEngineConfigChange: (engine: string, config: EngineConfig) => void;
  onHealingConfigChange: (config: HealingConfig) => void;
  onObservabilityConfigChange: (config: ObservabilityConfig) => void;
}

// ALWAYS implement hook registration
class ConfigManager {
  private hooks: ConfigHooks[] = [];
  
  registerHooks(hooks: ConfigHooks): void {
    this.hooks.push(hooks);
  }
  
  private notifyConfigChange(type: string, config: any): void {
    this.hooks.forEach(hooks => {
      try {
        hooks[type]?.(config);
      } catch (error) {
        this.logger.error('Config hook failed', { type, error });
      }
    });
  }
}
```

### Test Execution Hooks
```typescript
// ALWAYS provide hooks for test lifecycle events
interface TestHooks {
  onTestStart: (test: TestSpec) => void;
  onTestComplete: (result: TestResult) => void;
  onTestFailure: (failure: TestFailure) => void;
  onHealingAttempt: (attempt: HealingAttempt) => void;
}

// ALWAYS implement hook execution
class TestOrchestrator {
  private hooks: TestHooks[] = [];
  
  private async executeHooks<T extends keyof TestHooks>(
    hookName: T, 
    ...args: Parameters<TestHooks[T]>
  ): Promise<void> {
    for (const hooks of this.hooks) {
      try {
        await hooks[hookName]?.(...args);
      } catch (error) {
        this.logger.error('Test hook failed', { hookName, error });
      }
    }
  }
}
```

## Data Management

### Test Result Storage
```typescript
// ALWAYS use structured data formats
interface TestResult {
  id: string;
  testSpec: TestSpec;
  status: TestStatus;
  duration: number;
  timestamp: Date;
  metadata: Record<string, any>;
  healing?: HealingResult;
}

// ALWAYS implement proper serialization
class TestResultStorage {
  async store(result: TestResult): Promise<void> {
    const serialized = {
      ...result,
      timestamp: result.timestamp.toISOString(),
      metadata: JSON.stringify(result.metadata)
    };
    
    await this.database.insert('test_results', serialized);
  }
  
  async retrieve(id: string): Promise<TestResult> {
    const row = await this.database.select('test_results', { id });
    return this.deserialize(row);
  }
}
```

### Configuration Storage
```typescript
// ALWAYS support environment-specific configurations
interface EnvironmentConfig {
  development: TestConfig;
  staging: TestConfig;
  production: TestConfig;
}

// ALWAYS implement configuration inheritance
class ConfigManager {
  loadEnvironmentConfig(env: string): TestConfig {
    const baseConfig = this.loadConfig('config/base.yaml');
    const envConfig = this.loadConfig(`config/${env}.yaml`);
    
    return this.mergeConfigs(baseConfig, envConfig);
  }
}
```

## UI/UX Standards

### API Response Format
```typescript
// ALWAYS use consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    duration: number;
  };
}

// ALWAYS implement proper error responses
class ApiController {
  private sendResponse<T>(res: Response, data: T, duration: number): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
        duration
      }
    };
    
    res.json(response);
  }
  
  private sendError(res: Response, error: Error, duration: number): void {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: error.name,
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
        duration
      }
    };
    
    res.status(500).json(response);
  }
}
```

### Logging Standards
```typescript
// ALWAYS use structured logging
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: {
    component: string;
    operation: string;
    requestId?: string;
    userId?: string;
  };
  data?: Record<string, any>;
}

// ALWAYS include relevant context
class Logger {
  child(context: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...context });
  }
  
  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }
  
  error(message: string, error?: Error, data?: Record<string, any>): void {
    this.log('error', message, { ...data, error: error?.stack });
  }
}
```

## File Interaction Standards

### Configuration Files
- **ALWAYS** use YAML for configuration files
- **ALWAYS** validate configuration on load
- **ALWAYS** support environment-specific overrides
- **ALWAYS** provide default values for optional settings

### Test Files
- **ALWAYS** use descriptive test file names
- **ALWAYS** group related tests in the same file
- **ALWAYS** use consistent test structure (arrange, act, assert)
- **ALWAYS** include setup and teardown logic

### Documentation Files
- **ALWAYS** keep README.md up to date
- **ALWAYS** document API endpoints
- **ALWAYS** provide configuration examples
- **ALWAYS** include troubleshooting guides

## Development Workflow

### Git Workflow
- **ALWAYS** use conventional commits
- **ALWAYS** create feature branches
- **ALWAYS** run tests before committing
- **ALWAYS** update documentation with changes

### Testing Workflow
- **ALWAYS** write unit tests for new features
- **ALWAYS** write integration tests for API endpoints
- **ALWAYS** test healing strategies with mock failures
- **ALWAYS** validate configuration changes

### Deployment Workflow
- **ALWAYS** use Docker for deployment
- **ALWAYS** validate configuration in staging
- **ALWAYS** monitor healing success rates
- **ALWAYS** have rollback procedures

## Prohibited Actions

### NEVER Do These
- **NEVER** hardcode test engine logic in core components
- **NEVER** skip error handling in critical paths
- **NEVER** implement healing without confidence scoring
- **NEVER** create circular dependencies between modules
- **NEVER** ignore TypeScript strict mode warnings
- **NEVER** commit sensitive configuration data
- **NEVER** bypass the plugin architecture
- **NEVER** implement healing strategies without fallbacks

### Security Considerations
- **NEVER** expose sensitive configuration in logs
- **NEVER** allow arbitrary code execution in healing
- **ALWAYS** validate input parameters
- **ALWAYS** sanitize test results before storage
- **ALWAYS** use secure communication protocols
- **ALWAYS** implement proper authentication

## AI Decision-Making Standards

### When Implementing New Features
1. **Check existing patterns** in the codebase
2. **Follow the plugin architecture** for test engines
3. **Implement proper interfaces** before concrete classes
4. **Add comprehensive error handling** and logging
5. **Include observability hooks** for monitoring
6. **Write tests** for new functionality
7. **Update documentation** with changes

### When Refactoring
1. **Understand the impact** on other components
2. **Maintain backward compatibility** when possible
3. **Update all related tests** and documentation
4. **Verify healing strategies** still work correctly
5. **Check configuration compatibility**

### Priority Order for Decisions
1. **Safety**: Never break existing functionality
2. **Performance**: Maintain <500ms healing actions
3. **Reliability**: Achieve 60% healing success rate
4. **Maintainability**: Follow established patterns
5. **Extensibility**: Support new test engines easily

---

**Remember**: This is a self-healing test automation system. Every decision should consider how it affects the overall healing capabilities, system reliability, and the ability to maintain tests with minimal manual intervention.
