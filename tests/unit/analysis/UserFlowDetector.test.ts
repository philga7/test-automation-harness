/**
 * UserFlowDetector Unit Tests
 * 
 * Following TDD RED PHASE - Writing failing tests FIRST to define expected behavior.
 * These tests define the complete API contract for UserFlowDetector component.
 */

import { UserFlowDetector } from '../../../src/analysis/UserFlowDetector';
import { WebAppAnalyzer, AnalysisResult, NavigationPattern, UIElement } from '../../../src/analysis/WebAppAnalyzer';

// Use context-specific naming to prevent global declaration conflicts
const userFlowMockFetch = jest.fn();
const userFlowMockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock global objects with proper TypeScript casting
(global as any).fetch = userFlowMockFetch;
(global as any).console = userFlowMockConsole;

describe('UserFlowDetector', () => {
  let userFlowDetector: UserFlowDetector;
  let mockWebAppAnalyzer: jest.Mocked<WebAppAnalyzer>;
  let mockAnalysisResult: AnalysisResult;

  beforeEach(() => {
    // Create mock WebAppAnalyzer
    mockWebAppAnalyzer = {
      initialize: jest.fn(),
      analyzeWebApp: jest.fn(),
      cleanup: jest.fn(),
      extractDOMStructure: jest.fn(),
      identifyUIElements: jest.fn(),
      generateLocatorStrategies: jest.fn(),
      detectNavigationPatterns: jest.fn()
    } as any;

    // Create mock analysis result with comprehensive data
    mockAnalysisResult = {
      url: 'https://example.com',
      title: 'Example App',
      domStructure: {
        elements: [],
        hierarchy: {},
        semanticElements: ['header', 'nav', 'main', 'footer'],
        totalElements: 50
      },
      uiElements: [
        {
          id: 'login-btn',
          tagName: 'button',
          text: 'Login',
          attributes: { type: 'submit' },
          locators: [],
          category: 'button'
        },
        {
          id: 'register-link',
          tagName: 'a',
          text: 'Register',
          attributes: { href: '/register' },
          locators: [],
          category: 'link'
        },
        {
          id: 'checkout-btn',
          tagName: 'button',
          text: 'Checkout',
          attributes: { type: 'button' },
          locators: [],
          category: 'button'
        }
      ],
      locatorStrategies: {},
      navigationPatterns: [
        {
          type: 'menu',
          elements: [
            {
              tagName: 'nav',
              attributes: {},
              locators: [],
              category: 'navigation'
            }
          ]
        }
      ],
      screenshots: [],
      timestamp: new Date()
    };

    // Initialize UserFlowDetector with test-friendly options
    userFlowDetector = new UserFlowDetector(mockWebAppAnalyzer, {
      autoInit: false,
      enableLogging: false,
      skipDOMInit: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should create UserFlowDetector instance with WebAppAnalyzer dependency', () => {
      // GREEN PHASE: UserFlowDetector now exists and should create successfully
      const detector = new UserFlowDetector(mockWebAppAnalyzer, { autoInit: false });
      expect(detector).toBeInstanceOf(UserFlowDetector);
      expect(detector.isInitialized).toBe(false);
    });

    it('should throw error when WebAppAnalyzer is not provided', () => {
      // RED PHASE: Test dependency injection validation
      expect(() => new UserFlowDetector(null as any)).toThrow('WebAppAnalyzer is required');
    });

    it('should initialize with default configuration options', () => {
      // GREEN PHASE: Test default configuration setup with auto-init disabled for testing
      const detector = new UserFlowDetector(mockWebAppAnalyzer, { autoInit: false });
      expect(detector.isInitialized).toBe(false);
      expect(detector.options.autoInit).toBe(false);
    });

    it('should support test-friendly initialization options', () => {
      // RED PHASE: Test constructor options for testability
      const detector = new UserFlowDetector(mockWebAppAnalyzer, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      expect(detector.options.autoInit).toBe(false);
    });
  });

  describe('User Journey Identification', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should identify login user journey from analysis result', async () => {
      // RED PHASE: Define login flow detection behavior
      const userJourneys = await userFlowDetector.identifyUserJourneys(mockAnalysisResult);
      
      const loginJourney = userJourneys.find(journey => journey.type === 'loginFlow');
      expect(loginJourney).toBeDefined();
      expect(loginJourney?.name).toBe('User Login Journey');
      expect(loginJourney?.steps).toHaveLength(2); // Username input + Login button
      expect(loginJourney?.criticalPath).toBe(true);
    });

    it('should identify registration user journey from UI elements', async () => {
      // RED PHASE: Define registration flow detection
      const userJourneys = await userFlowDetector.identifyUserJourneys(mockAnalysisResult);
      
      const registrationJourney = userJourneys.find(journey => journey.type === 'registrationFlow');
      expect(registrationJourney).toBeDefined();
      expect(registrationJourney?.name).toBe('User Registration Journey');
      expect(registrationJourney?.steps.length).toBeGreaterThan(0);
    });

    it('should identify checkout user journey for e-commerce flows', async () => {
      // RED PHASE: Define e-commerce checkout flow detection
      const userJourneys = await userFlowDetector.identifyUserJourneys(mockAnalysisResult);
      
      const checkoutJourney = userJourneys.find(journey => journey.type === 'checkoutFlow');
      expect(checkoutJourney).toBeDefined();
      expect(checkoutJourney?.name).toBe('Checkout Journey');
      expect(checkoutJourney?.priority).toBe('high');
    });

    it('should identify generic user journeys for unknown patterns', async () => {
      // RED PHASE: Define fallback generic journey detection
      const userJourneys = await userFlowDetector.identifyUserJourneys(mockAnalysisResult);
      
      const genericJourneys = userJourneys.filter(journey => journey.type === 'generic');
      expect(genericJourneys.length).toBeGreaterThan(0);
      expect(genericJourneys[0]?.name).toContain('Navigation');
    });

    it('should handle empty analysis results gracefully', async () => {
      // RED PHASE: Test edge case with no UI elements
      const emptyResult = { ...mockAnalysisResult, uiElements: [], navigationPatterns: [] };
      const userJourneys = await userFlowDetector.identifyUserJourneys(emptyResult);
      
      expect(userJourneys).toEqual([]);
    });
  });

  describe('Navigation Pattern Analysis', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should analyze menu navigation patterns and create user flows', async () => {
      // RED PHASE: Define menu pattern analysis behavior
      const navigationFlows = await userFlowDetector.analyzeNavigationPatterns(mockAnalysisResult.navigationPatterns);
      
      const menuFlow = navigationFlows.find(flow => flow.patternType === 'menu');
      expect(menuFlow).toBeDefined();
      expect(menuFlow?.possiblePaths).toHaveLength(3); // Home, About, Contact typical paths
      expect(menuFlow?.complexity).toBe('simple');
    });

    it('should analyze tab navigation patterns', async () => {
      // RED PHASE: Define tab pattern analysis
      const tabPatterns: NavigationPattern[] = [
        {
          type: 'tabs',
          elements: [
            { tagName: 'div', attributes: { role: 'tab' }, locators: [], category: 'navigation' }
          ]
        }
      ];

      const navigationFlows = await userFlowDetector.analyzeNavigationPatterns(tabPatterns);
      
      const tabFlow = navigationFlows.find(flow => flow.patternType === 'tabs');
      expect(tabFlow).toBeDefined();
      expect(tabFlow?.userInteractionType).toBe('click');
    });

    it('should analyze breadcrumb navigation patterns', async () => {
      // RED PHASE: Define breadcrumb pattern analysis
      const breadcrumbPatterns: NavigationPattern[] = [
        {
          type: 'breadcrumbs',
          elements: [
            { tagName: 'nav', attributes: { 'aria-label': 'breadcrumb' }, locators: [], category: 'navigation' }
          ]
        }
      ];

      const navigationFlows = await userFlowDetector.analyzeNavigationPatterns(breadcrumbPatterns);
      
      const breadcrumbFlow = navigationFlows.find(flow => flow.patternType === 'breadcrumbs');
      expect(breadcrumbFlow).toBeDefined();
      expect(breadcrumbFlow?.hierarchyLevel).toBeGreaterThan(0);
    });

    it('should calculate navigation complexity metrics', async () => {
      // RED PHASE: Define complexity calculation behavior
      const navigationFlows = await userFlowDetector.analyzeNavigationPatterns(mockAnalysisResult.navigationPatterns);
      
      expect(navigationFlows).toHaveLength(1);
      expect(navigationFlows[0]?.complexity).toMatch(/simple|moderate|complex/);
      expect(navigationFlows[0]?.estimatedUserTime).toBeGreaterThan(0);
    });
  });

  describe('Form Interaction Mapping', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should map form interactions to user workflows', async () => {
      // RED PHASE: Define form interaction mapping behavior
      const formElements: UIElement[] = [
        {
          id: 'username',
          tagName: 'input',
          attributes: { type: 'text', name: 'username' },
          locators: [],
          category: 'input'
        },
        {
          id: 'password',
          tagName: 'input',
          attributes: { type: 'password', name: 'password' },
          locators: [],
          category: 'input'
        },
        {
          id: 'submit-btn',
          tagName: 'button',
          attributes: { type: 'submit' },
          locators: [],
          category: 'button'
        }
      ];

      const formInteractions = await userFlowDetector.mapFormInteractions(formElements);
      
      expect(formInteractions).toHaveLength(1);
      expect(formInteractions[0]?.formType).toBe('login');
      expect(formInteractions[0]?.requiredFields).toEqual(['username', 'password']);
      expect(formInteractions[0]?.submitAction).toBeDefined();
    });

    it('should identify multi-step form workflows', async () => {
      // RED PHASE: Define multi-step form detection
      const multiStepElements: UIElement[] = [
        {
          id: 'step-1',
          tagName: 'div',
          attributes: { 'data-step': '1' },
          locators: [],
          category: 'container'
        },
        {
          id: 'next-btn',
          tagName: 'button',
          text: 'Next',
          attributes: { type: 'button' },
          locators: [],
          category: 'button'
        }
      ];

      const formInteractions = await userFlowDetector.mapFormInteractions(multiStepElements);
      
      const multiStepForm = formInteractions.find(form => form.isMultiStep === true);
      expect(multiStepForm).toBeDefined();
      expect(multiStepForm?.stepCount).toBeGreaterThan(1);
    });

    it('should detect form validation requirements', async () => {
      // RED PHASE: Define form validation detection
      const validationElements: UIElement[] = [
        {
          id: 'email',
          tagName: 'input',
          attributes: { type: 'email', required: 'true' },
          locators: [],
          category: 'input'
        }
      ];

      const formInteractions = await userFlowDetector.mapFormInteractions(validationElements);
      
      expect(formInteractions[0]?.validationRules).toContain('email');
      expect(formInteractions[0]?.validationRules).toContain('required');
    });
  });

  describe('Critical Path Detection', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should identify critical user paths in application', async () => {
      // RED PHASE: Define critical path detection behavior
      const criticalPaths = await userFlowDetector.detectCriticalPaths(mockAnalysisResult);
      
      expect(criticalPaths).toHaveLength(2); // Login and Checkout typically critical
      expect(criticalPaths[0]?.priority).toBe('high');
      expect(criticalPaths[0]?.businessImpact).toBe('critical');
      expect(criticalPaths[0]?.userFrequency).toBeGreaterThan(0.5);
    });

    it('should calculate path complexity scores', async () => {
      // RED PHASE: Define complexity scoring behavior
      const criticalPaths = await userFlowDetector.detectCriticalPaths(mockAnalysisResult);
      
      const complexPath = criticalPaths.find(path => path.complexityScore > 0.7);
      expect(complexPath).toBeDefined();
      expect(complexPath?.stepCount).toBeGreaterThan(3);
    });

    it('should identify edge cases and alternative paths', async () => {
      // RED PHASE: Define edge case detection
      const criticalPaths = await userFlowDetector.detectCriticalPaths(mockAnalysisResult);
      
      const pathWithEdgeCases = criticalPaths.find(path => path.edgeCases.length > 0);
      expect(pathWithEdgeCases).toBeDefined();
      expect(pathWithEdgeCases?.edgeCases).toContain('error_handling');
      expect(pathWithEdgeCases?.alternativePaths).toHaveLength(2);
    });
  });

  describe('User Flow Diagram Generation', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should generate user flow diagrams in multiple formats', async () => {
      // RED PHASE: Define flow diagram generation behavior
      const flowDiagram = await userFlowDetector.generateFlowDiagram(mockAnalysisResult, {
        format: 'mermaid',
        includeEdgeCases: true,
        includeTimings: false
      });
      
      expect(flowDiagram.format).toBe('mermaid');
      expect(flowDiagram.content).toContain('graph TD');
      expect(flowDiagram.content).toContain('Login');
      expect(flowDiagram.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate JSON flow representations', async () => {
      // RED PHASE: Define JSON format generation
      const flowDiagram = await userFlowDetector.generateFlowDiagram(mockAnalysisResult, {
        format: 'json',
        includeEdgeCases: false,
        includeTimings: true
      });
      
      expect(flowDiagram.format).toBe('json');
      const jsonContent = JSON.parse(flowDiagram.content);
      expect(jsonContent.nodes).toBeDefined();
      expect(jsonContent.edges).toBeDefined();
      expect(jsonContent.timings).toBeDefined();
    });

    it('should include user journey documentation', async () => {
      // RED PHASE: Define documentation generation
      const documentation = await userFlowDetector.generateUserJourneyDocumentation(mockAnalysisResult);
      
      expect(documentation.title).toBe('User Journey Analysis Report');
      expect(documentation.sections).toHaveLength(4); // Overview, Journeys, Critical Paths, Recommendations
      expect(documentation.sections[0]?.title).toBe('Overview');
      expect(documentation.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Integration with WebAppAnalyzer', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should integrate seamlessly with WebAppAnalyzer analysis results', async () => {
      // RED PHASE: Define integration behavior
      mockWebAppAnalyzer.analyzeWebApp.mockResolvedValue(mockAnalysisResult);
      
      const completeAnalysis = await userFlowDetector.analyzeUserFlows('https://example.com', {
        analysisDepth: 'comprehensive',
        includeFormInteractions: true,
        includeCriticalPaths: true,
        generateDiagrams: true
      });
      
      expect(mockWebAppAnalyzer.analyzeWebApp).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(completeAnalysis.userJourneys).toBeDefined();
      expect(completeAnalysis.navigationFlows).toBeDefined();
      expect(completeAnalysis.criticalPaths).toBeDefined();
      expect(completeAnalysis.flowDiagrams).toBeDefined();
    });

    it('should handle WebAppAnalyzer errors gracefully', async () => {
      // RED PHASE: Define error handling behavior
      mockWebAppAnalyzer.analyzeWebApp.mockRejectedValue(new Error('Analysis failed'));
      
      await expect(userFlowDetector.analyzeUserFlows('https://example.com')).rejects.toThrow('User flow analysis failed: Analysis failed');
    });
  });

  describe('Configuration and Options', () => {
    it('should support configurable analysis depth', async () => {
      // RED PHASE: Define configuration options
      await userFlowDetector.init();
      
      const basicAnalysis = await userFlowDetector.identifyUserJourneys(mockAnalysisResult, { depth: 'basic' });
      const detailedAnalysis = await userFlowDetector.identifyUserJourneys(mockAnalysisResult, { depth: 'detailed' });
      
      expect(basicAnalysis.length).toBeLessThan(detailedAnalysis.length);
    });

    it('should support custom journey pattern recognition', async () => {
      // RED PHASE: Define custom pattern support
      await userFlowDetector.init();
      
      const customPatterns = {
        'customFlow': {
          triggers: ['custom-btn'],
          sequence: ['step1', 'step2', 'complete'],
          validation: (elements: UIElement[]) => elements.some(el => el.id === 'custom-btn')
        }
      };

      userFlowDetector.registerCustomPatterns(customPatterns);
      await userFlowDetector.identifyUserJourneys(mockAnalysisResult);
      
      // Should attempt to find custom patterns
      expect(userFlowDetector.customPatterns).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should handle malformed analysis results', async () => {
      // RED PHASE: Define error handling for bad data
      const malformedResult = { ...mockAnalysisResult, uiElements: null as any };
      
      await expect(userFlowDetector.identifyUserJourneys(malformedResult)).rejects.toThrow('Invalid analysis result format');
    });

    it('should handle timeout scenarios gracefully', async () => {
      // RED PHASE: Define timeout handling
      jest.useFakeTimers();
      
      const timeoutPromise = userFlowDetector.analyzeUserFlows('https://slow-site.com', { timeout: 100 });
      
      jest.advanceTimersByTime(150);
      
      await expect(timeoutPromise).rejects.toThrow('User flow analysis timeout');
    });

    it('should provide meaningful error messages for debugging', async () => {
      // RED PHASE: Define error message quality
      const invalidUrl = 'not-a-url';
      
      await expect(userFlowDetector.analyzeUserFlows(invalidUrl)).rejects.toThrow(/Invalid URL format/);
    });
  });

  describe('Performance and Memory Management', () => {
    beforeEach(async () => {
      await userFlowDetector.init();
    });

    it('should cleanup resources properly', async () => {
      // RED PHASE: Define cleanup behavior
      await userFlowDetector.cleanup();
      
      expect(userFlowDetector.isInitialized).toBe(false);
      expect(mockWebAppAnalyzer.cleanup).toHaveBeenCalled();
    });

    it('should handle large analysis results efficiently', async () => {
      // RED PHASE: Define performance requirements
      const largeResult = {
        ...mockAnalysisResult,
        uiElements: new Array(1000).fill(mockAnalysisResult.uiElements[0])
      };

      const startTime = Date.now();
      await userFlowDetector.identifyUserJourneys(largeResult);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
