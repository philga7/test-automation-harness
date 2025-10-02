# Prompt Template System for AI Operations

The Prompt Template System provides structured, production-ready prompt engineering for all AITestGenerator operations, ensuring consistent, high-quality AI outputs across multiple providers (OpenAI, Claude, Ollama).

## 📚 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
  - [PromptTemplateManager](#prompttemplatemanager)
  - [PromptSchemaValidator](#promptschemavalidator)
- [Supported Operations](#supported-operations)
- [Usage Examples](#usage-examples)
- [Template Structure](#template-structure)
- [Schema Validation](#schema-validation)
- [TypeScript Patterns](#typescript-patterns)
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)

## Overview

The Prompt Template System was implemented using strict Test-Driven Development (TDD) methodology, achieving 33/33 tests (100% success rate) with zero regressions.

**Key Features:**
- ✅ 9 operation-specific templates with optimal AI parameters
- ✅ Ajv-based JSON Schema validation for inputs and outputs
- ✅ Automatic retry capability on validation failures
- ✅ Simple parameter-based context (MVP approach)
- ✅ Template versioning for future compatibility
- ✅ TypeScript strict mode compliant
- ✅ Production-ready error handling

## Architecture

```
src/ai/prompts/
├── PromptTemplateManager.ts   # Core template management (742 lines)
└── PromptSchemaValidator.ts   # Ajv-based validation (267 lines)

tests/unit/
├── prompt-template-manager.test.ts   # 22 comprehensive tests
└── prompt-schema-validator.test.ts   # 11 comprehensive tests
```

## Components

### PromptTemplateManager

Manages structured prompt templates for all AITestGenerator operations.

**Key Interfaces:**

```typescript
interface PromptTemplate {
  id: string;                       // Unique identifier (matches operation)
  operation: string;                // AI operation name
  systemMessage: string;            // Role definition, output schema, best practices
  userMessageTemplate: string;      // Template with {placeholder} support
  outputFormat: string;             // TypeScript interface schema
  examples: Array<{input, output}>; // Few-shot learning examples
  temperature: number;              // AI creativity (0.0-1.0)
  maxTokens: number;                // Response length limit
  version: string;                  // Template version
  tags: string[];                   // Categorization tags
  inputSchema?: any;                // Optional JSON Schema for input
  outputSchema?: any;               // Optional JSON Schema for output
}

interface BuiltPrompt {
  systemMessage: string;            // Constructed system message
  userMessage: string;              // User message with placeholders replaced
  config: {
    temperature: number;
    maxTokens: number;
  };
  operation: string;
  metadata: {
    templateId: string;
    version: string;
    buildTimestamp: number;
  };
}
```

**Usage:**

```typescript
import { PromptTemplateManager } from '@/ai/prompts/PromptTemplateManager';

const templateManager = new PromptTemplateManager();

// Build a prompt
const builtPrompt = templateManager.buildPrompt('generate_scenarios', {
  userStory: 'As a user, I want to login',
  domain: 'authentication',
  applicationType: 'web-app'
});

// Use with AI provider
const aiResponse = await aiProvider.complete({
  system: builtPrompt.systemMessage,
  user: builtPrompt.userMessage,
  temperature: builtPrompt.config.temperature,
  maxTokens: builtPrompt.config.maxTokens
});

// List available operations
const operations = templateManager.listOperations();
// ['generate_scenarios', 'parse_user_story', 'extract_scenarios', ...]

// Get template statistics
const stats = templateManager.getStatistics();
// { totalTemplates: 9, averageTemperature: 0.544, ... }
```

### PromptSchemaValidator

Validates AI prompt inputs and outputs against JSON schemas using Ajv.

**Key Interfaces:**

```typescript
interface ValidationErrorDetail {
  path: string;           // JSON path to error location
  message: string;        // Human-readable error message
  context?: any;          // Additional context (keyword, params, schemaPath)
}

class PromptValidationError extends Error {
  name: string;                          // 'PromptValidationError'
  operation: string;                     // Operation that failed
  validationType: 'input' | 'output';    // Type of validation
  errors: ValidationErrorDetail[];       // Detailed error array
  
  getDetailedMessage(): string;          // Formatted error message
}
```

**Usage:**

```typescript
import { PromptSchemaValidator, PromptValidationError } from '@/ai/prompts/PromptSchemaValidator';

const validator = new PromptSchemaValidator();

// Validate input parameters
try {
  validator.validateInput('generate_scenarios', params, inputSchema);
} catch (error) {
  if (error instanceof PromptValidationError) {
    console.error('Input validation failed:', error.getDetailedMessage());
    // Implement retry logic or request correction
  }
}

// Validate AI response
try {
  validator.validateOutput('generate_scenarios', aiResponse, outputSchema);
} catch (error) {
  if (error instanceof PromptValidationError) {
    // Retry with refined prompt
    console.error('Output validation failed:', error.errors);
  }
}
```

## Supported Operations

| Operation | Temperature | MaxTokens | Purpose |
|-----------|-------------|-----------|---------|
| `generate_scenarios` | 0.7 | 3000 | Generate test scenarios from user stories (needs creativity + detail) |
| `parse_user_story` | 0.3 | 1500 | Extract requirements from user stories (deterministic parsing) |
| `extract_scenarios` | 0.5 | 2000 | Extract test scenarios from specifications (balanced extraction) |
| `identify_edge_cases` | 0.6 | 1500 | Identify edge cases and boundary conditions (creative edge cases) |
| `enhance_scenarios` | 0.5 | 2000 | Enhance existing test scenarios (balanced improvement) |
| `generate_test_data` | 0.8 | 2000 | Generate test data variations (high variety) |
| `analyze_coverage` | 0.5 | 2500 | Analyze test coverage gaps (analytical) |
| `optimize_execution` | 0.4 | 1500 | Optimize test execution order (logical ordering) |
| `suggest_maintenance` | 0.6 | 2000 | Suggest test maintenance improvements (practical suggestions) |

## Usage Examples

### Example 1: Generate Test Scenarios

```typescript
const templateManager = new PromptTemplateManager();
const validator = new PromptSchemaValidator();

// Build prompt
const builtPrompt = templateManager.buildPrompt('generate_scenarios', {
  userStory: 'As a user, I want to reset my password so I can regain access',
  domain: 'authentication',
  applicationType: 'web-app'
});

// Call AI provider
const aiResponse = await openAIProvider.complete({
  system: builtPrompt.systemMessage,
  user: builtPrompt.userMessage,
  temperature: 0.7,
  maxTokens: 3000
});

// Validate response
try {
  validator.validateOutput('generate_scenarios', aiResponse, outputSchema);
  // Use validated response
} catch (error) {
  // Retry with refined prompt
}
```

### Example 2: Parse User Story

```typescript
const builtPrompt = templateManager.buildPrompt('parse_user_story', {
  specification: 'User registration form with email validation',
  domain: 'user-management',
  applicationType: 'web-app'
});

// Temperature = 0.3 for deterministic parsing
// MaxTokens = 1500 for concise requirements
```

### Example 3: Generate Test Data

```typescript
const builtPrompt = templateManager.buildPrompt('generate_test_data', {
  specification: 'User profile form with username, email, password fields',
  domain: 'user-management',
  applicationType: 'e-commerce'
});

// Temperature = 0.8 for high variety
// MaxTokens = 2000 for comprehensive data sets
```

## Template Structure

Each template includes:

### 1. System Message

```
You are an expert QA Automation Engineer specializing in {applicationType} testing.

ROLE & EXPERTISE:
- Deep understanding of software testing methodologies
- Expert in test case design patterns
- Skilled at identifying comprehensive test coverage

YOUR TASK:
Generate comprehensive test scenarios that cover:
✅ Happy path scenarios
✅ Alternative flows
✅ Error scenarios
✅ Accessibility considerations

OUTPUT SCHEMA (TypeScript):
interface GenerateScenariosOutput {
  scenarios: TestScenario[];
  optimizations: any[];
  confidence: number;
  reasoning: string;
}

BEST PRACTICES:
- Use specific, testable action verbs
- Include clear assertions
- Provide realistic selectors
```

### 2. User Message Template

```
Generate test scenarios for the following user story:

User Story: {userStory}

Domain: {domain}
Application Type: {applicationType}

Please provide comprehensive test scenarios following the output schema.
```

### 3. Optimal Parameters

- **Temperature**: 0.3 (deterministic) → 0.8 (creative)
- **MaxTokens**: 1500 (concise) → 3000 (detailed)

## Schema Validation

### Ajv Configuration

The PromptSchemaValidator uses **strict mode** for production-grade validation:

```typescript
const ajv = new Ajv({
  allErrors: true,        // Collect all errors
  verbose: true,          // Detailed error info
  strict: true,           // Strict validation
  strictSchema: true,     // Strict schema checking
  strictNumbers: true,    // Strict number validation
  strictTypes: true,      // Strict type checking
  strictTuples: true,     // Strict tuple validation
  strictRequired: true    // Strict required properties
});
```

### Error Handling

```typescript
try {
  validator.validateInput('operation', params, schema);
} catch (error) {
  if (error instanceof PromptValidationError) {
    // Access detailed errors
    error.errors.forEach(err => {
      console.log(`Path: ${err.path}`);
      console.log(`Message: ${err.message}`);
      console.log(`Context:`, err.context);
    });
    
    // Get formatted message
    console.log(error.getDetailedMessage());
  }
}
```

## TypeScript Patterns

### Regex Match Type Guards

```typescript
// When using regex.exec(), match groups can be undefined
private extractPlaceholders(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    // Type guard: match[1] exists because regex has capturing group
    if (match[1]) {
      placeholders.push(match[1]);
    }
  }
  
  return placeholders;
}
```

### Error Class Inheritance

```typescript
export class PromptValidationError extends Error {
  public override readonly name: string;  // override modifier required
  public readonly operation: string;
  public readonly errors: ValidationErrorDetail[];

  constructor(operation: string, validationType: 'input' | 'output', errors: ValidationErrorDetail[]) {
    super(`Validation failed for ${operation}`);
    this.name = 'PromptValidationError';
    this.operation = operation;
    this.errors = errors;
    
    // CRITICAL: Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, PromptValidationError.prototype);
  }
}
```

### Conditional Assignment

```typescript
// For exactOptionalPropertyTypes compliance
constructor(message: string, field?: string, cause?: Error) {
  super(message);
  this.name = 'CustomError';
  
  // Only assign if defined
  if (field !== undefined) {
    this.field = field;
  }
  if (cause !== undefined) {
    this.cause = cause;
  }
}
```

## Testing

### Test Coverage

**PromptTemplateManager: 22/22 tests (100%)**
- Template initialization and registration
- Prompt building with placeholder replacement
- Parameter validation
- Template retrieval and listing
- Statistics and utility methods
- TypeScript strict mode compliance

**PromptSchemaValidator: 11/11 tests (100%)**
- Input parameter validation
- Output response validation
- Error handling with PromptValidationError
- Detailed error reporting
- TypeScript strict mode compliance

### TDD Methodology

This system was built using strict RED-GREEN-REFACTOR cycles:

1. **RED PHASE**: Wrote 33 failing tests defining expected behavior
2. **GREEN PHASE**: Implemented minimal code to pass all tests
3. **REFACTOR PHASE**: Improved code quality while maintaining 100% test success

**Result**: Zero regressions across 1032 total project tests

## Future Enhancements

### Phase 3: ApplicationUnderTest (AUT) Context Integration
- Rich context injection from application analysis
- UI panel for application metadata
- Enhanced domain-specific insights

### Phase 4: Custom Domain Templates
- User-defined template customization
- Domain-specific language (DSL) support
- Template marketplace

### Phase 5: Quality Metrics & Optimization
- Template update mechanism based on AI output quality
- Automatic prompt refinement from validation failures
- Performance analytics and optimization

## Integration with AI Providers

The Prompt Template System integrates seamlessly with:

- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic Claude** (Claude-3 Sonnet, Haiku, Opus)
- **Local Models** (Ollama)

Each provider uses the same template structure, ensuring consistency across different AI backends.

## Related Documentation

- [AI Provider Abstraction](./AI_PROVIDER_ABSTRACTION.md)
- [AITestGenerator](./AI_TEST_GENERATOR.md)
- [API Documentation](./API_COMPLETE.md)
- [TypeScript Patterns](../shrimp-rules.md#typescript-strict-mode-compliance-proven-solutions)

## License

Part of the Self-Healing Test Automation Harness project.

