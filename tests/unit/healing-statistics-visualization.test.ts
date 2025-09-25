/**
 * Unit tests for HealingStatisticsVisualization
 * Following established testing patterns from the project:
 * - Uses actual ApiService component for real data flow testing
 * - Implements comprehensive DOM mocking with all required methods
 * - Follows TypeScript strict mode compliance with proper 'any' casting
 * - Uses test-friendly dependency injection patterns
 * - Systematic test organization with grouped test suites
 * - Uses unique variable names to prevent global declaration conflicts
 */

// Mock fetch globally for all tests with unique variable name
const healingStatsMockFetch = jest.fn();
(global as any).fetch = healingStatsMockFetch;

// Mock Chart.js library
const mockChartJs = {
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    data: { datasets: [] },
    options: {}
  }))
};
(global as any).Chart = mockChartJs.Chart;

// Mock window object before importing modules
(global as any).window = {
  HealingStatisticsVisualization: null
};

// Import the actual classes using require (JavaScript modules)
const { ApiService: HealingStatsApiService } = require('../../src/ui/public/js/api-service.js');

describe('HealingStatisticsVisualization', () => {
  let healingStatsVisualization: any;
  let healingStatsApiService: any;
  let healingStatsMockDocument: any;
  let healingStatsMockWindow: any;

  beforeEach(async () => {
    jest.useFakeTimers();
    
    // Set up default mock fetch response to prevent undefined responses
    healingStatsMockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
      json: async () => ({ 
        success: true, 
        data: { 
          total: 0, 
          successful: 0, 
          failed: 0, 
          successRate: 0,
          strategyStats: {}
        } 
      })
    }));
    
    // Use actual ApiService component (not mocks) for real data flow testing
    healingStatsApiService = new HealingStatsApiService({
      baseUrl: 'http://localhost:3000',
      timeout: 1000,
      retryAttempts: 1,
      enableLogging: false
    });

    // Comprehensive DOM mocking with all required methods
    healingStatsMockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      createElement: jest.fn(() => ({
        className: '',
        textContent: '',
        innerHTML: '',
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        insertAdjacentHTML: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn(),
          contains: jest.fn(() => false)
        }
      })),
      body: {
        appendChild: jest.fn(),
        insertAdjacentHTML: jest.fn()
      }
    };

    healingStatsMockWindow = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setTimeout: jest.fn((fn, delay) => setTimeout(fn, delay)),
      clearTimeout: jest.fn(),
      setInterval: jest.fn((fn, delay) => setInterval(fn, delay)),
      clearInterval: jest.fn(),
      location: { href: 'http://localhost:3000' }
    };

    // Mock global objects with proper TypeScript casting
    (global as any).document = healingStatsMockDocument;
    (global as any).window = healingStatsMockWindow;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    
    if (healingStatsVisualization && healingStatsVisualization.destroy) {
      healingStatsVisualization.destroy();
    }
  });

  describe('Class Initialization', () => {
    test('should initialize HealingStatisticsVisualization class successfully', () => {
      // GREEN PHASE: Now that implementation exists, test should pass
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      expect(HealingStatisticsVisualization).toBeDefined();
    });

    test('should accept apiService and options parameters in constructor', () => {
      // GREEN PHASE: Test constructor with proper parameters
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      expect(instance).toBeDefined();
    });

    test('should have required properties after initialization', () => {
      // GREEN PHASE: Test that required properties exist
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, {
        autoInit: false,
        enableLogging: false
      });
      
      expect(instance.apiService).toBeDefined();
      expect(instance.options).toBeDefined();
      expect(instance.isInitialized).toBe(false);
      expect(instance.charts).toBeDefined();
    });
  });

  describe('API Data Fetching', () => {
    test('should have method to fetch healing statistics', () => {
      // GREEN PHASE: Test that the method exists
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      expect(typeof instance.loadHealingStatistics).toBe('function');
    });

    test('should fetch statistics using ApiService getHealingStatistics method', async () => {
      // GREEN PHASE: Test API integration with mock
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      // Mock the ApiService method
      healingStatsApiService.getHealingStatistics = jest.fn().mockResolvedValue({
        success: true,
        data: {
          total: 100,
          successful: 75,
          failed: 25,
          successRate: 75.0,
          avgConfidence: 0.85,
          strategyStats: {
            'locator-healing': { total: 50, successful: 40, successRate: 80 },
            'timeout-recovery': { total: 30, successful: 20, successRate: 66.67 }
          }
        }
      });

      const result = await instance.loadHealingStatistics();
      
      expect(healingStatsApiService.getHealingStatistics).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.total).toBe(100);
    });

    test('should handle API errors gracefully', async () => {
      // GREEN PHASE: Test error handling
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      // Mock API error
      healingStatsApiService.getHealingStatistics = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(instance.loadHealingStatistics()).rejects.toThrow('API Error');
    });
  });

  describe('Chart Rendering', () => {
    test('should have method to render success rate chart', () => {
      // GREEN PHASE: Test that chart rendering method exists
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      expect(typeof instance.renderSuccessRateChart).toBe('function');
    });

    test('should have method to render strategy breakdown chart', () => {
      // GREEN PHASE: Test that strategy chart method exists
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      expect(typeof instance.renderStrategyBreakdownChart).toBe('function');
    });

    test('should create Chart.js instances for visualizations', () => {
      // GREEN PHASE: Test Chart.js integration
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      const mockCanvas = { getContext: jest.fn(() => ({})) };
      healingStatsMockDocument.getElementById.mockReturnValue(mockCanvas);
      
      instance.renderSuccessRateChart({
        total: 100,
        successful: 75,
        failed: 25,
        successRate: 75.0
      });
      
      expect(mockChartJs.Chart).toHaveBeenCalled();
    });
  });

  describe('Metrics Display', () => {
    test('should have method to update healing metrics display', () => {
      // GREEN PHASE: Test that metrics display method exists
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      expect(typeof instance.updateHealingMetrics).toBe('function');
    });

    test('should update DOM elements with healing statistics', () => {
      // GREEN PHASE: Test DOM updates
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      const mockElements: { [key: string]: { textContent: string } } = {
        'total-healing-actions': { textContent: '' },
        'successful-healing': { textContent: '' },
        'failed-healing': { textContent: '' },
        'healing-success-rate': { textContent: '' }
      };
      
      healingStatsMockDocument.getElementById.mockImplementation((id: string) => mockElements[id] || null);
      
      instance.updateHealingMetrics({
        total: 100,
        successful: 75,
        failed: 25,
        successRate: 75.0
      });
      
      expect(healingStatsMockDocument.getElementById).toHaveBeenCalledWith('total-healing-actions');
      expect(mockElements['total-healing-actions']!.textContent).toBe('100');
      expect(mockElements['successful-healing']!.textContent).toBe('75');
      expect(mockElements['failed-healing']!.textContent).toBe('25');
    });
  });

  describe('Real-time Updates', () => {
    test('should have auto-refresh functionality', () => {
      // GREEN PHASE: Test that auto-refresh methods exist
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      expect(typeof instance.startAutoRefresh).toBe('function');
      expect(typeof instance.stopAutoRefresh).toBe('function');
    });

    test('should start/stop auto-refresh timers properly', () => {
      // GREEN PHASE: Test timer management - simplified test
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      // Test that starting auto-refresh creates a timer
      instance.startAutoRefresh();
      expect(instance.refreshTimer).not.toBeNull();
      
      // Test that stopping auto-refresh clears the timer
      instance.stopAutoRefresh();
      expect(instance.refreshTimer).toBeNull();
      
      // Verify the methods exist and work
      expect(typeof instance.startAutoRefresh).toBe('function');
      expect(typeof instance.stopAutoRefresh).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      // GREEN PHASE: Test error handling for missing DOM elements
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      healingStatsMockDocument.getElementById.mockReturnValue(null);
      
      // Should not throw error when DOM elements are missing
      expect(() => {
        instance.updateHealingMetrics({ total: 100, successful: 75, failed: 25 });
      }).not.toThrow();
    });

    test('should provide user feedback for errors', () => {
      // GREEN PHASE: Test user feedback functionality
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      expect(typeof instance.showNotification).toBe('function');
    });
  });

  describe('Cleanup and Memory Management', () => {
    test('should have destroy method for proper cleanup', () => {
      // GREEN PHASE: Test that destroy method exists
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      expect(typeof instance.destroy).toBe('function');
    });

    test('should cleanup charts and timers on destroy', () => {
      // GREEN PHASE: Test cleanup functionality
      const HealingStatisticsVisualization = require('../../src/ui/public/js/healing-stats.js');
      const instance = new HealingStatisticsVisualization(healingStatsApiService, { autoInit: false });
      
      // Mock chart instance
      const mockChart = { destroy: jest.fn() };
      instance.charts = { successRate: mockChart, strategyBreakdown: mockChart };
      
      // Start refresh to have something to clean up
      instance.refreshTimer = 123;
      
      instance.destroy();
      
      expect(mockChart.destroy).toHaveBeenCalledTimes(2);
      expect(instance.isInitialized).toBe(false);
    });
  });
});
