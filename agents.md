# AI Agent Guidelines - Self-Healing Test Automation Harness

## Project Architecture Overview

This is a **Self-Healing Test Automation Harness** built with TypeScript/Node.js that orchestrates multiple test types (unit, e2e, performance, security) with AI-powered self-healing capabilities.

### Core Components
- **Core Orchestrator**: Manages test execution and coordination
- **Plugin Architecture**: Swappable test engines for different test types
- **Healing Engine**: AI-powered test recovery and adaptation
- **Configuration System**: YAML-based test and environment configuration
- **Observability Layer**: Metrics collection and reporting
- **REST API**: Task execution, result retrieval, and healing statistics
- **Web Dashboard**: Responsive UI for system monitoring and control

### Test Engines
- **Playwright**: E2E testing with auto-heal capabilities
- **Jest/Vitest**: Unit and integration testing
- **k6**: Performance and load testing
- **OWASP ZAP**: Security testing

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

## Prohibited Actions

### NEVER Do These
- **NEVER** hardcode test engine logic in core
- **NEVER** skip error handling in critical paths
- **NEVER** implement healing without confidence scoring
- **NEVER** create circular dependencies
- **NEVER** ignore TypeScript strict mode warnings
- **NEVER** commit without proper logging

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

## Testing Standards

### Unit Testing
- **ALWAYS** test core orchestration logic
- **ALWAYS** test healing strategies
- **ALWAYS** test configuration validation
- **ALWAYS** test error scenarios

### Integration Testing
- **ALWAYS** test engine registration
- **ALWAYS** test healing workflows
- **ALWAYS** test API endpoints
- **ALWAYS** test observability hooks

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

### Debug Steps
1. Check logs for error messages
2. Verify configuration validity
3. Test individual components
4. Check memory usage
5. Verify network connectivity

---

**Remember**: This is a self-healing test automation system. Every decision should consider how it affects the overall healing capabilities and system reliability.
