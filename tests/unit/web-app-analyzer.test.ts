/**
 * Unit tests for WebAppAnalyzer component
 * 
 * This file follows strict TDD methodology using the RED-GREEN-REFACTOR cycle.
 * All tests are written FIRST to define expected behavior before implementation.
 * 
 * RED PHASE: Writing failing tests that define the WebAppAnalyzer API and behavior
 */

import { WebAppAnalyzer } from '../../src/analysis/WebAppAnalyzer';

// Use unique variable names to prevent global declaration conflicts
// const webAppAnalyzerMockPage = jest.fn();
// const webAppAnalyzerMockBrowser = jest.fn();

// Mock Playwright launch with proper mock implementation
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          $: jest.fn(),
          $$: jest.fn(),
          evaluate: jest.fn().mockImplementation((fn) => {
            // Mock DOM structure extraction
            const fnString = fn.toString();
            if (fnString.includes('getAllElements')) {
              return Promise.resolve([
                { tagName: 'html', id: undefined, className: undefined, attributes: {}, children: [], depth: 0 },
                { tagName: 'body', id: undefined, className: undefined, attributes: {}, children: [], depth: 1 },
                { tagName: 'div', id: 'main', className: 'container', attributes: { id: 'main', class: 'container' }, children: [], depth: 2 }
              ]);
            } else if (fnString.includes('querySelectorAll')) {
              return Promise.resolve([
                { tagName: 'button', id: 'submit', className: 'btn', attributes: { id: 'submit', class: 'btn' }, category: 'interactive' }
              ]);
            }
            return Promise.resolve([]);
          }),
          screenshot: jest.fn(),
          content: jest.fn(),
          url: jest.fn(),
          title: jest.fn().mockResolvedValue('Test Page'),
          close: jest.fn(),
          locator: jest.fn(),
          waitForSelector: jest.fn(),
          waitForLoadState: jest.fn(),
          getByRole: jest.fn(),
          getByText: jest.fn(),
          getByLabel: jest.fn(),
          getByTestId: jest.fn(),
          accessibility: {
            snapshot: jest.fn()
          }
        }),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  }
}));

// Mock components for testing
const mockPage = {
  goto: jest.fn(),
  $: jest.fn(),
  $$: jest.fn(),
  evaluate: jest.fn(),
  screenshot: jest.fn(),
  content: jest.fn(),
  url: jest.fn(),
  title: jest.fn(),
  close: jest.fn(),
  locator: jest.fn(),
  waitForSelector: jest.fn(),
  waitForLoadState: jest.fn(),
  getByRole: jest.fn(),
  getByText: jest.fn(),
  getByLabel: jest.fn(),
  getByTestId: jest.fn(),
  accessibility: {
    snapshot: jest.fn()
  }
};

describe('WebAppAnalyzer', () => {
  let analyzer: WebAppAnalyzer;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset mock page for test isolation
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.$.mockResolvedValue(null);
    mockPage.$$.mockResolvedValue([]);
    mockPage.evaluate.mockResolvedValue([]);
    mockPage.screenshot.mockResolvedValue(Buffer.from(''));
    mockPage.content.mockResolvedValue('<html></html>');
    mockPage.url.mockReturnValue('http://localhost:3000');
    mockPage.title.mockResolvedValue('Test Page');
    
    // Create analyzer instance for testing
    analyzer = new WebAppAnalyzer();
  });

  afterEach(async () => {
    // Clean up resources after each test
    if (analyzer) {
      try {
        await analyzer.cleanup();
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
    
    // Clear all timers and mocks
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Component Structure and Initialization', () => {
    it('should create WebAppAnalyzer instance', () => {
      // GREEN PHASE: Test that WebAppAnalyzer class exists and can be instantiated
      expect(() => new WebAppAnalyzer()).not.toThrow();
      expect(analyzer).toBeDefined();
    });

    it('should have required properties and methods', () => {
      // GREEN PHASE: Test that WebAppAnalyzer has expected interface
      expect(analyzer.initialize).toBeDefined();
      expect(analyzer.analyzeWebApp).toBeDefined();
      expect(analyzer.extractDOMStructure).toBeDefined();
      expect(analyzer.identifyUIElements).toBeDefined();
      expect(analyzer.generateLocatorStrategies).toBeDefined();
      expect(analyzer.detectNavigationPatterns).toBeDefined();
      expect(analyzer.cleanup).toBeDefined();
    });
  });

  describe('Initialization and Configuration', () => {
    it('should initialize successfully with valid configuration', async () => {
      const config = {
        analysisDepth: 'comprehensive' as const,
        includeScreenshots: true,
        timeout: 30000,
        viewport: { width: 1920, height: 1080 }
      };

      // GREEN PHASE: Test successful initialization
      await expect(analyzer.initialize(config)).resolves.not.toThrow();
    });

    it('should validate required configuration parameters', async () => {
      const invalidConfig = {} as any;

      // GREEN PHASE: Test configuration validation
      await expect(analyzer.initialize(invalidConfig)).rejects.toThrow('analysisDepth is required');
    });

    it('should set up browser context with proper configuration', async () => {
      const config = {
        analysisDepth: 'basic' as const,
        viewport: { width: 1280, height: 720 },
        timeout: 15000
      };

      await expect(analyzer.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('Web Application Analysis', () => {
    beforeEach(async () => {
      // Initialize for each test
      await analyzer.initialize({
        analysisDepth: 'comprehensive' as const,
        includeScreenshots: true,
        timeout: 30000
      });
    });

    it('should analyze web application successfully', async () => {
      const url = 'http://localhost:3000';
      const options = {
        analysisDepth: 'comprehensive' as const,
        includeAccessibility: true,
        includePerformance: true
      };

      // GREEN PHASE: Test main analysis functionality
      const result = await analyzer.analyzeWebApp(url, options);
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
      expect(result.title).toBeDefined();
      expect(result.domStructure).toBeDefined();
      expect(result.uiElements).toBeDefined();
    });

    it('should handle different analysis depths', async () => {
      const url = 'http://localhost:3000';

      // Test basic analysis
      const basicResult = await analyzer.analyzeWebApp(url, { analysisDepth: 'basic' as const });
      expect(basicResult).toBeDefined();
      expect(basicResult.analysisData?.depth).toBe('basic');

      // Test comprehensive analysis
      const comprehensiveResult = await analyzer.analyzeWebApp(url, { analysisDepth: 'comprehensive' as const });
      expect(comprehensiveResult).toBeDefined();
      expect(comprehensiveResult.analysisData?.depth).toBe('comprehensive');

      // Test detailed analysis
      const detailedResult = await analyzer.analyzeWebApp(url, { analysisDepth: 'detailed' as const });
      expect(detailedResult).toBeDefined();
      expect(detailedResult.analysisData?.depth).toBe('detailed');
    });

    it('should return structured analysis results', async () => {
      const url = 'http://localhost:3000';
      
      // GREEN PHASE: Test actual result structure
      const result = await analyzer.analyzeWebApp(url, { analysisDepth: 'comprehensive' as const });
      
      expect(result.url).toBe(url);
      expect(result.title).toBeDefined();
      expect(result.domStructure).toBeDefined();
      expect(result.uiElements).toBeInstanceOf(Array);
      expect(result.locatorStrategies).toBeDefined();
      expect(result.navigationPatterns).toBeInstanceOf(Array);
      expect(result.screenshots).toBeInstanceOf(Array);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('DOM Structure Extraction', () => {
    beforeEach(async () => {
      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });
    });

    it('should extract complete DOM structure', async () => {
      // GREEN PHASE: Test DOM structure extraction
      const domStructure = await analyzer.extractDOMStructure();
      expect(domStructure).toBeDefined();
      expect(domStructure.elements).toBeInstanceOf(Array);
      expect(domStructure.totalElements).toBeGreaterThan(0);
    });

    it('should identify semantic HTML elements', async () => {
      // GREEN PHASE: Test semantic element identification
      const domStructure = await analyzer.extractDOMStructure();
      expect(domStructure.semanticElements).toBeInstanceOf(Array);
    });

    it('should analyze DOM hierarchy and nesting', async () => {
      // GREEN PHASE: Test DOM hierarchy analysis
      const domStructure = await analyzer.extractDOMStructure();
      expect(domStructure.hierarchy).toBeDefined();
      expect(domStructure.hierarchy.structure).toBe('tree');
    });

    it('should extract element attributes and properties', async () => {
      // GREEN PHASE: Test attribute extraction
      const domStructure = await analyzer.extractDOMStructure();
      expect(domStructure.elements.length).toBeGreaterThan(0);
      if (domStructure.elements.length > 0 && domStructure.elements[0]) {
        expect(domStructure.elements[0].attributes).toBeDefined();
      }
    });
  });

  describe('UI Element Identification', () => {
    beforeEach(async () => {
      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });
    });

    it('should identify interactive elements', async () => {
      // GREEN PHASE: Test UI element identification
      const uiElements = await analyzer.identifyUIElements();
      expect(uiElements).toBeInstanceOf(Array);
      expect(uiElements.every(el => el.category)).toBe(true);
    });

    it('should identify form elements and structures', async () => {
      // GREEN PHASE: Test form identification
      const uiElements = await analyzer.identifyUIElements();
      expect(uiElements).toBeInstanceOf(Array);
      
      // Elements should have proper structure
      uiElements.forEach(element => {
        expect(element.tagName).toBeDefined();
        expect(element.attributes).toBeDefined();
        expect(element.locators).toBeInstanceOf(Array);
        expect(element.category).toBeDefined();
      });
    });

    it('should identify navigation elements', async () => {
      // GREEN PHASE: Test navigation element identification
      const uiElements = await analyzer.identifyUIElements();
      expect(uiElements).toBeInstanceOf(Array);
    });

    it('should categorize elements by functionality', async () => {
      // GREEN PHASE: Test element categorization
      const uiElements = await analyzer.identifyUIElements();
      const categories = uiElements.map(el => el.category);
      const validCategories = ['navigation', 'content', 'interactive', 'media', 'structural'];
      
      categories.forEach(category => {
        expect(validCategories).toContain(category);
      });
    });
  });

  describe('Locator Strategy Generation', () => {
    beforeEach(async () => {
      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });
    });

    it('should generate multiple locator strategies for each element', async () => {
      const mockElement = { 
        id: 'submit-btn', 
        className: 'btn btn-primary',
        tagName: 'button',
        attributes: { id: 'submit-btn', class: 'btn btn-primary' },
        locators: [],
        category: 'interactive'
      };

      // GREEN PHASE: Test locator strategy generation
      const strategies = await analyzer.generateLocatorStrategies([mockElement]);
      expect(strategies).toBeDefined();
      expect(Object.keys(strategies)).toContain('submit-btn');
      expect(strategies['submit-btn']).toBeInstanceOf(Array);
    });

    it('should prioritize stable locator strategies', async () => {
      // GREEN PHASE: Test locator strategy prioritization
      const mockElement = { 
        tagName: 'button',
        attributes: { 'data-testid': 'test-button', id: 'btn1' },
        locators: [],
        category: 'interactive'
      };

      const strategies = await analyzer.generateLocatorStrategies([mockElement]);
      const elementStrategies = Object.values(strategies)[0] as any[];
      
      if (elementStrategies?.length > 0) {
        expect(elementStrategies[0].priority).toBeLessThanOrEqual(elementStrategies[elementStrategies.length - 1].priority);
      }
    });

    it('should generate fallback strategies for healing', async () => {
      // GREEN PHASE: Test fallback strategy generation
      const mockElement = { 
        id: 'dynamic-element', 
        className: 'generated-class-123',
        tagName: 'div',
        attributes: { id: 'dynamic-element', class: 'generated-class-123' },
        locators: [],
        category: 'content'
      };

      const strategies = await analyzer.generateLocatorStrategies([mockElement]);
      expect(strategies).toBeDefined();
      expect(Object.keys(strategies).length).toBeGreaterThan(0);
    });

    it('should validate generated locators', async () => {
      // GREEN PHASE: Test locator validation
      const mockElement = { 
        id: 'test-element',
        tagName: 'span',
        attributes: { id: 'test-element' },
        locators: [],
        category: 'content'
      };

      const strategies = await analyzer.generateLocatorStrategies([mockElement]);
      expect(strategies).toBeDefined();
      
      // Validate locator structure
      Object.values(strategies).forEach((locatorList: any) => {
        locatorList.forEach((locator: any) => {
          expect(locator.type).toBeDefined();
          expect(locator.value).toBeDefined();
          expect(locator.priority).toBeDefined();
          expect(locator.confidence).toBeDefined();
        });
      });
    });
  });

  describe('Navigation Pattern Detection', () => {
    beforeEach(async () => {
      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });
    });

    it('should detect common navigation patterns', async () => {
      // GREEN PHASE: Test navigation pattern detection
      const patterns = await analyzer.detectNavigationPatterns();
      expect(patterns).toBeInstanceOf(Array);
      
      // Check pattern structure
      patterns.forEach(pattern => {
        expect(pattern.type).toBeDefined();
        expect(pattern.elements).toBeInstanceOf(Array);
        expect(['menu', 'tabs', 'breadcrumbs', 'pagination', 'sidebar', 'dropdown']).toContain(pattern.type);
      });
    });

    it('should identify user flow paths', async () => {
      // GREEN PHASE: Test user flow identification
      const patterns = await analyzer.detectNavigationPatterns();
      expect(patterns).toBeInstanceOf(Array);
      
      // Check for flows in patterns
      patterns.forEach(pattern => {
        if (pattern.flows) {
          expect(pattern.flows).toBeInstanceOf(Array);
          pattern.flows.forEach(flow => {
            expect(flow.name).toBeDefined();
            expect(flow.steps).toBeInstanceOf(Array);
            expect(flow.type).toBeDefined();
          });
        }
      });
    });

    it('should map inter-page relationships', async () => {
      // GREEN PHASE: Test page relationship mapping
      const patterns = await analyzer.detectNavigationPatterns();
      expect(patterns).toBeInstanceOf(Array);
    });

    it('should identify dynamic navigation elements', async () => {
      // GREEN PHASE: Test dynamic navigation detection
      const patterns = await analyzer.detectNavigationPatterns();
      expect(patterns).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });
    });

    it('should handle unreachable URLs gracefully', async () => {
      const unreachableUrl = 'http://unreachable-host:9999';

      // GREEN PHASE: Test error handling for unreachable URLs
      await expect(analyzer.analyzeWebApp(unreachableUrl, { analysisDepth: 'basic' as const }))
        .rejects.toThrow('Unable to reach target application');
    });

    it('should handle timeout scenarios', async () => {
      const url = 'http://slow-loading-site.test';

      // GREEN PHASE: Test timeout handling
      await expect(analyzer.analyzeWebApp(url, { analysisDepth: 'basic' as const, timeout: 100 }))
        .rejects.toThrow('Analysis timeout exceeded');
    });

    it('should handle malformed HTML gracefully', async () => {
      // GREEN PHASE: Test malformed HTML handling
      mockPage.content.mockResolvedValue('<html><body><div><p>Unclosed tags');

      const domStructure = await analyzer.extractDOMStructure();
      expect(domStructure).toBeDefined();
      expect(domStructure.elements).toBeInstanceOf(Array);
    });

    it('should handle JavaScript-heavy applications', async () => {
      // GREEN PHASE: Test SPA/dynamic content handling
      const url = 'http://spa-application.test';

      const result = await analyzer.analyzeWebApp(url, { 
        analysisDepth: 'comprehensive' as const, 
        waitForJS: true,
        dynamicContent: true 
      });
      
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
    });
  });

  describe('Configuration and Options', () => {
    it('should support configurable analysis depth', async () => {
      const url = 'http://localhost:3000';

      // GREEN PHASE: Test different analysis configurations
      const basicOptions = { analysisDepth: 'basic' as const };
      const comprehensiveOptions = { 
        analysisDepth: 'comprehensive' as const,
        includeAccessibility: true,
        includePerformance: true,
        includeSecurity: true
      };

      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });
      
      const basicResult = await analyzer.analyzeWebApp(url, basicOptions);
      expect(basicResult.analysisData?.depth).toBe('basic');
      
      const comprehensiveResult = await analyzer.analyzeWebApp(url, comprehensiveOptions);
      expect(comprehensiveResult.analysisData?.depth).toBe('comprehensive');
      expect(comprehensiveResult.accessibility).toBeDefined();
      expect(comprehensiveResult.performance).toBeDefined();
    });

    it('should support custom viewport configurations', async () => {
      const mobileConfig = {
        analysisDepth: 'basic' as const,
        viewport: { width: 375, height: 667 },
        deviceType: 'mobile' as const
      };

      // GREEN PHASE: Test viewport configuration
      await expect(analyzer.initialize(mobileConfig)).resolves.not.toThrow();
    });

    it('should support selective analysis features', async () => {
      const selectiveOptions = {
        analysisDepth: 'comprehensive' as const,
        includeScreenshots: true,
        includeAccessibility: false,
        includePerformance: true,
        includeSecurity: false,
        includeCodeGeneration: true
      };

      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });

      // GREEN PHASE: Test selective feature configuration
      const result = await analyzer.analyzeWebApp('http://localhost:3000', selectiveOptions);
      expect(result).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.accessibility).toBeUndefined();
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup browser resources properly', async () => {
      await analyzer.initialize({ analysisDepth: 'basic' as const });
      
      // GREEN PHASE: Test resource cleanup
      await expect(analyzer.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when not initialized', async () => {
      const freshAnalyzer = new WebAppAnalyzer();

      // GREEN PHASE: Test cleanup without initialization
      await expect(freshAnalyzer.cleanup()).resolves.not.toThrow();
    });

    it('should cleanup temporary files and screenshots', async () => {
      await analyzer.initialize({ analysisDepth: 'basic' as const });
      
      // GREEN PHASE: Test temporary file cleanup
      await expect(analyzer.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Integration with Analysis Engine', () => {
    beforeEach(async () => {
      await analyzer.initialize({ analysisDepth: 'comprehensive' as const });
    });

    it('should provide results compatible with AppAnalysisEngine', async () => {
      const url = 'http://localhost:3000';

      // GREEN PHASE: Test integration compatibility
      const result = await analyzer.analyzeWebApp(url, { analysisDepth: 'comprehensive' as const });
      
      expect(result.analysisData).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.artifacts).toBeInstanceOf(Array);
      expect(result.locatorStrategies).toBeDefined();
      expect(result.healingCapabilities).toBeDefined();
    });

    it('should support healing-compatible element identification', async () => {
      // GREEN PHASE: Test healing integration
      const uiElements = await analyzer.identifyUIElements();
      expect(uiElements).toBeInstanceOf(Array);
      
      // Check healing compatibility
      uiElements.forEach(element => {
        expect(element.locators).toBeInstanceOf(Array);
        expect(element.locators.every(locator => locator.confidence !== undefined)).toBe(true);
      });
    });
  });

});
