/**
 * PromptSchemaValidator Unit Tests
 * 
 * Test-Driven Development (TDD) implementation for Prompt Schema Validation.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * 
 * RED PHASE: These tests will fail initially because PromptSchemaValidator doesn't exist yet.
 * 
 * Test Coverage:
 * - Input parameter validation against JSON schemas
 * - Output response validation against JSON schemas
 * - Error handling and detailed error messages
 * - Integration with PromptTemplateManager
 */

import { PromptSchemaValidator, PromptValidationError } from '../../src/ai/prompts/PromptSchemaValidator';

// RED PHASE COMPLETED: Module now exists
// The RED phase test has been removed because we successfully implemented
// the PromptSchemaValidator module and moved to GREEN phase

describe('PromptSchemaValidator - Input Validation', () => {
  let validator: PromptSchemaValidator;

  beforeEach(() => {
    validator = new PromptSchemaValidator();
  });

  it('should validate correct input parameters', () => {
    const validInput = {
      userStory: 'As a user, I want to login',
      domain: 'authentication',
      applicationType: 'web-app'
    };

    const schema = {
      type: 'object',
      properties: {
        userStory: { type: 'string' },
        domain: { type: 'string' },
        applicationType: { type: 'string' }
      },
      required: ['userStory']
    };

    expect(() => {
      validator.validateInput('generate_scenarios', validInput, schema);
    }).not.toThrow();
  });

  it('should throw PromptValidationError for invalid input', () => {
    const invalidInput = {
      userStory: 123, // Should be string
      domain: 'test'
    };

    const schema = {
      type: 'object',
      properties: {
        userStory: { type: 'string' },
        domain: { type: 'string' }
      },
      required: ['userStory']
    };

    expect(() => {
      validator.validateInput('generate_scenarios', invalidInput, schema);
    }).toThrow(PromptValidationError);
  });

  it('should throw PromptValidationError for missing required parameters', () => {
    const invalidInput = {
      domain: 'test'
      // userStory is missing but required
    };

    const schema = {
      type: 'object',
      properties: {
        userStory: { type: 'string' },
        domain: { type: 'string' }
      },
      required: ['userStory']
    };

    expect(() => {
      validator.validateInput('generate_scenarios', invalidInput, schema);
    }).toThrow(PromptValidationError);
  });

  it('should provide detailed error information in PromptValidationError', () => {
    const invalidInput = {
      userStory: 123
    };

    const schema = {
      type: 'object',
      properties: {
        userStory: { type: 'string' }
      },
      required: ['userStory']
    };

    try {
      validator.validateInput('generate_scenarios', invalidInput, schema);
      fail('Expected PromptValidationError to be thrown');
    } catch (error: any) {
      expect(error).toBeInstanceOf(PromptValidationError);
      expect(error.operation).toBe('generate_scenarios');
      expect(error.validationType).toBe('input');
      expect(error.errors).toBeDefined();
      expect(Array.isArray(error.errors)).toBe(true);
      expect(error.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('PromptSchemaValidator - Output Validation', () => {
  let validator: PromptSchemaValidator;

  beforeEach(() => {
    validator = new PromptSchemaValidator();
  });

  it('should validate correct output response', () => {
    const validOutput = {
      scenarios: [
        {
          name: 'Test Scenario',
          description: 'Test description',
          type: 'functional',
          priority: 'high',
          steps: [],
          assertions: [],
          metadata: { aiGenerated: true, confidence: 0.9 }
        }
      ],
      optimizations: [],
      confidence: 0.85,
      reasoning: 'Test reasoning'
    };

    const schema = {
      type: 'object',
      properties: {
        scenarios: { type: 'array' },
        optimizations: { type: 'array' },
        confidence: { type: 'number' },
        reasoning: { type: 'string' }
      },
      required: ['scenarios', 'optimizations', 'confidence', 'reasoning']
    };

    expect(() => {
      validator.validateOutput('generate_scenarios', validOutput, schema);
    }).not.toThrow();
  });

  it('should throw PromptValidationError for invalid output', () => {
    const invalidOutput = {
      scenarios: 'not an array', // Should be array
      confidence: 0.85,
      reasoning: 'Test'
    };

    const schema = {
      type: 'object',
      properties: {
        scenarios: { type: 'array' },
        confidence: { type: 'number' },
        reasoning: { type: 'string' }
      },
      required: ['scenarios', 'confidence', 'reasoning']
    };

    expect(() => {
      validator.validateOutput('generate_scenarios', invalidOutput, schema);
    }).toThrow(PromptValidationError);
  });

  it('should provide detailed error information for output validation', () => {
    const invalidOutput = {
      scenarios: [],
      confidence: 'high', // Should be number
      reasoning: 'Test'
    };

    const schema = {
      type: 'object',
      properties: {
        scenarios: { type: 'array' },
        confidence: { type: 'number' },
        reasoning: { type: 'string' }
      },
      required: ['scenarios', 'confidence', 'reasoning']
    };

    try {
      validator.validateOutput('generate_scenarios', invalidOutput, schema);
      fail('Expected PromptValidationError to be thrown');
    } catch (error: any) {
      expect(error).toBeInstanceOf(PromptValidationError);
      expect(error.operation).toBe('generate_scenarios');
      expect(error.validationType).toBe('output');
      expect(error.errors).toBeDefined();
      expect(Array.isArray(error.errors)).toBe(true);
    }
  });
});

describe('PromptSchemaValidator - Error Class', () => {
  it('should create PromptValidationError with all properties', () => {
    const errors = [
      { path: '/userStory', message: 'should be string' }
    ];

    const validationError = new PromptValidationError(
      'generate_scenarios',
      'input',
      errors
    );

    expect(validationError).toBeInstanceOf(Error);
    expect(validationError.name).toBe('PromptValidationError');
    expect(validationError.operation).toBe('generate_scenarios');
    expect(validationError.validationType).toBe('input');
    expect(validationError.errors).toEqual(errors);
    expect(validationError.message).toContain('generate_scenarios');
    expect(validationError.message).toContain('input');
  });

  it('should handle conditional assignment for TypeScript strict mode', () => {
    const errors = [
      { path: '/test', message: 'test error' }
    ];

    const validationError = new PromptValidationError(
      'test_operation',
      'output',
      errors
    );

    // Verify properties are properly assigned
    expect(validationError.errors).toBe(errors);
    expect(validationError.operation).toBe('test_operation');
    expect(validationError.validationType).toBe('output');
  });
});

describe('PromptSchemaValidator - TypeScript Strict Mode Compliance', () => {
  let validator: PromptSchemaValidator;

  beforeEach(() => {
    validator = new PromptSchemaValidator();
  });

  it('should handle optional schema properties correctly', () => {
    const input = {
      userStory: 'Test',
      domain: 'test'
    };

    const schema = {
      type: 'object',
      properties: {
        userStory: { type: 'string' },
        domain: { type: 'string' },
        environment: { type: 'string' } // Optional property
      },
      required: ['userStory']
    };

    expect(() => {
      validator.validateInput('test_operation', input, schema);
    }).not.toThrow();
  });

  it('should use proper type guards for undefined values', () => {
    const input = {
      userStory: 'Test'
    };

    const schema = {
      type: 'object',
      properties: {
        userStory: { type: 'string' }
      },
      required: ['userStory']
    };

    // This should not throw even though other optional fields are undefined
    expect(() => {
      validator.validateInput('test_operation', input, schema);
    }).not.toThrow();
  });
});

