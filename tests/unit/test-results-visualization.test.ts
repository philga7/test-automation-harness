/**
 * Unit tests for TestResultsVisualization
 * Following established testing patterns from the project:
 * - Uses actual ApiService component for real data flow testing
 * - Implements comprehensive DOM mocking with all required methods
 * - Follows TypeScript strict mode compliance with proper 'any' casting
 * - Uses test-friendly dependency injection patterns
 * - Systematic test organization with grouped test suites
 */

// Mock fetch globally for all tests
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock window object before importing modules
(global as any).window = {
  TestResultsVisualization: null
};

// Import the actual classes using require (JavaScript modules)
const { ApiService } = require('../../src/ui/public/js/api-service.js');
const TestResultsVisualization = require('../../src/ui/public/js/test-results.js');

describe('TestResultsVisualization', () => {
  let testResultsVisualization: any;
  let apiService: any;
  let mockDocument: any;
  let mockWindow: any;

  beforeEach(async () => {
    jest.useFakeTimers();
    
    // Set up default mock fetch response to prevent undefined responses
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, data: { results: [], pagination: {} } })
    }));
    
    // Use actual ApiService component (not mocks) for real data flow testing
    apiService = new ApiService({
      baseUrl: 'http://localhost:3000',
      timeout: 1000,
      retryAttempts: 1,
      enableLogging: false
    });

    // Comprehensive DOM mocking with all required methods
    mockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      createElement: jest.fn((tagName: string) => {
        const element: any = {
          id: '',
          className: '',
          textContent: '',
          innerHTML: '',
          tagName: tagName.toUpperCase(),
          style: {},
          dataset: {},
          attributes: {},
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          setAttribute: jest.fn((attr: string, value: string) => {
            element.attributes[attr] = value;
          }),
          getAttribute: jest.fn((attr: string) => {
            return element.attributes[attr] || null;
          }),
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          parentNode: null,
          classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn()
          },
          focus: jest.fn(),
          click: jest.fn(),
          querySelectorAll: jest.fn((selector: string) => {
            // Mock querySelectorAll for modal elements
            if (selector === '[data-action="close-modal"]') {
              return [
                { addEventListener: jest.fn() },
                { addEventListener: jest.fn() }
              ];
            }
            return [];
          }),
          querySelector: jest.fn((selector: string) => {
            // Mock querySelector for modal body
            if (selector === '.modal-body') {
              return {
                innerHTML: '',
                textContent: '',
                appendChild: jest.fn(),
                setAttribute: jest.fn(),
                getAttribute: jest.fn()
              };
            }
            return null;
          })
        };
        
        // Mock innerHTML setter to handle HTML escaping
        Object.defineProperty(element, 'innerHTML', {
          get: () => {
            // For div elements used in escapeHtml, return escaped text
            if (tagName === 'div' && element.textContent) {
              return element.textContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            }
            return element.textContent;
          },
          set: (value: string) => {
            element.textContent = value;
          }
        });
        
        return element;
      }),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        insertAdjacentHTML: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      hidden: false
    };

    // Mock window object with comprehensive methods
    mockWindow = {
      dashboard: null,
      testResults: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setInterval: jest.fn(() => 'interval_id' as any),
      clearInterval: jest.fn(),
      setTimeout: jest.fn(() => 'timeout_id' as any),
      clearTimeout: jest.fn(),
      fetch: mockFetch,
      AbortController: jest.fn().mockImplementation(() => ({
        signal: {},
        abort: jest.fn()
      })),
      confirm: jest.fn(() => true),
      alert: jest.fn(),
      location: {
        href: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: ''
      }
    };

    // Mock global objects with proper TypeScript casting
    (global as any).document = mockDocument;
    (global as any).window = mockWindow;

    // Mock FormData to avoid recursion issues
    const formDataValues = new Map([
      ['testName', 'E2E Test'],
      ['timeout', '300']
    ]);
    (global as any).FormData = jest.fn().mockImplementation(() => ({
      get: jest.fn((key: string) => formDataValues.get(key)),
      set: jest.fn(),
      append: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      entries: jest.fn(),
      keys: jest.fn(),
      values: jest.fn()
    }));

    // Use test-friendly initialization
    testResultsVisualization = new TestResultsVisualization(apiService, {
      autoInit: false,
      enableLogging: false,
      skipDOMInit: true,
      refreshInterval: 0 // Disable auto-refresh for testing
    });
    
    await testResultsVisualization.init();
    
    // Manually call setupFiltering since we skip DOM init
    testResultsVisualization.setupFiltering();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    
    if (testResultsVisualization) {
      testResultsVisualization.destroy();
    }
  });

  // ============================================================================
  // INITIALIZATION TESTS (3 tests)
  // ============================================================================
  
  describe('Initialization', () => {
    test('should initialize successfully with valid ApiService', async () => {
      expect(testResultsVisualization.isInitialized).toBe(true);
      expect(testResultsVisualization.apiService).toBe(apiService);
    });

    test('should handle initialization without ApiService gracefully', () => {
      const testViz = new TestResultsVisualization(null, {
        autoInit: false,
        enableLogging: false
      });
      
      expect(testViz.apiService).toBeNull();
    });

    test('should set up initial state correctly', () => {
      expect(testResultsVisualization.currentPage).toBe(1);
      expect(testResultsVisualization.results).toEqual([]);
      expect(testResultsVisualization.pagination).toEqual({});
      expect(testResultsVisualization.currentFilters).toBeDefined();
    });
  });

  // ============================================================================
  // FILTER MANAGEMENT TESTS (4 tests)
  // ============================================================================

  describe('Filter Management', () => {
    test('should initialize filters with default values', () => {
      expect(testResultsVisualization.currentFilters).toEqual({
        status: '',
        engine: '',
        testName: '',
        startDate: '',
        endDate: '',
        sort: 'desc',
        sortBy: 'startTime'
      });
    });

    test('should update individual filters correctly', () => {
      testResultsVisualization.updateFilter('status', 'passed');
      expect(testResultsVisualization.currentFilters.status).toBe('passed');
    });

    test('should reset to first page when filtering', () => {
      testResultsVisualization.currentPage = 5;
      testResultsVisualization.updateFilter('engine', 'playwright');
      expect(testResultsVisualization.currentPage).toBe(1);
    });

    test('should clear all filters correctly', () => {
      testResultsVisualization.currentFilters.status = 'failed';
      testResultsVisualization.currentFilters.engine = 'jest';
      testResultsVisualization.currentPage = 3;
      
      testResultsVisualization.handleClearFilters();
      
      expect(testResultsVisualization.currentFilters.status).toBe('');
      expect(testResultsVisualization.currentFilters.engine).toBe('');
      expect(testResultsVisualization.currentPage).toBe(1);
    });
  });

  // ============================================================================
  // DATA LOADING TESTS (5 tests)
  // ============================================================================

  describe('Data Loading', () => {
    beforeEach(() => {
      // Mock successful API response with comprehensive headers
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/v1/results')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
            json: async () => ({
              success: true,
              data: {
                results: [
                  {
                    testId: 'test_123',
                    name: 'Login Test',
                    status: 'passed',
                    engine: 'playwright',
                    startTime: '2025-01-06T15:30:00.000Z',
                    endTime: '2025-01-06T15:30:30.000Z',
                    duration: 30000,
                    results: { passed: 5, failed: 0, skipped: 0, total: 5 }
                  }
                ],
                pagination: {
                  page: 1,
                  limit: 10,
                  total: 1,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false
                }
              }
            })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
          json: async () => ({ success: true, data: {} })
        });
      });
    });

    test('should load test results successfully', async () => {
      await testResultsVisualization.loadTestResults();
      
      expect(testResultsVisualization.results).toHaveLength(1);
      expect(testResultsVisualization.results[0].testId).toBe('test_123');
      expect(testResultsVisualization.pagination.total).toBe(1);
    });

    test('should handle API errors gracefully', async () => {
      // Mock a proper network error with complete response structure
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Network error'), {
        name: 'TypeError',
        message: 'fetch: Network error'
      }));
      
      await expect(testResultsVisualization.loadTestResults()).rejects.toThrow();
    });

    test('should apply filters when loading results', async () => {
      testResultsVisualization.currentFilters.status = 'passed';
      testResultsVisualization.currentFilters.engine = 'playwright';
      
      await testResultsVisualization.loadTestResults();
      
      // Verify that fetch was called with filter parameters
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('status=passed');
      expect(fetchCall[0]).toContain('engine=playwright');
    });

    test('should handle empty results correctly', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
        json: async () => ({
          success: true,
          data: {
            results: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
          }
        })
      }));
      
      await testResultsVisualization.loadTestResults();
      
      expect(testResultsVisualization.results).toHaveLength(0);
    });

    test('should handle malformed API responses', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 400,
        headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
        json: async () => ({
          success: false,
          error: { message: 'Invalid request' }
        })
      }));
      
      await expect(testResultsVisualization.loadTestResults()).rejects.toThrow();
    });
  });

  // ============================================================================
  // RESULT CARD RENDERING TESTS (4 tests)
  // ============================================================================

  describe('Result Card Rendering', () => {
    const mockResult = {
      testId: 'test_123',
      name: 'Login Test',
      status: 'passed',
      engine: 'playwright',
      startTime: '2025-01-06T15:30:00.000Z',
      endTime: '2025-01-06T15:30:30.000Z',
      duration: 30000,
      results: { passed: 5, failed: 0, skipped: 0, total: 5 },
      artifacts: { screenshots: ['test.png'] },
      healingAttempts: [{ strategy: 'id-fallback', success: true }]
    };

    test('should create result card HTML correctly', () => {
      const cardHTML = testResultsVisualization.createResultCard(mockResult);
      
      expect(cardHTML).toContain('test_123');
      expect(cardHTML).toContain('Login Test');
      expect(cardHTML).toContain('playwright');
      expect(cardHTML).toContain('✅'); // Success icon
      expect(cardHTML).toContain('data-action="view-artifacts"');
      expect(cardHTML).toContain('data-action="view-healing"');
    });

    test('should handle different status types correctly', () => {
      const failedResult = { ...mockResult, status: 'failed' };
      const cardHTML = testResultsVisualization.createResultCard(failedResult);
      
      expect(cardHTML).toContain('❌'); // Failed icon
      expect(cardHTML).toContain('error');
    });

    test('should handle results without artifacts or healing', () => {
      const basicResult = {
        ...mockResult,
        artifacts: null,
        healingAttempts: null
      };
      const cardHTML = testResultsVisualization.createResultCard(basicResult);
      
      expect(cardHTML).not.toContain('data-action="view-artifacts"');
      expect(cardHTML).not.toContain('data-action="view-healing"');
    });

    test('should escape HTML in result data', () => {
      const maliciousResult = {
        ...mockResult,
        name: '<script>alert("xss")</script>',
        engine: '<img src=x onerror=alert(1)>'
      };
      const cardHTML = testResultsVisualization.createResultCard(maliciousResult);
      
      expect(cardHTML).not.toContain('<script>');
      expect(cardHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(cardHTML).toContain('&lt;script&gt;');
    });
  });

  // ============================================================================
  // PAGINATION TESTS (3 tests)
  // ============================================================================

  describe('Pagination', () => {
    test('should handle pagination correctly', async () => {
      testResultsVisualization.pagination = {
        page: 2,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
        total: 50
      };
      
      await testResultsVisualization.goToPage(3);
      
      expect(testResultsVisualization.currentPage).toBe(3);
    });

    test('should not navigate to invalid pages', async () => {
      testResultsVisualization.pagination = { totalPages: 3 };
      testResultsVisualization.currentPage = 2;
      
      await testResultsVisualization.goToPage(5);
      
      expect(testResultsVisualization.currentPage).toBe(2); // Should remain unchanged
    });

    test('should render pagination controls correctly', () => {
      const mockPaginationContainer = {
        innerHTML: '',
        querySelectorAll: jest.fn(() => [])
      };
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'results-pagination') return mockPaginationContainer;
        return null;
      });
      
      testResultsVisualization.pagination = {
        page: 2,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
        total: 25
      };
      
      testResultsVisualization.renderPagination();
      
      expect(mockPaginationContainer.innerHTML).toContain('page 2 of 3');
      expect(mockPaginationContainer.innerHTML).toContain('25 total results');
    });
  });

  // ============================================================================
  // MODAL FUNCTIONALITY TESTS (4 tests)
  // ============================================================================

  describe('Modal Functionality', () => {
    test('should create modal with correct structure', () => {
      const modal = testResultsVisualization.createModal('test-modal', 'Test Title');
      
      expect(modal.id).toBe('test-modal');
      expect(modal.className).toBe('modal');
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.innerHTML).toContain('Test Title');
    });

    test('should show test details modal', async () => {
      const mockTestData = {
        testId: 'test_123',
        name: 'Login Test',
        status: 'passed',
        engine: 'playwright',
        duration: 30000,
        startTime: '2025-01-06T15:30:00.000Z'
      };
      
      testResultsVisualization.showTestDetailsModal(mockTestData);
      
      // Verify modal creation was attempted
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    test('should show artifacts modal with screenshots', () => {
      const mockArtifacts = {
        screenshots: [
          { name: 'test.png', path: '/artifacts/test.png', timestamp: '2025-01-06T15:30:00.000Z' }
        ]
      };
      
      testResultsVisualization.showArtifactsModal(mockArtifacts, 'test_123');
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    test('should show healing modal with attempts', () => {
      const mockHealingAttempts = [
        {
          strategy: 'id-fallback',
          success: true,
          timestamp: '2025-01-06T15:30:00.000Z',
          originalLocator: '#old-id',
          healedLocator: '#new-id',
          confidence: 0.95
        }
      ];
      
      testResultsVisualization.showHealingModal(mockHealingAttempts, 'test_123');
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS TESTS (5 tests)
  // ============================================================================

  describe('Utility Functions', () => {
    test('should format duration correctly', () => {
      expect(testResultsVisualization.formatDuration(500)).toBe('500ms');
      expect(testResultsVisualization.formatDuration(5000)).toBe('5.0s');
      expect(testResultsVisualization.formatDuration(65000)).toBe('1m 5s');
      expect(testResultsVisualization.formatDuration(null)).toBe('N/A');
    });

    test('should format file size correctly', () => {
      expect(testResultsVisualization.formatFileSize(500)).toBe('500.0 B');
      expect(testResultsVisualization.formatFileSize(1024)).toBe('1.0 KB');
      expect(testResultsVisualization.formatFileSize(1048576)).toBe('1.0 MB');
      expect(testResultsVisualization.formatFileSize(null)).toBe('N/A');
    });

    test('should escape HTML correctly', () => {
      expect(testResultsVisualization.escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(testResultsVisualization.escapeHtml('Normal text')).toBe('Normal text');
      expect(testResultsVisualization.escapeHtml(123)).toBe(123);
    });

    test('should get correct status classes and icons', () => {
      expect(testResultsVisualization.getStatusClass('passed')).toBe('success');
      expect(testResultsVisualization.getStatusClass('failed')).toBe('error');
      expect(testResultsVisualization.getStatusIcon('passed')).toBe('✅');
      expect(testResultsVisualization.getStatusIcon('failed')).toBe('❌');
    });

    test('should format date time correctly', () => {
      const testDate = '2025-01-06T15:30:00.000Z';
      const formatted = testResultsVisualization.formatDateTime(testDate);
      
      expect(formatted).not.toBe('N/A');
      expect(formatted).toContain('2025');
      expect(testResultsVisualization.formatDateTime(null)).toBe('N/A');
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS (3 tests)
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle view test details errors gracefully', async () => {
      // Mock a proper network error
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Network error'), {
        name: 'TypeError',
        message: 'fetch: Network error'
      }));
      
      await testResultsVisualization.viewTestDetails('test_123');
      
      // Should not throw, should handle error gracefully
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    test('should handle missing DOM elements gracefully', () => {
      mockDocument.getElementById.mockReturnValue(null);
      
      // These should not throw errors
      testResultsVisualization.showLoadingState();
      testResultsVisualization.showEmptyState();
      testResultsVisualization.showErrorState('Test error');
      
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    test('should handle notification creation without errors', () => {
      testResultsVisualization.showNotification('Test message', 'success');
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TIMER AND CLEANUP TESTS (2 tests)
  // ============================================================================

  describe('Timer and Cleanup', () => {
    test('should start and stop auto-refresh correctly', () => {
      const testViz = new TestResultsVisualization(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true,
        refreshInterval: 5000
      });
      
      testViz.startAutoRefresh();
      expect(testViz.refreshTimer).toBeDefined();
      
      testViz.stopAutoRefresh();
      expect(testViz.refreshTimer).toBeNull();
    });

    test('should clean up resources on destroy', () => {
      testResultsVisualization.refreshTimer = 'mock_timer_id';
      testResultsVisualization.destroy();
      
      expect(testResultsVisualization.refreshTimer).toBeNull();
    });
  });
});
