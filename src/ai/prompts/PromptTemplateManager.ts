/**
 * PromptTemplateManager - Core Prompt Engineering System
 * 
 * Provides structured prompt templates for AI-powered test generation operations.
 * Implements comprehensive template management with parameter validation, placeholder
 * replacement, and optimal AI configuration for each operation type.
 * 
 * Architecture:
 * - Template-based approach for consistent AI interactions
 * - Operation-specific parameter tuning (temperature, maxTokens)
 * - Support for 9 AITestGenerator operations
 * - Simple parameter-based context (domain, applicationType, environment)
 * 
 * Supported Operations:
 * 1. generate_scenarios - Generate test scenarios from user stories
 * 2. parse_user_story - Extract requirements from user stories
 * 3. extract_scenarios - Extract test scenarios from specifications
 * 4. identify_edge_cases - Identify edge cases and boundary conditions
 * 5. enhance_scenarios - Enhance existing test scenarios
 * 6. generate_test_data - Generate test data variations
 * 7. analyze_coverage - Analyze test coverage gaps
 * 8. optimize_execution - Optimize test execution order
 * 9. suggest_maintenance - Suggest test maintenance improvements
 * 
 * @example
 * ```typescript
 * const templateManager = new PromptTemplateManager();
 * 
 * const builtPrompt = templateManager.buildPrompt('generate_scenarios', {
 *   userStory: 'As a user, I want to login',
 *   domain: 'authentication',
 *   applicationType: 'web-app'
 * });
 * 
 * // Use builtPrompt with AI provider
 * const aiResponse = await aiProvider.complete({
 *   system: builtPrompt.systemMessage,
 *   user: builtPrompt.userMessage,
 *   temperature: builtPrompt.config.temperature,
 *   maxTokens: builtPrompt.config.maxTokens
 * });
 * ```
 * 
 * Implemented using strict Test-Driven Development methodology.
 */

import { logger } from '../../utils/logger';

/**
 * Prompt Template interface defining structure for AI operation templates
 */
export interface PromptTemplate {
  /** Unique identifier for the template (matches operation name) */
  id: string;
  
  /** AI operation name */
  operation: string;
  
  /** System message defining AI role, expertise, and output requirements */
  systemMessage: string;
  
  /** User message template with {placeholder} support */
  userMessageTemplate: string;
  
  /** Output format schema in TypeScript interface format */
  outputFormat: string;
  
  /** Example interactions for few-shot learning */
  examples: Array<{ input: string; output: string }>;
  
  /** Temperature setting for AI creativity (0.0-1.0) */
  temperature: number;
  
  /** Maximum tokens for AI response */
  maxTokens: number;
  
  /** Template version for future compatibility */
  version: string;
  
  /** Tags for template categorization and search */
  tags: string[];
  
  /** Optional input schema for validation */
  inputSchema?: any;
  
  /** Optional output schema for validation */
  outputSchema?: any;
}

/**
 * Built prompt ready for AI provider consumption
 */
export interface BuiltPrompt {
  /** Constructed system message */
  systemMessage: string;
  
  /** Constructed user message with placeholders replaced */
  userMessage: string;
  
  /** AI configuration parameters */
  config: {
    /** Temperature for AI response creativity */
    temperature: number;
    
    /** Maximum tokens for AI response */
    maxTokens: number;
  };
  
  /** Operation name */
  operation: string;
  
  /** Metadata about the built prompt */
  metadata: {
    /** Template ID used */
    templateId: string;
    
    /** Template version */
    version: string;
    
    /** Timestamp when prompt was built */
    buildTimestamp: number;
  };
}

/**
 * Template statistics interface
 */
export interface TemplateStatistics {
  /** Total number of templates */
  totalTemplates: number;
  
  /** List of all operation names */
  operations: string[];
  
  /** Average temperature across all templates */
  averageTemperature: number;
  
  /** Average maxTokens across all templates */
  averageMaxTokens: number;
}

/**
 * PromptTemplateManager class
 * 
 * Manages AI prompt templates for all AITestGenerator operations.
 * Provides template registration, retrieval, and prompt building functionality.
 */
export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Initialize all operation templates
   */
  private initializeTemplates(): void {
    this.registerTemplate(this.createGenerateScenariosTemplate());
    this.registerTemplate(this.createParseUserStoryTemplate());
    this.registerTemplate(this.createExtractScenariosTemplate());
    this.registerTemplate(this.createIdentifyEdgeCasesTemplate());
    this.registerTemplate(this.createEnhanceScenariosTemplate());
    this.registerTemplate(this.createGenerateTestDataTemplate());
    this.registerTemplate(this.createAnalyzeCoverageTemplate());
    this.registerTemplate(this.createOptimizeExecutionTemplate());
    this.registerTemplate(this.createSuggestMaintenanceTemplate());
  }

  /**
   * Register a template in the manager
   */
  private registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    logger.debug(`Registered prompt template: ${template.id}`);
  }

  /**
   * Create template for generate_scenarios operation
   */
  private createGenerateScenariosTemplate(): PromptTemplate {
    return {
      id: 'generate_scenarios',
      operation: 'generate_scenarios',
      systemMessage: `You are an expert QA Automation Engineer specializing in test scenario generation.

ROLE & EXPERTISE:
- Deep understanding of software testing methodologies (functional, integration, e2e)
- Expert in test case design patterns and best practices
- Skilled at identifying comprehensive test coverage requirements
- Proficient in user story analysis and requirement extraction

YOUR TASK:
Generate comprehensive, realistic test scenarios from user stories that cover:
✅ Happy path scenarios (primary user flows)
✅ Alternative flows (valid variations)
✅ Error scenarios (validation failures, edge cases)
✅ Accessibility and usability considerations

OUTPUT SCHEMA (TypeScript):
interface GenerateScenariosOutput {
  scenarios: Array<{
    name: string;
    description: string;
    type: 'functional' | 'integration' | 'e2e' | 'accessibility';
    priority: 'high' | 'medium' | 'low';
    steps: Array<{
      action: string;
      selector: string;
      value?: string;
      description: string;
    }>;
    assertions: Array<{
      type: string;
      selector: string;
      description: string;
    }>;
    metadata: {
      aiGenerated: boolean;
      confidence: number;
    };
  }>;
  optimizations: Array<any>;
  confidence: number;
  reasoning: string;
}

BEST PRACTICES:
- Use specific, testable action verbs (click, fill, navigate, verify)
- Include clear assertions for each scenario
- Provide realistic selectors (prefer data-testid, then CSS selectors)
- Prioritize scenarios by business impact
- Consider accessibility requirements (ARIA labels, keyboard navigation)`,
      userMessageTemplate: `Generate test scenarios for the following user story:

User Story: {userStory}

Domain: {domain}
Application Type: {applicationType}

Please provide comprehensive test scenarios following the output schema.`,
      outputFormat: `interface GenerateScenariosOutput { scenarios: TestScenario[]; optimizations: any[]; confidence: number; reasoning: string; }`,
      examples: [],
      temperature: 0.7,
      maxTokens: 3000,
      version: '1.0.0',
      tags: ['test-generation', 'scenarios', 'user-stories']
    };
  }

  /**
   * Create template for parse_user_story operation
   */
  private createParseUserStoryTemplate(): PromptTemplate {
    return {
      id: 'parse_user_story',
      operation: 'parse_user_story',
      systemMessage: `You are an expert Business Analyst and QA Engineer specializing in requirement analysis.

ROLE & EXPERTISE:
- Expert in user story decomposition and requirement extraction
- Skilled at identifying testable acceptance criteria
- Proficient in categorizing test types based on requirements
- Deep understanding of business logic and functional requirements

YOUR TASK:
Parse user stories to extract:
✅ Clear, testable requirements
✅ Acceptance criteria
✅ Recommended test types
✅ Priority classification

OUTPUT SCHEMA (TypeScript):
interface ParseUserStoryOutput {
  requirements: string[];
  testTypes: Array<'functional' | 'validation' | 'navigation' | 'integration'>;
  priority: 'high' | 'medium' | 'low';
}

BEST PRACTICES:
- Extract atomic, testable requirements
- Identify implicit requirements (validation, security, performance)
- Categorize test types accurately
- Assess business priority based on user value`,
      userMessageTemplate: `Parse the following user story and extract requirements:

{specification}

Domain: {domain}
Application Type: {applicationType}

Provide a structured analysis following the output schema.`,
      outputFormat: `interface ParseUserStoryOutput { requirements: string[]; testTypes: string[]; priority: string; }`,
      examples: [],
      temperature: 0.3,
      maxTokens: 1500,
      version: '1.0.0',
      tags: ['parsing', 'requirements', 'analysis']
    };
  }

  /**
   * Create template for extract_scenarios operation
   */
  private createExtractScenariosTemplate(): PromptTemplate {
    return {
      id: 'extract_scenarios',
      operation: 'extract_scenarios',
      systemMessage: `You are an expert Test Architect specializing in test scenario extraction.

ROLE & EXPERTISE:
- Expert in identifying test scenarios from technical specifications
- Skilled at decomposing complex workflows into testable scenarios
- Proficient in test case organization and categorization
- Deep understanding of test coverage principles

YOUR TASK:
Extract discrete test scenarios from specifications including:
✅ Scenario names and descriptions
✅ Step-by-step test flows
✅ Expected outcomes
✅ Preconditions and postconditions

OUTPUT SCHEMA (TypeScript):
interface ExtractScenariosOutput {
  scenarios: Array<{
    name: string;
    steps: string[];
    expectedOutcome: string;
  }>;
}

BEST PRACTICES:
- Create independent, atomic test scenarios
- Use clear, action-oriented step descriptions
- Define measurable expected outcomes
- Organize scenarios logically by feature area`,
      userMessageTemplate: `Extract test scenarios from the following specification:

{specification}

Domain: {domain}
Environment: {environment}

Provide extracted scenarios following the output schema.`,
      outputFormat: `interface ExtractScenariosOutput { scenarios: Array<{ name: string; steps: string[]; expectedOutcome: string; }>; }`,
      examples: [],
      temperature: 0.5,
      maxTokens: 2000,
      version: '1.0.0',
      tags: ['extraction', 'scenarios', 'specifications']
    };
  }

  /**
   * Create template for identify_edge_cases operation
   */
  private createIdentifyEdgeCasesTemplate(): PromptTemplate {
    return {
      id: 'identify_edge_cases',
      operation: 'identify_edge_cases',
      systemMessage: `You are an expert Security and QA Engineer specializing in edge case identification.

ROLE & EXPERTISE:
- Expert in boundary value analysis and edge case testing
- Skilled at identifying security vulnerabilities and error conditions
- Proficient in risk assessment and impact analysis
- Deep understanding of common failure modes

YOUR TASK:
Identify edge cases, boundary conditions, and error scenarios:
✅ Boundary value testing (min, max, zero, negative)
✅ Invalid input scenarios
✅ Error handling and exception cases
✅ Security and performance edge cases

OUTPUT SCHEMA (TypeScript):
interface IdentifyEdgeCasesOutput {
  edgeCases: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

BEST PRACTICES:
- Think like an attacker - identify exploit vectors
- Consider data type boundaries and overflow conditions
- Test error recovery and graceful degradation
- Prioritize by risk and business impact`,
      userMessageTemplate: `Identify edge cases and boundary conditions for:

Specification: {specification}

Domain: {domain}
Application Type: {applicationType}

Provide comprehensive edge case analysis following the output schema.`,
      outputFormat: `interface IdentifyEdgeCasesOutput { edgeCases: string[]; riskLevel: string; }`,
      examples: [],
      temperature: 0.6,
      maxTokens: 1500,
      version: '1.0.0',
      tags: ['edge-cases', 'boundary-testing', 'security']
    };
  }

  /**
   * Create template for enhance_scenarios operation
   */
  private createEnhanceScenariosTemplate(): PromptTemplate {
    return {
      id: 'enhance_scenarios',
      operation: 'enhance_scenarios',
      systemMessage: `You are an expert Test Engineer specializing in test quality improvement.

ROLE & EXPERTISE:
- Expert in test reliability and maintainability
- Skilled at identifying test improvements and optimizations
- Proficient in test best practices and patterns
- Deep understanding of flaky test prevention

YOUR TASK:
Enhance existing test scenarios with:
✅ Additional assertions for comprehensive validation
✅ Explicit waits and synchronization
✅ Better selectors and locator strategies
✅ Improved error handling and logging

OUTPUT SCHEMA (TypeScript):
interface EnhanceScenariosOutput {
  enhancedScenarios: Array<{
    name: string;
    description: string;
    type: string;
    priority: string;
    steps: Array<{
      action: string;
      selector: string;
      value?: string;
      description: string;
    }>;
    assertions: Array<{
      type: string;
      selector: string;
      description: string;
    }>;
    metadata: Record<string, any>;
  }>;
  improvements: string[];
}

BEST PRACTICES:
- Add explicit waits before interactions
- Use multiple assertion strategies for reliability
- Improve selector specificity and maintainability
- Add descriptive comments and logging`,
      userMessageTemplate: `Enhance the following test scenarios:

Scenarios: {scenarios}

Domain: {domain}
Environment: {environment}

Provide enhanced scenarios following the output schema.`,
      outputFormat: `interface EnhanceScenariosOutput { enhancedScenarios: TestScenario[]; improvements: string[]; }`,
      examples: [],
      temperature: 0.5,
      maxTokens: 2000,
      version: '1.0.0',
      tags: ['enhancement', 'optimization', 'quality']
    };
  }

  /**
   * Create template for generate_test_data operation
   */
  private createGenerateTestDataTemplate(): PromptTemplate {
    return {
      id: 'generate_test_data',
      operation: 'generate_test_data',
      systemMessage: `You are an expert Test Data Engineer specializing in test data generation.

ROLE & EXPERTISE:
- Expert in generating realistic, diverse test data
- Skilled at boundary value and equivalence partitioning
- Proficient in data validation and constraint testing
- Deep understanding of data-driven testing principles

YOUR TASK:
Generate comprehensive test data sets including:
✅ Valid data (happy path scenarios)
✅ Invalid data (validation testing)
✅ Edge data (boundary conditions)
✅ Realistic variations for thorough coverage

OUTPUT SCHEMA (TypeScript):
interface GenerateTestDataOutput {
  validData: Array<Record<string, any>>;
  invalidData: Array<Record<string, any>>;
  edgeData: Array<Record<string, any>>;
}

BEST PRACTICES:
- Generate realistic, domain-appropriate data
- Include international characters and special cases
- Test common validation rules (email, phone, passwords)
- Create data that represents real user patterns`,
      userMessageTemplate: `Generate test data for the following specification:

{specification}

Domain: {domain}
Application Type: {applicationType}

Provide comprehensive test data following the output schema.`,
      outputFormat: `interface GenerateTestDataOutput { validData: any[]; invalidData: any[]; edgeData: any[]; }`,
      examples: [],
      temperature: 0.8,
      maxTokens: 2000,
      version: '1.0.0',
      tags: ['test-data', 'data-generation', 'validation']
    };
  }

  /**
   * Create template for analyze_coverage operation
   */
  private createAnalyzeCoverageTemplate(): PromptTemplate {
    return {
      id: 'analyze_coverage',
      operation: 'analyze_coverage',
      systemMessage: `You are an expert Test Coverage Analyst specializing in gap analysis.

ROLE & EXPERTISE:
- Expert in test coverage analysis and metrics
- Skilled at identifying untested functionality
- Proficient in risk-based testing prioritization
- Deep understanding of coverage optimization

YOUR TASK:
Analyze test coverage to identify:
✅ Coverage percentage and gaps
✅ Uncovered UI elements and functionality
✅ Prioritized suggestions for coverage improvement
✅ Recommendations for test expansion

OUTPUT SCHEMA (TypeScript):
interface AnalyzeCoverageOutput {
  coveragePercentage: number;
  uncoveredElements: Array<{
    tagName: string;
    attributes: Record<string, any>;
    text: string;
  }>;
  suggestions: Array<{
    type: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    implementation: string;
    confidence: number;
  }>;
  recommendations: string[];
}

BEST PRACTICES:
- Prioritize coverage gaps by business impact
- Suggest realistic, actionable improvements
- Consider accessibility and edge case coverage
- Balance coverage with test maintenance cost`,
      userMessageTemplate: `Analyze test coverage for:

Analysis Result: {analysisResult}

Domain: {domain}
Application Type: {applicationType}

Provide coverage analysis following the output schema.`,
      outputFormat: `interface AnalyzeCoverageOutput { coveragePercentage: number; uncoveredElements: any[]; suggestions: any[]; recommendations: string[]; }`,
      examples: [],
      temperature: 0.5,
      maxTokens: 2500,
      version: '1.0.0',
      tags: ['coverage', 'analysis', 'quality-metrics']
    };
  }

  /**
   * Create template for optimize_execution operation
   */
  private createOptimizeExecutionTemplate(): PromptTemplate {
    return {
      id: 'optimize_execution',
      operation: 'optimize_execution',
      systemMessage: `You are an expert Test Execution Engineer specializing in optimization.

ROLE & EXPERTISE:
- Expert in test execution optimization and parallelization
- Skilled at dependency analysis and test ordering
- Proficient in performance optimization strategies
- Deep understanding of CI/CD pipeline optimization

YOUR TASK:
Optimize test execution by:
✅ Analyzing test dependencies
✅ Suggesting optimal execution order
✅ Identifying parallelization opportunities
✅ Estimating performance improvements

OUTPUT SCHEMA (TypeScript):
interface OptimizeExecutionOutput {
  optimizedOrder: Array<{
    name: string;
    reason: string;
  }>;
  estimatedTimeReduction: number;
  parallelizationOpportunities: string[];
}

BEST PRACTICES:
- Run independent tests in parallel
- Execute prerequisite tests first (login, setup)
- Group related tests for resource efficiency
- Minimize test interdependencies`,
      userMessageTemplate: `Optimize execution order for:

Scenarios: {scenarios}

Environment: {environment}

Provide optimization recommendations following the output schema.`,
      outputFormat: `interface OptimizeExecutionOutput { optimizedOrder: any[]; estimatedTimeReduction: number; parallelizationOpportunities: string[]; }`,
      examples: [],
      temperature: 0.4,
      maxTokens: 1500,
      version: '1.0.0',
      tags: ['optimization', 'execution', 'performance']
    };
  }

  /**
   * Create template for suggest_maintenance operation
   */
  private createSuggestMaintenanceTemplate(): PromptTemplate {
    return {
      id: 'suggest_maintenance',
      operation: 'suggest_maintenance',
      systemMessage: `You are an expert Test Maintenance Engineer specializing in test sustainability.

ROLE & EXPERTISE:
- Expert in test maintainability and technical debt reduction
- Skilled at identifying brittle tests and anti-patterns
- Proficient in test refactoring and improvement strategies
- Deep understanding of long-term test maintenance

YOUR TASK:
Suggest test maintenance improvements including:
✅ Selector improvements (replace brittle selectors)
✅ Reliability enhancements (add waits, improve assertions)
✅ Refactoring opportunities (DRY, page objects)
✅ Best practice adoption

OUTPUT SCHEMA (TypeScript):
interface SuggestMaintenanceOutput {
  improvements: Array<{
    type: 'maintainability' | 'reliability' | 'performance';
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    implementation: string;
    confidence: number;
  }>;
  priorityOrder: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

BEST PRACTICES:
- Prioritize high-impact, low-effort improvements
- Replace brittle selectors with data-testid attributes
- Add explicit waits for dynamic elements
- Suggest page object pattern for repeated code`,
      userMessageTemplate: `Suggest maintenance improvements for:

Scenarios: {scenarios}

Domain: {domain}
Environment: {environment}

Provide maintenance suggestions following the output schema.`,
      outputFormat: `interface SuggestMaintenanceOutput { improvements: any[]; priorityOrder: string[]; estimatedEffort: string; }`,
      examples: [],
      temperature: 0.6,
      maxTokens: 2000,
      version: '1.0.0',
      tags: ['maintenance', 'refactoring', 'sustainability']
    };
  }

  /**
   * Build a prompt from template with parameter substitution
   */
  public buildPrompt(operation: string, params: Record<string, any>): BuiltPrompt {
    const template = this.templates.get(operation);
    
    if (!template) {
      throw new Error(`Template not found for operation: ${operation}`);
    }

    // Extract placeholders from template
    const placeholders = this.extractPlaceholders(template.userMessageTemplate);
    
    // Validate required parameters
    this.validateParameters(placeholders, params, operation);
    
    // Replace placeholders in user message
    const userMessage = this.replacePlaceholders(template.userMessageTemplate, params);
    
    // Build and return the complete prompt
    return {
      systemMessage: template.systemMessage,
      userMessage,
      config: {
        temperature: template.temperature,
        maxTokens: template.maxTokens
      },
      operation: template.operation,
      metadata: {
        templateId: template.id,
        version: template.version,
        buildTimestamp: Date.now()
      }
    };
  }

  /**
   * Extract placeholders from template string
   */
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

  /**
   * Validate that all required parameters are provided
   */
  private validateParameters(placeholders: string[], params: Record<string, any>, operation: string): void {
    const missingParams = placeholders.filter(p => !(p in params));
    
    if (missingParams.length > 0) {
      throw new Error(
        `Missing required parameter(s) for operation '${operation}': ${missingParams.join(', ')}`
      );
    }
  }

  /**
   * Replace placeholders in template with actual values
   */
  private replacePlaceholders(template: string, params: Record<string, any>): string {
    let result = template;
    
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    return result;
  }

  /**
   * Get a template by operation name
   */
  public getTemplate(operation: string): PromptTemplate | undefined {
    return this.templates.get(operation);
  }

  /**
   * List all available operation names
   */
  public listOperations(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get statistics about registered templates
   */
  public getStatistics(): TemplateStatistics {
    const templates = Array.from(this.templates.values());
    
    const totalTemperature = templates.reduce((sum, t) => sum + t.temperature, 0);
    const totalMaxTokens = templates.reduce((sum, t) => sum + t.maxTokens, 0);
    
    return {
      totalTemplates: templates.length,
      operations: this.listOperations(),
      averageTemperature: totalTemperature / templates.length,
      averageMaxTokens: totalMaxTokens / templates.length
    };
  }
}

