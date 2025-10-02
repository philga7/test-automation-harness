/**
 * PromptSchemaValidator - JSON Schema Validation for AI Prompts
 * 
 * Provides comprehensive input and output validation for AI prompt templates using
 * JSON Schema validation. Ensures data integrity and enables automatic retry logic
 * when AI responses don't match expected schemas.
 * 
 * Features:
 * - Input parameter validation before prompt building
 * - Output response validation after AI completion
 * - Detailed error reporting with validation paths
 * - TypeScript strict mode compliance
 * - Integration with PromptTemplateManager
 * 
 * Validation Benefits:
 * - Prevents malformed requests to AI APIs
 * - Detects schema violations in AI responses
 * - Enables automatic prompt refinement and retry
 * - Provides clear debugging information
 * 
 * @example
 * ```typescript
 * const validator = new PromptSchemaValidator();
 * 
 * // Validate input parameters
 * try {
 *   validator.validateInput('generate_scenarios', params, inputSchema);
 * } catch (error) {
 *   if (error instanceof PromptValidationError) {
 *     console.error('Validation errors:', error.errors);
 *   }
 * }
 * 
 * // Validate AI response
 * try {
 *   validator.validateOutput('generate_scenarios', aiResponse, outputSchema);
 * } catch (error) {
 *   // Implement retry logic with refined prompt
 * }
 * ```
 * 
 * Implemented using strict Test-Driven Development methodology.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import { logger } from '../../utils/logger';

/**
 * Validation error details interface
 */
export interface ValidationErrorDetail {
  /** JSON path to the error location */
  path: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Optional additional context */
  context?: any;
}

/**
 * Custom error class for prompt validation failures
 * 
 * Extends Error with validation-specific information including:
 * - Operation name that failed validation
 * - Validation type (input vs output)
 * - Detailed array of validation errors with paths
 * 
 * TypeScript Strict Mode Compliance:
 * - Uses conditional assignment for optional properties
 * - Proper error class inheritance with override modifier
 */
export class PromptValidationError extends Error {
  public override readonly name: string;
  public readonly operation: string;
  public readonly validationType: 'input' | 'output';
  public readonly errors: ValidationErrorDetail[];

  constructor(
    operation: string,
    validationType: 'input' | 'output',
    errors: ValidationErrorDetail[]
  ) {
    const errorMessage = `Prompt validation failed for operation '${operation}' (${validationType}): ${errors.length} error(s) found`;
    super(errorMessage);
    
    this.name = 'PromptValidationError';
    this.operation = operation;
    this.validationType = validationType;
    this.errors = errors;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, PromptValidationError.prototype);
  }

  /**
   * Get a formatted error message with all validation errors
   */
  getDetailedMessage(): string {
    const errorList = this.errors
      .map(err => `  - ${err.path}: ${err.message}`)
      .join('\n');
    
    return `${this.message}\n\nValidation Errors:\n${errorList}`;
  }
}

/**
 * PromptSchemaValidator class
 * 
 * Validates AI prompt inputs and outputs against JSON schemas using Ajv.
 * Provides detailed error reporting and TypeScript strict mode compliance.
 */
export class PromptSchemaValidator {
  private ajv: Ajv;

  constructor() {
    // Initialize Ajv with strict mode and detailed error reporting
    this.ajv = new Ajv({
      allErrors: true,        // Collect all errors, not just the first
      verbose: true,          // Include detailed error information
      strict: true,           // Strict schema validation
      strictSchema: true,     // Strict schema checking
      strictNumbers: true,    // Strict number validation
      strictTypes: true,      // Strict type checking
      strictTuples: true,     // Strict tuple validation
      strictRequired: true    // Strict required property validation
    });

    logger.debug('PromptSchemaValidator initialized with Ajv strict mode');
  }

  /**
   * Validate input parameters against a JSON schema
   * 
   * @param operation - Operation name (for error reporting)
   * @param params - Input parameters to validate
   * @param schema - JSON Schema definition for validation
   * @throws {PromptValidationError} If validation fails
   */
  public validateInput(
    operation: string,
    params: Record<string, any>,
    schema: any
  ): void {
    this.validate(operation, 'input', params, schema);
  }

  /**
   * Validate output response against a JSON schema
   * 
   * @param operation - Operation name (for error reporting)
   * @param response - Output response to validate
   * @param schema - JSON Schema definition for validation
   * @throws {PromptValidationError} If validation fails
   */
  public validateOutput(
    operation: string,
    response: any,
    schema: any
  ): void {
    this.validate(operation, 'output', response, schema);
  }

  /**
   * Internal validation method using Ajv
   * 
   * @param operation - Operation name
   * @param validationType - Type of validation (input or output)
   * @param data - Data to validate
   * @param schema - JSON Schema definition
   * @throws {PromptValidationError} If validation fails
   */
  private validate(
    operation: string,
    validationType: 'input' | 'output',
    data: any,
    schema: any
  ): void {
    try {
      // Compile schema and validate data
      const validate: ValidateFunction = this.ajv.compile(schema);
      const valid = validate(data);

      if (!valid) {
        // Convert Ajv errors to our error format
        const errors = this.formatAjvErrors(validate.errors || []);
        
        logger.warn(`Prompt validation failed for ${operation} (${validationType})`, {
          operation,
          validationType,
          errorCount: errors.length,
          errors: errors.map(e => e.message)
        });

        throw new PromptValidationError(operation, validationType, errors);
      }

      logger.debug(`Prompt validation successful for ${operation} (${validationType})`);
    } catch (error: any) {
      // If it's already a PromptValidationError, rethrow it
      if (error instanceof PromptValidationError) {
        throw error;
      }

      // Handle Ajv compilation errors
      logger.error(`Schema compilation error for ${operation}`, {
        operation,
        validationType,
        error: error.message
      });

      throw new PromptValidationError(
        operation,
        validationType,
        [{
          path: '/schema',
          message: `Schema compilation failed: ${error.message}`,
          context: error
        }]
      );
    }
  }

  /**
   * Format Ajv errors into our ValidationErrorDetail format
   * 
   * @param ajvErrors - Array of Ajv error objects
   * @returns Formatted array of validation error details
   */
  private formatAjvErrors(ajvErrors: ErrorObject[]): ValidationErrorDetail[] {
    return ajvErrors.map(error => {
      // Build a clear error message
      let message = error.message || 'Validation failed';
      
      // Add parameter information if available
      if (error.params) {
        const paramInfo = Object.entries(error.params)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ');
        
        if (paramInfo) {
          message = `${message} (${paramInfo})`;
        }
      }

      return {
        path: error.instancePath || '/',
        message,
        context: {
          keyword: error.keyword,
          params: error.params,
          schemaPath: error.schemaPath
        }
      };
    });
  }

  /**
   * Get Ajv instance for advanced usage
   * 
   * @returns The Ajv instance used by this validator
   */
  public getAjvInstance(): Ajv {
    return this.ajv;
  }
}

