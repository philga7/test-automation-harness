/**
 * AITestGenerator Unit Tests
 * 
 * TDD RED PHASE: Write failing tests that define expected behavior FIRST
 * These tests will fail initially because AITestGenerator doesn't exist yet.
 * Following strict TDD methodology: RED-GREEN-REFACTOR cycle.
 */

import { TestScenario } from '../../src/analysis/TestScenarioGenerator';
import { AnalysisResult } from '../../src/analysis/WebAppAnalyzer';

// Context-specific naming to prevent global declaration conflicts
const aiTestGenMockFetch = jest.fn();
const aiTestGenMockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

// Mock external dependencies
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// AI/LLM Service Interfaces (RED PHASE - Define expected contracts)
interface AIServiceConfig {
  provider: 'openai' | 'claude' | 'local';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// TestOptimization interface used in test expectations
interface TestOptimization {
  type: 'performance' | 'coverage' | 'maintainability' | 'reliability';
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
  confidence: number;
}

// RED PHASE: Import AITestGenerator (will fail until implemented)
describe('AITestGenerator', () => {
  let aiTestGenerator: any;
  let mockTestScenarioGenerator: any;
  let mockUserFlowDetector: any;
  let mockDocument: any;
  let mockWindow: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    aiTestGenMockFetch.mockClear();
    aiTestGenMockOpenAI.chat.completions.create.mockClear();

    // Mock TestScenarioGenerator
    mockTestScenarioGenerator = {
      generateUserFlowScenarios: jest.fn(),
      generateFormInteractionScenarios: jest.fn(),
      generateNavigationScenarios: jest.fn(),
      generateEdgeCaseScenarios: jest.fn(),
      generatePlaywrightTestFile: jest.fn(),
      cleanup: jest.fn()
    };

    // Mock UserFlowDetector
    mockUserFlowDetector = {
      identifyUserJourneys: jest.fn(),
      analyzeNavigationPatterns: jest.fn(),
      detectCriticalPaths: jest.fn(),
      cleanup: jest.fn()
    };

    // Comprehensive DOM mocking
    mockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      createElement: jest.fn(() => ({
        className: '',
        textContent: '',
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn()
        }
      })),
      body: {
        appendChild: jest.fn(),
        insertAdjacentHTML: jest.fn()
      }
    };

    mockWindow = {
      fetch: aiTestGenMockFetch,
      openai: aiTestGenMockOpenAI
    };

    // Mock global objects with proper TypeScript casting
    (global as any).document = mockDocument;
    (global as any).window = mockWindow;
    (global as any).fetch = aiTestGenMockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    
    if (aiTestGenerator) {
      aiTestGenerator.cleanup?.();
    }
  });

  // RED PHASE: Test constructor and initialization
  describe('Constructor and Initialization', () => {
    test('should successfully import AITestGenerator (GREEN PHASE - component now exists)', () => {
      // This test now passes because the module exists
      expect(() => {
        const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
        return new AITestGenerator(mockTestScenarioGenerator, {});
      }).not.toThrow();
    });

    test('should require TestScenarioGenerator dependency', () => {
      expect(() => {
        const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
        return new AITestGenerator(null, mockUserFlowDetector);
      }).toThrow('TestScenarioGenerator is required');
    });

    test('should initialize with default AI service configuration', () => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      const instance = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });

      expect(instance.options.aiService.provider).toBe('openai');
      expect(instance.options.aiService.model).toBe('gpt-4');
      expect(instance.options.aiService.temperature).toBe(0.7);
      expect(instance.options.aiService.maxTokens).toBe(2000);
    });

    test('should support custom AI service configuration', () => {
      const customConfig: AIServiceConfig = {
        provider: 'claude',
        model: 'claude-3-sonnet',
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 60000
      };

      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      const instance = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        aiService: customConfig
      });

      expect(instance.options.aiService).toEqual(customConfig);
    });

    test('should initialize successfully with valid dependencies', async () => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      const instance = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });

      await instance.init();
      expect(instance.isInitialized).toBe(true);
    });
  });

  // RED PHASE: Test AI/LLM service integration
  describe('AI/LLM Service Integration', () => {
    beforeEach(() => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      aiTestGenerator = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true,
        aiService: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        }
      });
    });

    test('should connect to AI service successfully', async () => {
      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              scenarios: [],
              confidence: 0.8
            })
          }
        }],
        usage: {
          total_tokens: 150
        }
      });

      const connected = await aiTestGenerator.connectToAIService();
      expect(connected).toBe(true);
    });

    test('should handle AI service connection failures', async () => {
      aiTestGenMockOpenAI.chat.completions.create.mockRejectedValue(new Error('API key invalid'));

      await expect(aiTestGenerator.connectToAIService()).rejects.toThrow('Failed to connect to AI service');
    });

    test('should validate AI service response format', async () => {
      const invalidResponse = {
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }]
      };

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue(invalidResponse);

      await expect(aiTestGenerator.generateFromUserStory('User wants to login')).rejects.toThrow('Invalid AI response format');
    });

    test('should handle AI service rate limiting', async () => {
      aiTestGenMockOpenAI.chat.completions.create.mockRejectedValue({
        error: {
          type: 'rate_limit_exceeded',
          message: 'Rate limit exceeded'
        }
      });

      await expect(aiTestGenerator.generateFromUserStory('User story')).rejects.toThrow('AI service rate limit exceeded');
    });
  });

  // RED PHASE: Test natural language processing
  describe('Natural Language Processing', () => {
    beforeEach(() => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      aiTestGenerator = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
    });

    test('should parse user story into structured requirements', async () => {
      const userStory = 'As a user, I want to login with my email and password so that I can access my account';

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              requirements: [
                'User can enter email address',
                'User can enter password',
                'System validates credentials',
                'User is redirected to dashboard on success'
              ],
              testTypes: ['functional', 'validation', 'navigation'],
              priority: 'high'
            })
          }
        }],
        usage: { total_tokens: 200 }
      });

      const parsed = await aiTestGenerator.parseUserStory(userStory);
      expect(parsed.requirements).toHaveLength(4);
      expect(parsed.testTypes).toContain('functional');
      expect(parsed.priority).toBe('high');
    });

    test('should extract test scenarios from specifications', async () => {
      const specification = `
        Login Feature Specification:
        1. User enters email in email field
        2. User enters password in password field  
        3. User clicks login button
        4. System validates credentials
        5. On success, redirect to dashboard
        6. On failure, show error message
      `;

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              scenarios: [
                {
                  name: 'Successful Login',
                  steps: ['enter email', 'enter password', 'click login'],
                  expectedOutcome: 'redirect to dashboard'
                },
                {
                  name: 'Failed Login',
                  steps: ['enter invalid email', 'enter password', 'click login'],
                  expectedOutcome: 'show error message'
                }
              ]
            })
          }
        }],
        usage: { total_tokens: 300 }
      });

      const scenarios = await aiTestGenerator.extractScenariosFromSpecification(specification);
      expect(scenarios).toHaveLength(2);
      expect(scenarios[0].name).toBe('Successful Login');
      expect(scenarios[1].name).toBe('Failed Login');
    });

    test('should identify edge cases from user stories', async () => {
      const userStory = 'As a user, I want to upload a profile picture so that others can see my photo';

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              edgeCases: [
                'File too large',
                'Invalid file format',
                'Network interruption during upload',
                'No file selected',
                'Duplicate file name'
              ],
              riskLevel: 'medium'
            })
          }
        }],
        usage: { total_tokens: 180 }
      });

      const edgeCases = await aiTestGenerator.identifyEdgeCases(userStory);
      expect(edgeCases.edgeCases).toHaveLength(5);
      expect(edgeCases.edgeCases).toContain('File too large');
      expect(edgeCases.riskLevel).toBe('medium');
    });
  });

  // RED PHASE: Test intelligent test scenario generation
  describe('Intelligent Test Scenario Generation', () => {
    beforeEach(() => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      aiTestGenerator = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
    });

    test('should generate intelligent test scenarios from user story', async () => {
      const userStory = 'As a user, I want to reset my password so that I can regain access to my account';

      const mockAIResponse = {
        scenarios: [
          {
            name: 'Password Reset Happy Path',
            description: 'User successfully resets password with valid email',
            type: 'functional',
            priority: 'high',
            steps: [
              { action: 'click', selector: 'text=Forgot Password', description: 'Click forgot password link' },
              { action: 'fill', selector: '[name="email"]', value: 'user@example.com', description: 'Enter email address' },
              { action: 'click', selector: 'text=Send Reset Link', description: 'Click send reset button' }
            ],
            assertions: [
              { type: 'visible', selector: 'text=Reset link sent', description: 'Success message should be visible' }
            ],
            metadata: {
              aiGenerated: true,
              confidence: 0.9
            }
          }
        ],
        optimizations: [],
        confidence: 0.85,
        reasoning: 'Generated based on common password reset flow patterns'
      };

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }],
        usage: { total_tokens: 400 }
      });

      const result = await aiTestGenerator.generateFromUserStory(userStory);
      expect(result.scenarios).toHaveLength(1);
      expect(result.scenarios[0].name).toBe('Password Reset Happy Path');
      expect(result.scenarios[0].metadata.aiGenerated).toBe(true);
      expect(result.confidence).toBe(0.85);
    });

    test('should enhance existing scenarios with AI insights', async () => {
      const existingScenarios: TestScenario[] = [
        {
          name: 'Basic Login Test',
          description: 'User logs in with valid credentials',
          type: 'functional',
          priority: 'medium',
          steps: [
            { action: 'fill', selector: '[name="username"]', value: 'user', description: 'Enter username' },
            { action: 'fill', selector: '[name="password"]', value: 'pass', description: 'Enter password' },
            { action: 'click', selector: '[type="submit"]', description: 'Click login button' }
          ],
          assertions: [],
          metadata: {}
        }
      ];

      const mockEnhancement = {
        enhancedScenarios: [
          {
            ...existingScenarios[0],
            assertions: [
              { type: 'visible', selector: '.dashboard', description: 'Dashboard should be visible after login' },
              { type: 'url', selector: '/dashboard', description: 'Should redirect to dashboard URL' }
            ],
            steps: [
              ...(existingScenarios[0]?.steps || []),
              { action: 'waitForNavigation', selector: '', description: 'Wait for navigation to complete' }
            ]
          }
        ],
        improvements: [
          'Added navigation assertions',
          'Added wait for navigation step',
          'Enhanced test reliability'
        ]
      };

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockEnhancement)
          }
        }],
        usage: { total_tokens: 250 }
      });

      const enhanced = await aiTestGenerator.enhanceExistingScenarios(existingScenarios);
      expect(enhanced.enhancedScenarios[0].assertions).toHaveLength(2);
      expect(enhanced.improvements).toContain('Added navigation assertions');
    });

    test('should generate test data variations with AI', async () => {
      const scenario: TestScenario = {
        name: 'User Registration',
        description: 'User creates new account',
        type: 'functional',
        priority: 'high',
        steps: [],
        assertions: [],
        metadata: {}
      };

      const mockDataVariations = {
        validData: [
          { username: 'john_doe', email: 'john@example.com', password: 'SecurePass123!' },
          { username: 'jane_smith', email: 'jane@test.com', password: 'MyPassword456@' }
        ],
        invalidData: [
          { username: '', email: 'invalid-email', password: '123' },
          { username: 'a', email: 'test@', password: '' }
        ],
        edgeData: [
          { username: 'x'.repeat(255), email: 'very.long.email@example.com', password: 'P'.repeat(128) },
          { username: 'user@#$%', email: 'test+tag@domain.co.uk', password: '🔒🔑password' }
        ]
      };

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockDataVariations)
          }
        }],
        usage: { total_tokens: 180 }
      });

      const variations = await aiTestGenerator.generateTestDataVariations(scenario);
      expect(variations.validData).toHaveLength(2);
      expect(variations.invalidData).toHaveLength(2);
      expect(variations.edgeData).toHaveLength(2);
    });
  });

  // RED PHASE: Test AI-powered optimization and suggestions
  describe('AI-Powered Test Optimization', () => {
    beforeEach(() => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      aiTestGenerator = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
    });

    test('should analyze test coverage and suggest improvements', async () => {
      const analysisResult: AnalysisResult = {
        url: 'https://example.com',
        title: 'Test App',
        domStructure: {
          elements: [],
          hierarchy: {},
          semanticElements: [],
          totalElements: 3
        },
        uiElements: [
          { tagName: 'input', attributes: { name: 'username', type: 'text' }, text: '', locators: [], category: 'input' },
          { tagName: 'input', attributes: { name: 'password', type: 'password' }, text: '', locators: [], category: 'input' },
          { tagName: 'button', attributes: { type: 'submit' }, text: 'Login', locators: [], category: 'button' }
        ],
        locatorStrategies: {},
        navigationPatterns: [],
        screenshots: [],
        timestamp: new Date(),
        metadata: {}
      };

      const mockCoverageAnalysis = {
        coveragePercentage: 75,
        uncoveredElements: [
          { tagName: 'button', attributes: { class: 'forgot-password' }, text: 'Forgot Password?' }
        ],
        suggestions: [
          {
            type: 'coverage' as TestOptimization['type'],
            suggestion: 'Add test for forgot password functionality',
            impact: 'medium' as TestOptimization['impact'],
            implementation: 'Create test scenario for password reset flow',
            confidence: 0.8
          } as TestOptimization
        ],
        recommendations: [
          'Consider adding accessibility tests for form elements',
          'Add error handling tests for network failures'
        ]
      };

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockCoverageAnalysis)
          }
        }],
        usage: { total_tokens: 300 }
      });

      const coverage = await aiTestGenerator.analyzeCoverageWithAI(analysisResult, []);
      expect(coverage.coveragePercentage).toBe(75);
      expect(coverage.suggestions).toHaveLength(1);
      expect(coverage.suggestions[0].type).toBe('coverage');
    });

    test('should optimize test execution order for efficiency', async () => {
      const scenarios: TestScenario[] = [
        { name: 'Login Test', description: '', type: 'auth', priority: 'high', steps: [], assertions: [], metadata: {} },
        { name: 'Profile Test', description: '', type: 'user', priority: 'medium', steps: [], assertions: [], metadata: {} },
        { name: 'Logout Test', description: '', type: 'auth', priority: 'low', steps: [], assertions: [], metadata: {} }
      ];

      const mockOptimization = {
        optimizedOrder: [
          { name: 'Login Test', reason: 'Authentication required for other tests' },
          { name: 'Profile Test', reason: 'Depends on authenticated session' },
          { name: 'Logout Test', reason: 'Should run last to clean up session' }
        ],
        estimatedTimeReduction: 25,
        parallelizationOpportunities: [
          'Profile tests can run in parallel after login'
        ]
      };

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockOptimization)
          }
        }],
        usage: { total_tokens: 200 }
      });

      const optimization = await aiTestGenerator.optimizeTestExecutionOrder(scenarios);
      expect(optimization.optimizedOrder).toHaveLength(3);
      expect(optimization.estimatedTimeReduction).toBe(25);
      expect(optimization.parallelizationOpportunities).toContain('Profile tests can run in parallel after login');
    });

    test('should suggest test maintenance improvements', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Old Login Test',
          description: 'Login with hardcoded selectors',
          type: 'functional',
          priority: 'high',
          steps: [
            { action: 'fill', selector: '#username-field-id-12345', value: 'user', description: 'Enter username' }
          ],
          assertions: [],
          metadata: { lastUpdated: '2023-01-01' }
        }
      ];

      const mockMaintenance = {
        improvements: [
          {
            type: 'maintainability' as TestOptimization['type'],
            suggestion: 'Replace brittle ID selectors with data-testid attributes',
            impact: 'high' as TestOptimization['impact'],
            implementation: 'Update selector from #username-field-id-12345 to [data-testid="username-field"]',
            confidence: 0.9
          } as TestOptimization,
          {
            type: 'reliability' as TestOptimization['type'],
            suggestion: 'Add explicit waits for dynamic elements',
            impact: 'medium' as TestOptimization['impact'],
            implementation: 'Add waitForSelector before fill actions',
            confidence: 0.8
          } as TestOptimization
        ],
        priorityOrder: ['maintainability', 'reliability'],
        estimatedEffort: 'medium'
      };

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockMaintenance)
          }
        }],
        usage: { total_tokens: 250 }
      });

      const maintenance = await aiTestGenerator.suggestTestMaintenance(scenarios);
      expect(maintenance.improvements).toHaveLength(2);
      expect(maintenance.improvements[0].type).toBe('maintainability');
      expect(maintenance.estimatedEffort).toBe('medium');
    });
  });

  // RED PHASE: Test error handling and edge cases
  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      aiTestGenerator = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
    });

    test('should handle AI service timeout errors', async () => {
      aiTestGenMockOpenAI.chat.completions.create.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 100))
      );

      await expect(aiTestGenerator.generateFromUserStory('User story', { timeout: 50 }))
        .rejects.toThrow('AI service request timeout');
    });

    test('should handle malformed user stories gracefully', async () => {
      const malformedStory = '###invalid###story###format###';

      aiTestGenMockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              error: 'Unable to parse user story format',
              suggestions: ['Provide user story in standard format: As a [user], I want [goal] so that [benefit]']
            })
          }
        }],
        usage: { total_tokens: 50 }
      });

      await expect(aiTestGenerator.generateFromUserStory(malformedStory))
        .rejects.toThrow('Unable to parse user story');
    });

    test('should handle empty or null inputs', async () => {
      await expect(aiTestGenerator.generateFromUserStory('')).rejects.toThrow('User story is required');
      await expect(aiTestGenerator.generateFromUserStory(null)).rejects.toThrow('User story is required');
      await expect(aiTestGenerator.generateFromUserStory(undefined)).rejects.toThrow('User story is required');
    });

    test('should handle AI service quota exceeded errors', async () => {
      aiTestGenMockOpenAI.chat.completions.create.mockRejectedValue({
        error: {
          type: 'quota_exceeded',
          message: 'Monthly quota exceeded'
        }
      });

      await expect(aiTestGenerator.generateFromUserStory('User story'))
        .rejects.toThrow('AI service quota exceeded');
    });

    test('should provide fallback when AI service is unavailable', async () => {
      aiTestGenMockOpenAI.chat.completions.create.mockRejectedValue(new Error('Service unavailable'));

      // Should fall back to TestScenarioGenerator
      mockTestScenarioGenerator.generateUserFlowScenarios.mockResolvedValue([
        {
          name: 'Fallback Test',
          description: 'Generated without AI',
          type: 'functional',
          priority: 'medium',
          steps: [],
          assertions: [],
          metadata: { fallbackGenerated: true }
        }
      ]);

      const result = await aiTestGenerator.generateWithFallback('User story', {});
      expect(result.scenarios).toHaveLength(1);
      expect(result.scenarios[0].metadata.fallbackGenerated).toBe(true);
    });
  });

  // RED PHASE: Test cleanup and resource management
  describe('Cleanup and Resource Management', () => {
    beforeEach(() => {
      const { AITestGenerator } = require('../../src/analysis/AITestGenerator');
      aiTestGenerator = new AITestGenerator(mockTestScenarioGenerator, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
    });

    test('should cleanup resources properly', async () => {
      await aiTestGenerator.init();
      expect(aiTestGenerator.isInitialized).toBe(true);

      await aiTestGenerator.cleanup();
      expect(aiTestGenerator.isInitialized).toBe(false);
      expect(mockTestScenarioGenerator.cleanup).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', async () => {
      mockTestScenarioGenerator.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      // Should not throw error, just log it
      await expect(aiTestGenerator.cleanup()).resolves.not.toThrow();
    });
  });
});
