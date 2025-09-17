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

#### TypeScript
- Use strict mode with all strict flags enabled
- Use path aliases for clean imports (`@/core/*`, `@/engines/*`)
- Implement proper error handling with custom error types
- Never use `any` type without explicit justification
- Use interfaces for object shapes and contracts

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
- Use Test-Driven Development (TDD) methodology for all mobile features
- Include Progressive Web App (PWA) features when applicable
- Ensure proper service worker implementation for offline functionality
- Test on multiple screen sizes and orientations

## Testing

### Unit Tests
- Write tests for all new functionality
- Use descriptive test names
- Follow the arrange-act-assert pattern
- Mock external dependencies

### Integration Tests
- Test API endpoints
- Test engine registration
- Test healing workflows
- Test configuration loading

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
