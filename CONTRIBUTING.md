# Contributing to Self-Healing Test Automation Harness

Thank you for your interest in contributing to the Self-Healing Test Automation Harness! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Docker (for containerized deployment)
- Git

### Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Start the application: `npm start`

## Commit Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated semantic versioning and changelog generation.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
The type should be one of the following:

- **feat**: A new feature (triggers minor version bump)
- **fix**: A bug fix (triggers patch version bump)
- **perf**: A performance improvement (triggers patch version bump)
- **refactor**: Code refactoring (triggers patch version bump)
- **docs**: Documentation changes (no version bump)
- **style**: Code style changes (no version bump)
- **test**: Adding or updating tests (no version bump)
- **build**: Build system changes (no version bump)
- **ci**: CI/CD changes (no version bump)
- **chore**: Maintenance tasks (no version bump)
- **revert**: Reverting changes (triggers patch version bump)

### Scope
The scope should be one of the following (optional):

- **core**: Core orchestration logic
- **engines**: Test engine implementations
- **healing**: Self-healing algorithms
- **config**: Configuration management
- **api**: REST API endpoints
- **observability**: Metrics and monitoring
- **types**: TypeScript type definitions
- **utils**: Shared utilities
- **docker**: Docker configuration
- **docs**: Documentation
- **tests**: Test files

### Subject
- Written in lowercase
- No period at the end
- Maximum 50 characters
- Imperative mood ("add feature" not "added feature")

### Body
- Written in lowercase
- Explain what and why, not how
- Wrap at 72 characters
- Leave blank line between body and footer

### Footer
- Reference issues: "Fixes #123" or "Closes #456"
- Breaking changes: "BREAKING CHANGE: description"
- Co-authored-by: for multiple authors

### Examples

#### New Feature
```
feat(engines): add playwright e2e test engine

Implements the Playwright test engine as the first concrete test engine.
Includes basic test execution, result collection, and integration with
the plugin architecture. Focuses on E2E testing capabilities.

Closes #123
```

#### Bug Fix
```
fix(healing): resolve locator recovery timeout issue

Fixes timeout issue in locator recovery strategies where healing
actions would hang indefinitely. Adds proper timeout handling
and fallback mechanisms.

Fixes #456
```

#### Documentation
```
docs(api): update REST API documentation

Updates API documentation to reflect new endpoints for test
execution and healing statistics. Includes examples and
response formats.
```

## Git Configuration

The project includes a `.gitmessage` template that provides commit message guidelines. To use it:

```bash
git config commit.template .gitmessage
git config core.editor vim
```

When you run `git commit` without a message, vim will open with the template showing the guidelines.

## Development Workflow

### Branching Strategy
- **main**: Production-ready code
- **beta**: Pre-release features
- **feature/***: New features
- **fix/***: Bug fixes
- **docs/***: Documentation updates

### Pull Request Process
1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Write tests for new functionality
4. Update documentation as needed
5. Ensure all tests pass: `npm test`
6. Ensure build succeeds: `npm run build`
7. Create a pull request with a descriptive title and description

### Code Standards

#### TypeScript Strict Mode Standards
- **ALWAYS** use strict mode with all strict flags enabled (`exactOptionalPropertyTypes: true`)
- **ALWAYS** use path aliases for clean imports (`@/core/*`, `@/engines/*`)
- **ALWAYS** implement proper error handling with custom error types
- **NEVER** use `any` type without explicit justification
- **ALWAYS** use interfaces for object shapes and contracts

##### TypeScript Strict Mode Compliance (PROVEN PATTERNS)
```typescript
// ✅ CORRECT: Error class inheritance with conditional assignment
export class AnalysisError extends Error {
  public override readonly cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'AnalysisError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

// ✅ CORRECT: Bracket notation for Record<string, any> properties
const url = config.parameters['url'] as string;
const analysisType = config.parameters['analysisType'] || 'basic';

// ✅ CORRECT: Conditional assignment for exactOptionalPropertyTypes
constructor(message: string, configField?: string, cause?: Error) {
  super(message, cause);
  if (configField !== undefined) {
    this.configField = configField;
  }
}
```

#### File Naming
- **Files**: kebab-case (`test-orchestrator.ts`, `healing-engine.ts`)
- **Classes**: PascalCase (`TestOrchestrator`, `HealingEngine`)
- **Functions/Variables**: camelCase (`executeTests`, `healingResult`)
- **Constants**: UPPER_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)

#### Architecture
- Follow the plugin architecture pattern
- Implement abstract interfaces before concrete classes
- Use dependency injection for testability
- Maintain separation of concerns
- Include comprehensive error handling and logging

#### Mobile Development
- Follow mobile-first responsive design principles
- Implement minimum 44px touch targets for mobile accessibility
- **ALWAYS** use Test-Driven Development (TDD) methodology for all features (RED-GREEN-REFACTOR cycle)
- Include Progressive Web App (PWA) features when applicable
- Ensure proper service worker implementation for offline functionality
- Test on multiple screen sizes and orientations

## Test-Driven Development (TDD) Requirements

**MANDATORY**: All contributions MUST follow strict Test-Driven Development methodology. This project has achieved 100% TDD success rate with zero regressions across multiple implementations.

### TDD Methodology (RED-GREEN-REFACTOR)

#### 1. RED Phase - Write Failing Tests First
```typescript
// PROVEN PATTERN: Test module existence before implementation
describe('RED PHASE: New Feature Requirements', () => {
  it('should fail because feature module does not exist yet', () => {
    expect(() => {
      require('../../src/new-feature');
    }).toThrow();
  });

  it('should fail because expected interface is not implemented', () => {
    // Test expected behavior without implementation
    try {
      const feature = require('../../src/new-feature');
      expect(feature.NewInterface).toBeDefined();
      fail('NewInterface should not exist yet');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
```

#### 2. GREEN Phase - Minimal Implementation
- Implement ONLY what's needed to make tests pass
- Avoid over-engineering or adding extra features
- Focus on making tests green, not perfect code

#### 3. REFACTOR Phase - Enhance While Maintaining Tests
- Improve code quality, add comprehensive documentation
- Add error handling and logging
- Maintain 100% test success rate throughout refactoring

### Global Declaration Conflict Prevention
```typescript
// ❌ WRONG: Generic names cause TypeScript compilation failures
const mockFetch = jest.fn();
const { ApiService } = require('./api-service.js');

// ✅ CORRECT: Context-specific names prevent conflicts
const featureMockFetch = jest.fn();
const { ApiService: FeatureApiService } = require('./api-service.js');

// ALWAYS check before creating new test files:
// grep -r "const mockFetch" tests/
// grep -r "const { ApiService }" tests/
```

### Testing Standards

#### Unit Tests
- **ALWAYS** write tests for all new functionality using TDD methodology
- Use descriptive test names that explain expected behavior
- Follow the arrange-act-assert pattern
- Mock external dependencies strategically (avoid over-mocking)
- Use context-specific variable names to prevent TypeScript conflicts

#### Integration Tests
- Test API endpoints with comprehensive error scenarios
- Test engine registration and factory patterns
- Test healing workflows and strategy implementations
- Test configuration loading and validation
- Test TypeScript strict mode compliance

### TDD Success Metrics
Our proven TDD methodology has achieved:
- **Analysis Configuration and Types**: 14/14 tests (100% success, 917 total tests)
- **AppAnalysisEngine Plugin Integration**: 53/53 tests (100% success, 903 total tests) 
- **App Analysis API Endpoints**: 32/32 tests (100% success, 863 total tests)
- **Healing Statistics Dashboard**: 17/17 tests (100% success, 668 total tests)
- **Zero regressions** across all implementations

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Release Process

This project uses automated semantic versioning with [semantic-release](https://github.com/semantic-release/semantic-release).

### How It Works
1. Commits follow conventional commit format
2. GitHub Actions automatically runs on push to `main` or `beta`
3. semantic-release analyzes commits and determines version bump
4. New version is published to npm (if applicable)
5. GitHub release is created with changelog
6. Version is updated in `package.json`

### Version Bumps
- **Major**: Breaking changes (BREAKING CHANGE in commit)
- **Minor**: New features (`feat:` commits)
- **Patch**: Bug fixes (`fix:`, `perf:`, `refactor:` commits)

### Manual Release
```bash
# Dry run to see what would be released
npm run release:dry-run

# Create a release (only if needed)
npm run release
```

## Project Structure

```
src/
├── core/           # Core orchestration logic
├── engines/        # Test engine implementations
├── healing/        # Self-healing algorithms
├── config/         # Configuration management
├── api/            # REST API endpoints
├── observability/  # Metrics and monitoring
├── types/          # TypeScript type definitions
└── utils/          # Shared utilities
```

## Getting Help

- Check the [README.md](README.md) for setup instructions
- Review the [agents.md](agents.md) for AI agent guidelines
- Review the [shrimp-rules.md](shrimp-rules.md) for development standards
- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributions from developers of all skill levels and backgrounds.

---

Thank you for contributing to the Self-Healing Test Automation Harness! 🚀
