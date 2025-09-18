/**
 * TestScenarioGenerator Unit Tests
 * 
 * Following TDD RED PHASE - Writing failing tests FIRST to define expected behavior.
 * These tests define the complete API contract for TestScenarioGenerator component.
 * 
 * The TestScenarioGenerator converts app analysis results into Playwright test scenarios,
 * generating test cases for user flows, form interactions, navigation, and edge cases.
 */

import { TestScenarioGenerator } from '../../../src/analysis/TestScenarioGenerator';
import { UserFlowDetector, UserJourney, NavigationFlow, CriticalPath } from '../../../src/analysis/UserFlowDetector';
import { AnalysisResult, UIElement } from '../../../src/analysis/WebAppAnalyzer';

// Use context-specific naming to prevent global declaration conflicts
const testScenarioMockFetch = jest.fn();
const testScenarioMockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock global objects with proper TypeScript casting
(global as any).fetch = testScenarioMockFetch;
(global as any).console = testScenarioMockConsole;

describe('TestScenarioGenerator', () => {
  let testScenarioGenerator: TestScenarioGenerator;
  let mockUserFlowDetector: jest.Mocked<UserFlowDetector>;
  let mockAnalysisResult: AnalysisResult;
  let mockUserJourneys: UserJourney[];
  let mockNavigationFlows: NavigationFlow[];
  let mockCriticalPaths: CriticalPath[];

  beforeEach(() => {

    // Create mock UserFlowDetector
    mockUserFlowDetector = {
      init: jest.fn(),
      identifyUserJourneys: jest.fn(),
      analyzeNavigationPatterns: jest.fn(),
      mapFormInteractions: jest.fn(),
      detectCriticalPaths: jest.fn(),
      generateFlowDiagram: jest.fn(),
      analyzeUserFlows: jest.fn(),
      registerCustomPatterns: jest.fn(),
      cleanup: jest.fn(),
      options: { autoInit: false, enableLogging: false, skipDOMInit: true },
      isInitialized: true,
      customPatterns: {}
    } as any;

    // Create mock analysis result
    mockAnalysisResult = {
      url: 'https://example.com',
      title: 'Example App',
      domStructure: {
        elements: [],
        hierarchy: {},
        semanticElements: ['header', 'nav', 'main', 'footer'],
        totalElements: 25
      },
      uiElements: [
        {
          id: 'login-btn',
          tagName: 'button',
          text: 'Login',
          attributes: { type: 'submit', id: 'login-btn' },
          locators: [
            { type: 'id', value: '#login-btn', priority: 1, confidence: 0.9 }
          ],
          category: 'button'
        },
        {
          id: 'username',
          tagName: 'input',
          attributes: { type: 'text', name: 'username', id: 'username' },
          locators: [
            { type: 'id', value: '#username', priority: 1, confidence: 0.9 }
          ],
          category: 'input'
        }
      ],
      locatorStrategies: {},
      navigationPatterns: [
        {
          type: 'menu',
          elements: []
        }
      ],
      screenshots: [],
      timestamp: new Date()
    };

    // Create mock user journeys
    mockUserJourneys = [
      {
        name: 'User Login Journey',
        type: 'loginFlow',
        steps: [
          {
            tagName: 'input',
            attributes: { type: 'text', name: 'username' },
            locators: [{ type: 'name', value: '[name="username"]', priority: 1, confidence: 0.8 }],
            category: 'input'
          },
          {
            tagName: 'input',
            attributes: { type: 'password', name: 'password' },
            locators: [{ type: 'name', value: '[name="password"]', priority: 1, confidence: 0.8 }],
            category: 'input'
          },
          {
            tagName: 'button',
            text: 'Login',
            attributes: { type: 'submit' },
            locators: [{ type: 'text', value: 'Login', priority: 1, confidence: 0.7 }],
            category: 'button'
          }
        ],
        criticalPath: true,
        priority: 'high',
        businessImpact: 'critical',
        userFrequency: 0.8
      }
    ];

    // Create mock navigation flows
    mockNavigationFlows = [
      {
        patternType: 'menu',
        possiblePaths: ['Home', 'About', 'Contact'],
        complexity: 'simple',
        userInteractionType: 'click',
        hierarchyLevel: 1,
        estimatedUserTime: 2.5
      }
    ];

    // Create mock critical paths
    mockCriticalPaths = [
      {
        priority: 'high',
        businessImpact: 'critical',
        userFrequency: 0.8,
        complexityScore: 0.6,
        stepCount: 3,
        edgeCases: ['error_handling', 'forgot_password'],
        alternativePaths: ['social_login', 'guest_checkout']
      }
    ];

    // Mock UserFlowDetector methods
    mockUserFlowDetector.identifyUserJourneys.mockResolvedValue(mockUserJourneys);
    mockUserFlowDetector.analyzeNavigationPatterns.mockResolvedValue(mockNavigationFlows);
    mockUserFlowDetector.detectCriticalPaths.mockResolvedValue(mockCriticalPaths);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should throw error when UserFlowDetector is not provided', () => {
      // RED PHASE: This test should FAIL because TestScenarioGenerator doesn't exist yet
      expect(() => new TestScenarioGenerator(null as any)).toThrow('UserFlowDetector is required');
    });

    it('should initialize with UserFlowDetector and default options', () => {
      // RED PHASE: This test should FAIL because TestScenarioGenerator doesn't exist yet
      testScenarioGenerator = new TestScenarioGenerator(mockUserFlowDetector);
      
      expect(testScenarioGenerator).toBeDefined();
      expect(testScenarioGenerator.options).toEqual({
        autoInit: true,
        enableLogging: true,
        skipDOMInit: false,
        includeEdgeCases: true,
        generateAssertions: true,
        testFramework: 'playwright'
      });
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true,
        includeEdgeCases: false,
        generateAssertions: false,
        testFramework: 'playwright' as const
      };

      testScenarioGenerator = new TestScenarioGenerator(mockUserFlowDetector, customOptions);
      
      expect(testScenarioGenerator.options).toEqual(customOptions);
      expect(testScenarioGenerator.isInitialized).toBe(false);
    });

    it('should auto-initialize when autoInit is true', () => {
      testScenarioGenerator = new TestScenarioGenerator(mockUserFlowDetector, { autoInit: true });
      
      expect(testScenarioGenerator.isInitialized).toBe(true);
    });
  });

  describe('Test Scenario Generation', () => {
    beforeEach(() => {
      testScenarioGenerator = new TestScenarioGenerator(mockUserFlowDetector, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      testScenarioGenerator.init();
    });

    it('should convert user flows into Playwright test scenarios', async () => {
      const scenarios = await testScenarioGenerator.generateUserFlowScenarios(mockUserJourneys);
      
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0]).toEqual({
        name: 'User Login Journey Test',
        description: 'Automated test for User Login Journey user flow',
        type: 'loginFlow',
        priority: 'high',
        steps: [
          {
            action: 'fill',
            selector: '[name="username"]',
            value: 'testuser',
            description: 'Fill username field'
          },
          {
            action: 'fill',
            selector: '[name="password"]',
            value: 'testpass',
            description: 'Fill password field'
          },
          {
            action: 'click',
            selector: 'text=Login',
            description: 'Click login button'
          }
        ],
        assertions: [
          {
            type: 'visible',
            selector: '[name="username"]',
            description: 'Username field should be visible'
          },
          {
            type: 'visible',
            selector: '[name="password"]',
            description: 'Password field should be visible'
          },
          {
            type: 'enabled',
            selector: 'text=Login',
            description: 'Login button should be enabled'
          }
        ],
        metadata: {
          businessImpact: 'critical',
          userFrequency: 0.8,
          criticalPath: true
        }
      });
    });

    it('should generate form interaction test scenarios', async () => {
      const formElements: UIElement[] = [
        {
          tagName: 'input',
          attributes: { type: 'email', name: 'email', required: 'true' },
          locators: [{ type: 'name', value: '[name="email"]', priority: 1, confidence: 0.8 }],
          category: 'input'
        },
        {
          tagName: 'button',
          text: 'Submit',
          attributes: { type: 'submit' },
          locators: [{ type: 'text', value: 'Submit', priority: 1, confidence: 0.7 }],
          category: 'button'
        }
      ];

      const scenarios = await testScenarioGenerator.generateFormInteractionScenarios(formElements);
      
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0]?.name).toBe('Form Interaction Test');
      expect(scenarios[0]?.steps).toContainEqual({
        action: 'fill',
        selector: '[name="email"]',
        value: 'test@example.com',
        description: 'Fill email field'
      });
      expect(scenarios[0]?.steps).toContainEqual({
        action: 'click',
        selector: 'text=Submit',
        description: 'Click submit button'
      });
    });

    it('should generate navigation test scenarios', async () => {
      const scenarios = await testScenarioGenerator.generateNavigationScenarios(mockNavigationFlows);
      
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0]).toEqual({
        name: 'Menu Navigation Test',
        description: 'Automated test for menu navigation pattern',
        type: 'navigation',
        priority: 'medium',
        steps: [
          {
            action: 'click',
            selector: 'text=Home',
            description: 'Navigate to Home'
          },
          {
            action: 'click',
            selector: 'text=About',
            description: 'Navigate to About'
          },
          {
            action: 'click',
            selector: 'text=Contact',
            description: 'Navigate to Contact'
          }
        ],
        assertions: [
          {
            type: 'visible',
            selector: 'nav',
            description: 'Navigation menu should be visible'
          }
        ],
        metadata: {
          patternType: 'menu',
          complexity: 'simple',
          estimatedUserTime: 2.5
        }
      });
    });

    it('should generate edge case test scenarios', async () => {
      const scenarios = await testScenarioGenerator.generateEdgeCaseScenarios(mockCriticalPaths);
      
      expect(scenarios).toHaveLength(2);
      expect(scenarios[0]?.name).toBe('Error Handling Edge Case Test');
      expect(scenarios[1]?.name).toBe('Forgot Password Edge Case Test');
      
      expect(scenarios[0]?.steps).toContainEqual({
        action: 'fill',
        selector: '[name="username"]',
        value: '',
        description: 'Test with empty username'
      });
    });

    it('should handle empty user journeys gracefully', async () => {
      const scenarios = await testScenarioGenerator.generateUserFlowScenarios([]);
      
      expect(scenarios).toEqual([]);
    });

    it('should handle malformed user journey data', async () => {
      const malformedJourneys = [
        {
          name: 'Invalid Journey',
          type: 'loginFlow',
          steps: null // Invalid steps
        } as any
      ];

      await expect(testScenarioGenerator.generateUserFlowScenarios(malformedJourneys))
        .rejects.toThrow('Invalid user journey data');
    });
  });

  describe('Playwright Test File Generation', () => {
    beforeEach(() => {
      testScenarioGenerator = new TestScenarioGenerator(mockUserFlowDetector, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      testScenarioGenerator.init();
    });

    it('should generate complete Playwright test file from analysis result', async () => {
      const testFile = await testScenarioGenerator.generatePlaywrightTestFile(mockAnalysisResult, {
        includeUserFlows: true,
        includeFormInteractions: true,
        includeNavigation: true,
        includeEdgeCases: true,
        testFileName: 'generated-test.spec.ts'
      });
      
      expect(testFile).toEqual({
        fileName: 'generated-test.spec.ts',
        content: expect.stringContaining('import { test, expect } from \'@playwright/test\';'),
        scenarios: expect.any(Array),
        metadata: {
          generatedAt: expect.any(Date),
          sourceUrl: 'https://example.com',
          totalScenarios: expect.any(Number),
          framework: 'playwright'
        }
      });
      
      expect(testFile.content).toContain('test(\'User Login Journey Test\'');
      expect(testFile.content).toContain('await page.fill(\'[name="username"]\', \'testuser\');');
      expect(testFile.content).toContain('await expect(page.locator(\'[name="username"]\')).toBeVisible();');
    });

    it('should generate test file with custom configuration', async () => {
      const customConfig = {
        includeUserFlows: true,
        includeFormInteractions: false,
        includeNavigation: false,
        includeEdgeCases: false,
        testFileName: 'custom-test.spec.ts',
        baseUrl: 'https://staging.example.com',
        timeout: 60000
      };

      const testFile = await testScenarioGenerator.generatePlaywrightTestFile(mockAnalysisResult, customConfig);
      
      expect(testFile.fileName).toBe('custom-test.spec.ts');
      expect(testFile.content).toContain('test.setTimeout(60000)');
      expect(testFile.content).toContain('https://staging.example.com');
      expect(testFile.scenarios).toHaveLength(1); // Only user flows included
    });

    it('should generate test data and assertions', async () => {
      const testData = await testScenarioGenerator.generateTestData(mockUserJourneys[0]!);
      
      expect(testData).toEqual({
        valid: {
          username: 'testuser',
          password: 'testpass'
        },
        invalid: {
          username: '',
          password: '123'
        },
        edge: {
          username: 'a'.repeat(256),
          password: 'special!@#$%^&*()'
        }
      });
    });

    it('should generate comprehensive assertions for test scenarios', async () => {
      const assertions = await testScenarioGenerator.generateAssertions(mockUserJourneys[0]!);
      
      expect(assertions).toEqual([
        {
          type: 'visible',
          selector: '[name="username"]',
          description: 'Username field should be visible'
        },
        {
          type: 'visible',
          selector: '[name="password"]',
          description: 'Password field should be visible'
        },
        {
          type: 'enabled',
          selector: 'text=Login',
          description: 'Login button should be enabled'
        }
      ]);
    });

    it('should handle timeout during test generation', async () => {
      const timeoutConfig = {
        includeUserFlows: true,
        includeFormInteractions: true,
        includeNavigation: true,
        includeEdgeCases: true,
        testFileName: 'timeout-test.spec.ts',
        timeout: 100 // Very short timeout
      };

      await expect(testScenarioGenerator.generatePlaywrightTestFile(mockAnalysisResult, timeoutConfig))
        .rejects.toThrow('Test generation timeout exceeded');
    });
  });

  describe('Test Case Prioritization and Coverage', () => {
    beforeEach(() => {
      testScenarioGenerator = new TestScenarioGenerator(mockUserFlowDetector, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      testScenarioGenerator.init();
    });

    it('should prioritize test scenarios by business impact', async () => {
      const prioritizedScenarios = await testScenarioGenerator.prioritizeScenarios(mockUserJourneys);
      
      expect(prioritizedScenarios).toHaveLength(1);
      expect(prioritizedScenarios[0]?.priority).toBe('high');
      expect(prioritizedScenarios[0]?.metadata['businessImpact']).toBe('critical');
    });

    it('should analyze test coverage for analysis result', async () => {
      const coverage = await testScenarioGenerator.analyzeCoverage(mockAnalysisResult);
      
      expect(coverage).toEqual({
        totalElements: 2,
        coveredElements: 2,
        coveragePercentage: 100,
        uncoveredElements: [],
        recommendations: [
          'All identified UI elements have test coverage',
          'Consider adding negative test cases for form validation'
        ]
      });
    });

    it('should generate test templates for reusable patterns', async () => {
      const templates = await testScenarioGenerator.generateTestTemplates(['loginFlow', 'navigation']);
      
      expect(templates).toHaveLength(2);
      expect(templates[0]).toEqual({
        type: 'loginFlow',
        name: 'Login Flow Template',
        template: expect.stringContaining('test(\'{{testName}}\', async ({ page }) => {'),
        variables: ['testName', 'username', 'password', 'loginSelector']
      });
    });
  });

  describe('Integration and Error Handling', () => {
    beforeEach(() => {
      testScenarioGenerator = new TestScenarioGenerator(mockUserFlowDetector, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      testScenarioGenerator.init();
    });

    it('should integrate with UserFlowDetector for complete analysis', async () => {
      const completeAnalysis = {
        userJourneys: mockUserJourneys,
        navigationFlows: mockNavigationFlows,
        criticalPaths: mockCriticalPaths,
        flowDiagrams: []
      };

      mockUserFlowDetector.analyzeUserFlows.mockResolvedValue(completeAnalysis);

      const testFile = await testScenarioGenerator.generateFromUserFlowAnalysis('https://example.com', {
        analysisDepth: 'comprehensive',
        includeEdgeCases: true
      });

      expect(testFile.scenarios.length).toBeGreaterThan(0);
      expect(mockUserFlowDetector.analyzeUserFlows).toHaveBeenCalledWith('https://example.com', {
        analysisDepth: 'comprehensive',
        includeEdgeCases: true
      });
    });

    it('should handle UserFlowDetector analysis failures', async () => {
      mockUserFlowDetector.analyzeUserFlows.mockRejectedValue(new Error('Analysis failed'));

      await expect(testScenarioGenerator.generateFromUserFlowAnalysis('https://invalid-url.com'))
        .rejects.toThrow('Failed to generate test scenarios: Analysis failed');
    });

    it('should validate input parameters', async () => {
      await expect(testScenarioGenerator.generateUserFlowScenarios(null as any))
        .rejects.toThrow('User journeys are required');

      await expect(testScenarioGenerator.generatePlaywrightTestFile(null as any, {}))
        .rejects.toThrow('Analysis result is required');
    });

    it('should cleanup resources properly', async () => {
      await testScenarioGenerator.cleanup();
      
      expect(mockUserFlowDetector.cleanup).toHaveBeenCalled();
      expect(testScenarioGenerator.isInitialized).toBe(false);
    });
  });
});
