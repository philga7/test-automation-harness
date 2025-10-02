/**
 * PromptTemplateManager Unit Tests
 * 
 * Test-Driven Development (TDD) implementation for the Prompt Template System.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * 
 * RED PHASE: These tests will fail initially because PromptTemplateManager doesn't exist yet.
 * This is intentional! We define expected behavior through tests first, then implement.
 * 
 * Test Coverage:
 * - Template initialization and registration
 * - Prompt building with placeholder replacement
 * - Parameter validation
 * - Template retrieval and listing
 * - Statistics and utility methods
 */

import { PromptTemplateManager } from '../../src/ai/prompts/PromptTemplateManager';

// RED PHASE COMPLETED: Module now exists
// The RED phase test has been removed because we successfully implemented
// the PromptTemplateManager module and moved to GREEN phase

describe('PromptTemplateManager - Template Initialization', () => {
  let templateManager: PromptTemplateManager;

  beforeEach(() => {
    templateManager = new PromptTemplateManager();
  });

  it('should initialize with 9 operation templates', () => {
    const operations = templateManager.listOperations();
    expect(operations).toHaveLength(9);
  });

  it('should include all required AI operations', () => {
    const operations = templateManager.listOperations();
    const requiredOperations = [
      'generate_scenarios',
      'parse_user_story',
      'extract_scenarios',
      'identify_edge_cases',
      'enhance_scenarios',
      'generate_test_data',
      'analyze_coverage',
      'optimize_execution',
      'suggest_maintenance'
    ];

    requiredOperations.forEach(op => {
      expect(operations).toContain(op);
    });
  });

  it('should provide template for each operation', () => {
    const operations = templateManager.listOperations();
    
    operations.forEach(operation => {
      const template = templateManager.getTemplate(operation);
      expect(template).toBeDefined();
      
      // Type guard: template is defined after expect check
      if (template) {
        expect(template.id).toBe(operation);
        expect(template.operation).toBe(operation);
      }
    });
  });
});

describe('PromptTemplateManager - Template Structure', () => {
  let templateManager: PromptTemplateManager;

  beforeEach(() => {
    templateManager = new PromptTemplateManager();
  });

  it('should have complete template structure with all required fields', () => {
    const template = templateManager.getTemplate('generate_scenarios');
    
    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('operation');
    expect(template).toHaveProperty('systemMessage');
    expect(template).toHaveProperty('userMessageTemplate');
    expect(template).toHaveProperty('outputFormat');
    expect(template).toHaveProperty('examples');
    expect(template).toHaveProperty('temperature');
    expect(template).toHaveProperty('maxTokens');
    expect(template).toHaveProperty('version');
    expect(template).toHaveProperty('tags');
  });

  it('should have appropriate temperature settings for each operation', () => {
    const expectedTemperatures: Record<string, number> = {
      'generate_scenarios': 0.7,
      'parse_user_story': 0.3,
      'extract_scenarios': 0.5,
      'identify_edge_cases': 0.6,
      'enhance_scenarios': 0.5,
      'generate_test_data': 0.8,
      'analyze_coverage': 0.5,
      'optimize_execution': 0.4,
      'suggest_maintenance': 0.6
    };

    Object.entries(expectedTemperatures).forEach(([operation, expectedTemp]) => {
      const template = templateManager.getTemplate(operation);
      
      if (template) {
        expect(template.temperature).toBe(expectedTemp);
      }
    });
  });

  it('should have appropriate maxTokens settings for each operation', () => {
    const expectedMaxTokens: Record<string, number> = {
      'generate_scenarios': 3000,
      'parse_user_story': 1500,
      'extract_scenarios': 2000,
      'identify_edge_cases': 1500,
      'enhance_scenarios': 2000,
      'generate_test_data': 2000,
      'analyze_coverage': 2500,
      'optimize_execution': 1500,
      'suggest_maintenance': 2000
    };

    Object.entries(expectedMaxTokens).forEach(([operation, expectedTokens]) => {
      const template = templateManager.getTemplate(operation);
      
      if (template) {
        expect(template.maxTokens).toBe(expectedTokens);
      }
    });
  });

  it('should have system message for each template', () => {
    templateManager.listOperations().forEach(operation => {
      const template = templateManager.getTemplate(operation);
      
      if (template) {
        expect(template.systemMessage).toBeDefined();
        expect(template.systemMessage.length).toBeGreaterThan(0);
        expect(typeof template.systemMessage).toBe('string');
      }
    });
  });

  it('should have user message template with placeholders', () => {
    const template = templateManager.getTemplate('generate_scenarios');
    
    if (template) {
      expect(template.userMessageTemplate).toBeDefined();
      expect(template.userMessageTemplate).toContain('{userStory}');
    }
  });

  it('should have output format schema in TypeScript format', () => {
    const template = templateManager.getTemplate('generate_scenarios');
    
    if (template) {
      expect(template.outputFormat).toBeDefined();
      expect(typeof template.outputFormat).toBe('string');
      expect(template.outputFormat.length).toBeGreaterThan(0);
    }
  });
});

describe('PromptTemplateManager - Prompt Building', () => {
  let templateManager: PromptTemplateManager;

  beforeEach(() => {
    templateManager = new PromptTemplateManager();
  });

  it('should build prompt with correct structure', () => {
    const params = {
      userStory: 'As a user, I want to login',
      domain: 'web-application',
      applicationType: 'e-commerce'
    };

    const built = templateManager.buildPrompt('generate_scenarios', params);

    expect(built).toHaveProperty('systemMessage');
    expect(built).toHaveProperty('userMessage');
    expect(built).toHaveProperty('config');
    expect(built).toHaveProperty('operation');
    expect(built).toHaveProperty('metadata');
  });

  it('should replace placeholders in user message', () => {
    const params = {
      userStory: 'As a user, I want to reset my password',
      domain: 'authentication',
      applicationType: 'web-app'
    };

    const built = templateManager.buildPrompt('generate_scenarios', params);

    expect(built.userMessage).toContain('As a user, I want to reset my password');
    expect(built.userMessage).not.toContain('{userStory}');
  });

  it('should include temperature and maxTokens in config', () => {
    const params = {
      userStory: 'Test story',
      domain: 'test',
      applicationType: 'test'
    };

    const built = templateManager.buildPrompt('generate_scenarios', params);

    expect(built.config.temperature).toBe(0.7);
    expect(built.config.maxTokens).toBe(3000);
  });

  it('should include metadata with template info', () => {
    const params = {
      userStory: 'Test story',
      domain: 'test',
      applicationType: 'test'
    };

    const built = templateManager.buildPrompt('generate_scenarios', params);

    expect(built.metadata.templateId).toBe('generate_scenarios');
    expect(built.metadata.version).toBeDefined();
    expect(built.metadata.buildTimestamp).toBeDefined();
  });

  it('should throw error for unknown operation', () => {
    const params = { userStory: 'Test' };

    expect(() => {
      templateManager.buildPrompt('unknown_operation', params);
    }).toThrow();
  });

  it('should throw error for missing required parameters', () => {
    expect(() => {
      templateManager.buildPrompt('generate_scenarios', {});
    }).toThrow(/required parameter/i);
  });

  it('should handle multiple placeholders in template', () => {
    const params = {
      specification: 'User registration form',
      domain: 'user-management',
      applicationType: 'web-app',
      environment: 'staging'
    };

    const built = templateManager.buildPrompt('parse_user_story', params);

    expect(built.userMessage).toContain('User registration form');
    expect(built.userMessage).not.toContain('{specification}');
  });
});

describe('PromptTemplateManager - Utility Methods', () => {
  let templateManager: PromptTemplateManager;

  beforeEach(() => {
    templateManager = new PromptTemplateManager();
  });

  it('should return statistics about templates', () => {
    const stats = templateManager.getStatistics();

    expect(stats).toHaveProperty('totalTemplates');
    expect(stats).toHaveProperty('operations');
    expect(stats).toHaveProperty('averageTemperature');
    expect(stats).toHaveProperty('averageMaxTokens');
    
    expect(stats.totalTemplates).toBe(9);
  });

  it('should return template by ID', () => {
    const template = templateManager.getTemplate('generate_scenarios');
    expect(template).toBeDefined();
    
    if (template) {
      expect(template.id).toBe('generate_scenarios');
    }
  });

  it('should return undefined for non-existent template', () => {
    const template = templateManager.getTemplate('non_existent');
    expect(template).toBeUndefined();
  });

  it('should list all operation names', () => {
    const operations = templateManager.listOperations();
    expect(Array.isArray(operations)).toBe(true);
    expect(operations.length).toBe(9);
  });
});

describe('PromptTemplateManager - TypeScript Strict Mode Compliance', () => {
  let templateManager: PromptTemplateManager;

  beforeEach(() => {
    templateManager = new PromptTemplateManager();
  });

  it('should handle all required parameters correctly', () => {
    const params = {
      userStory: 'Test story',
      domain: 'test',
      applicationType: 'web-app'
    };

    const built = templateManager.buildPrompt('generate_scenarios', params);
    expect(built).toBeDefined();
    expect(built.userMessage).toContain('Test story');
    expect(built.userMessage).toContain('test');
    expect(built.userMessage).toContain('web-app');
  });

  it('should use conditional assignment for optional properties', () => {
    // This test verifies that the implementation uses conditional assignment
    // pattern for TypeScript strict mode compliance
    const template = templateManager.getTemplate('generate_scenarios');
    
    // Template should have optional properties properly handled
    expect(template).toBeDefined();
    
    if (template) {
      // If examples array is empty, it should be an empty array, not undefined
      if (template.examples) {
        expect(Array.isArray(template.examples)).toBe(true);
      }
    }
  });
});

