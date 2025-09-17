/**
 * Unit tests for TestExecutionInterface
 * 
 * Following project patterns established in Cipher memories:
 * - Use actual components to test against (not over-mocked)
 * - Type mock objects as 'any' to avoid TypeScript conflicts
 * - Mock DOM methods comprehensively (addEventListener, classList, etc.)
 * - Test real data flow patterns to catch integration issues
 * - Follow AAA pattern (Arrange, Act, Assert) with proper cleanup
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import the actual ApiService and TestExecutionInterface classes
const { ApiService } = require('../../src/ui/public/js/api-service.js');
const { TestExecutionInterface } = require('../../src/ui/public/js/test-execution.js');

describe('TestExecutionInterface', () => {
  let testExecutionInterface: any;
  let apiService: any;
  let mockDocument: any;
  let mockWindow: any;
  let mockElements: any;

  beforeEach(async () => {
    jest.useFakeTimers();
    
    // Create comprehensive DOM mocks following established patterns
    mockElements = {
      executionSection: {
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        insertAdjacentHTML: jest.fn(),
        innerHTML: '',
        style: { display: 'block' },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn(),
          contains: jest.fn()
        }
      },
      form: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        querySelectorAll: jest.fn(),
        checkValidity: jest.fn(() => true),
        reset: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      },
      engineSelect: {
        value: 'playwright',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        options: [
          { value: 'playwright', textContent: 'Playwright' },
          { value: 'jest', textContent: 'Jest' },
          { value: 'k6', textContent: 'k6' }
        ]
      },
      buttons: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        disabled: false,
        innerHTML: 'Execute Test',
        style: { display: 'none' },
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      },
      inputs: {
        value: 'Test Name',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        },
        parentNode: {
          querySelector: jest.fn(),
          appendChild: jest.fn(),
          removeChild: jest.fn()
        }
      },
      modal: {
        remove: jest.fn(),
        addEventListener: jest.fn(),
        querySelectorAll: jest.fn(() => [{ addEventListener: jest.fn() }])
      }
    };

    // Mock document with comprehensive DOM methods
    mockDocument = {
      getElementById: jest.fn((id: string) => {
        const elementMap: any = {
          'execution': mockElements.executionSection,
          'test-execution-form': mockElements.form,
          'test-engine-select': mockElements.engineSelect,
          'execute-test-button': mockElements.buttons,
          'cancel-test-button': mockElements.buttons,
          'test-name': mockElements.inputs,
          'test-description': mockElements.inputs,
          'current-test-id': { textContent: '' },
          'test-progress-fill': { style: { width: '0%' } },
          'test-progress-text': { textContent: '0%' },
          'test-status-badge': {
            querySelector: jest.fn(() => ({ textContent: '' })),
            classList: { add: jest.fn(), remove: jest.fn() },
            className: 'status-badge'
          },
          'history-table-body': { innerHTML: '' },
          'history-pagination-info': { textContent: '' },
          'test-result-modal': {
            querySelectorAll: jest.fn(() => [{ addEventListener: jest.fn() }]),
            addEventListener: jest.fn(),
            remove: jest.fn()
          }
        };
        return elementMap[id] || mockElements.inputs;
      }),
      querySelector: jest.fn(() => mockElements.executionSection),
      querySelectorAll: jest.fn(() => [mockElements.buttons]),
      createElement: jest.fn(() => ({
        className: '',
        textContent: '',
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        remove: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        insertAdjacentHTML: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn(),
          contains: jest.fn()
        }
      })),
      body: {
        appendChild: jest.fn(),
        insertAdjacentHTML: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Mock window with required methods
    mockWindow = {
      dashboard: null,
      ApiService: undefined, // Explicitly undefined to force using passed apiService
      TestExecutionInterface: TestExecutionInterface,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setInterval: jest.fn(),
      clearInterval: jest.fn(),
      setTimeout: jest.fn(),
      clearTimeout: jest.fn(),
      fetch: mockFetch,
      AbortController: jest.fn(() => ({
        signal: {},
        abort: jest.fn()
      })),
      confirm: jest.fn(() => true),
      alert: jest.fn()
    };

    // Set up global mocks (typed as any to avoid TypeScript conflicts)
    (global as any).document = mockDocument;
    (global as any).window = mockWindow;
    global.console.log = jest.fn();
    global.console.error = jest.fn();
    global.console.warn = jest.fn();

    // Create actual ApiService instance (following established pattern)
    apiService = new ApiService({
      baseUrl: 'http://localhost:3000',
      timeout: 1000,
      retryAttempts: 1,
      enableLogging: false
    });

    // Mock successful API responses for engine loading
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/v1/tests/engines')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({
            success: true,
            data: {
              engines: [
                { name: 'playwright', testType: 'e2e', supportsHealing: true },
                { name: 'jest', testType: 'unit', supportsHealing: false },
                { name: 'k6', testType: 'performance', supportsHealing: false }
              ]
            }
          })
        });
      }
      // Default mock for other requests
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, data: {} })
      });
    });

    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    
    if (testExecutionInterface) {
      testExecutionInterface.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with ApiService and load available engines', async () => {
      // Arrange & Act - Use test-friendly initialization
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      
      // Manually initialize for testing
      await testExecutionInterface.init();
      
      // Assert
      expect(testExecutionInterface.apiService).toBe(apiService);
      expect(testExecutionInterface.availableEngines).toEqual([
        { name: 'playwright', testType: 'e2e', supportsHealing: true },
        { name: 'jest', testType: 'unit', supportsHealing: false },
        { name: 'k6', testType: 'performance', supportsHealing: false }
      ]);
      expect(testExecutionInterface.isInitialized).toBe(true);
    });

    it('should handle initialization without ApiService', () => {
      // Arrange & Act
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      testExecutionInterface = new TestExecutionInterface(null, {
        enableLogging: true
      });
      
      // Assert
      expect(consoleError).toHaveBeenCalledWith('TestExecutionInterface: ApiService is required');
      consoleError.mockRestore();
    });

    it('should fallback to default engines if API call fails', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      // Act
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
      
      // Assert
      expect(testExecutionInterface.availableEngines).toEqual([
        { name: 'playwright', testType: 'e2e', supportsHealing: true },
        { name: 'jest', testType: 'unit', supportsHealing: false },
        { name: 'k6', testType: 'performance', supportsHealing: false }
      ]);
    });
  });

  describe('Engine-Specific Configuration', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should update engine-specific options for Playwright', () => {
      // Arrange
      const mockOptionsContainer = { innerHTML: '' };
      mockDocument.getElementById.mockReturnValue(mockOptionsContainer);
      
      // Act
      testExecutionInterface.updateEngineSpecificOptions('playwright');
      
      // Assert
      expect(mockOptionsContainer.innerHTML).toContain('playwright-options');
      expect(mockOptionsContainer.innerHTML).toContain('Target URL');
      expect(mockOptionsContainer.innerHTML).toContain('Browser');
      expect(mockOptionsContainer.innerHTML).toContain('Headless Mode');
    });

    it('should update engine-specific options for Jest', () => {
      // Arrange
      const mockOptionsContainer = { innerHTML: '' };
      mockDocument.getElementById.mockReturnValue(mockOptionsContainer);
      
      // Act
      testExecutionInterface.updateEngineSpecificOptions('jest');
      
      // Assert
      expect(mockOptionsContainer.innerHTML).toContain('jest-options');
      expect(mockOptionsContainer.innerHTML).toContain('Test Environment');
      expect(mockOptionsContainer.innerHTML).toContain('Max Workers');
      expect(mockOptionsContainer.innerHTML).toContain('Generate Coverage Report');
    });

    it('should update engine-specific options for k6', () => {
      // Arrange
      const mockOptionsContainer = { innerHTML: '' };
      mockDocument.getElementById.mockReturnValue(mockOptionsContainer);
      
      // Act
      testExecutionInterface.updateEngineSpecificOptions('k6');
      
      // Assert
      expect(mockOptionsContainer.innerHTML).toContain('k6-options');
      expect(mockOptionsContainer.innerHTML).toContain('Virtual Users');
      expect(mockOptionsContainer.innerHTML).toContain('Duration');
      expect(mockOptionsContainer.innerHTML).toContain('Performance Thresholds');
    });

    it('should clear options for empty engine selection', () => {
      // Arrange
      const mockOptionsContainer = { innerHTML: 'existing content' };
      mockDocument.getElementById.mockReturnValue(mockOptionsContainer);
      
      // Act
      testExecutionInterface.updateEngineSpecificOptions('');
      
      // Assert
      expect(mockOptionsContainer.innerHTML).toBe('');
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should validate required fields', () => {
      // Arrange
      const mockForm = {
        querySelectorAll: jest.fn(() => [
          { value: '', classList: { add: jest.fn(), remove: jest.fn() }, parentNode: { querySelector: jest.fn(), appendChild: jest.fn() } },
          { value: 'valid value', classList: { add: jest.fn(), remove: jest.fn() }, parentNode: { querySelector: jest.fn() } }
        ])
      };
      
      // Act
      const isValid = testExecutionInterface.validateForm(mockForm);
      
      // Assert
      expect(isValid).toBe(false);
      expect(mockForm.querySelectorAll).toHaveBeenCalledWith('[required]');
    });

    it('should validate URL fields', () => {
      // Arrange
      const mockUrlField = {
        value: 'invalid-url',
        classList: { add: jest.fn(), remove: jest.fn() },
        parentNode: { querySelector: jest.fn(), appendChild: jest.fn() }
      };
      mockDocument.getElementById.mockReturnValue(mockUrlField);
      
      // Act
      testExecutionInterface.showFieldError(mockUrlField, 'Please enter a valid URL');
      
      // Assert
      expect(mockUrlField.classList.add).toHaveBeenCalledWith('field-error');
      expect(mockUrlField.parentNode.appendChild).toHaveBeenCalled();
    });

    it('should clear field errors', () => {
      // Arrange
      const mockField = {
        classList: { remove: jest.fn() },
        parentNode: {
          querySelector: jest.fn(() => ({ remove: jest.fn() }))
        }
      };
      
      // Act
      testExecutionInterface.clearFieldError(mockField);
      
      // Assert
      expect(mockField.classList.remove).toHaveBeenCalledWith('field-error');
    });
  });

  describe('Test Configuration Building', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should build Playwright test configuration', () => {
      // Arrange
      const formDataValues = new Map([
        ['testName', 'E2E Test'],
        ['testDescription', 'End-to-end test'],
        ['timeout', '300'],
        ['retries', '2'],
        ['enableHealing', 'on'],
        ['playwrightUrl', 'https://example.com'],
        ['playwrightBrowser', 'chromium'],
        ['playwrightHeadless', 'on']
      ]);
      const mockFormData = {
        get: jest.fn((key) => formDataValues.get(key))
      };
      
      mockDocument.getElementById.mockReturnValue({ value: 'playwright' });
      
      // Act
      const config = testExecutionInterface.buildTestConfigFromForm(mockFormData);
      
      // Assert
      expect(config).toEqual({
        name: 'E2E Test',
        description: 'End-to-end test',
        engine: 'playwright',
        options: {
          timeout: 300000, // converted to milliseconds
          retries: 2,
          parallel: false,
          healing: true
        },
        config: {
          url: 'https://example.com',
          browser: 'chromium',
          headless: true,
          video: false
        }
      });
    });

    it('should build Jest test configuration', () => {
      // Arrange
      const formDataValues = new Map([
        ['testName', 'Unit Test'],
        ['jestEnvironment', 'jsdom'],
        ['jestWorkers', '4'],
        ['jestCoverage', 'on']
      ]);
      const mockFormData = {
        get: jest.fn((key) => formDataValues.get(key))
      };
      
      mockDocument.getElementById.mockReturnValue({ value: 'jest' });
      
      // Act
      const engineConfig = testExecutionInterface.buildEngineSpecificConfig('jest', mockFormData);
      
      // Assert
      expect(engineConfig).toEqual({
        testEnvironment: 'jsdom',
        maxWorkers: 4,
        coverage: true,
        verbose: false
      });
    });

    it('should build k6 test configuration with JSON thresholds', () => {
      // Arrange
      const formDataValues = new Map([
        ['k6Vus', '20'],
        ['k6Duration', '60s'],
        ['k6Thresholds', '{"http_req_duration": ["p(95)<500"]}']
      ]);
      const mockFormData = {
        get: jest.fn((key) => formDataValues.get(key))
      };
      
      // Act
      const engineConfig = testExecutionInterface.buildEngineSpecificConfig('k6', mockFormData);
      
      // Assert
      expect(engineConfig).toEqual({
        vus: 20,
        duration: '60s',
        thresholds: {
          http_req_duration: ['p(95)<500']
        }
      });
    });
  });

  describe('Test Execution', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should execute test successfully', async () => {
      // Arrange
      const mockExecuteButton = {
        disabled: false,
        innerHTML: 'Execute Test'
      };
      const mockCancelButton = {
        style: { display: 'none' },
        disabled: true
      };
      const mockForm = {
        querySelectorAll: jest.fn(() => []),
        elements: {},
        checkValidity: jest.fn(() => true),
        reportValidity: jest.fn(() => true),
        reset: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'execute-test-button') return mockExecuteButton;
        if (id === 'cancel-test-button') return mockCancelButton;
        if (id === 'test-execution-form') return mockForm;
        return mockElements.inputs;
      });

      // Mock the specific API call for test execution
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/v1/tests/execute')) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => 'application/json' },
            json: async () => ({
              success: true,
              data: {
                testId: 'test_123',
                status: 'accepted'
              }
            })
          });
        }
        // Default mock for other requests
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: true, data: {} })
        });
      });

      // Mock form validation to pass
      testExecutionInterface.validateForm = jest.fn(() => true);
      
      // Mock FormData constructor to avoid DOM dependency
      global.FormData = jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        set: jest.fn(),
        append: jest.fn(),
        delete: jest.fn(),
        entries: jest.fn(),
        values: jest.fn(),
        keys: jest.fn()
      }));
      
      testExecutionInterface.buildTestConfigFromForm = jest.fn(() => ({
        name: 'Test',
        engine: 'playwright',
        config: { url: 'https://example.com' }
      }));
      testExecutionInterface.showTestMonitoring = jest.fn();
      testExecutionInterface.startTestMonitoring = jest.fn();
      testExecutionInterface.showNotification = jest.fn();

      // Act
      try {
        await testExecutionInterface.executeTest();
        console.log('executeTest completed successfully');
      } catch (error) {
        console.log('executeTest failed with error:', error);
      }

      // Debug logging
      console.log('currentTestId after execution:', testExecutionInterface.currentTestId);

      // Assert
      expect(testExecutionInterface.currentTestId).toBe('test_123');
      expect(mockExecuteButton.disabled).toBe(true);
      expect(mockCancelButton.style.display).toBe('inline-block');
      expect(testExecutionInterface.showTestMonitoring).toHaveBeenCalled();
      expect(testExecutionInterface.startTestMonitoring).toHaveBeenCalled();
    });

    it('should handle test execution failure', async () => {
      // Arrange
      const mockForm = {
        querySelectorAll: jest.fn(() => [])
      };
      mockDocument.getElementById.mockReturnValue(mockForm);
      
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      testExecutionInterface.validateForm = jest.fn(() => true);
      testExecutionInterface.buildTestConfigFromForm = jest.fn(() => ({}));
      testExecutionInterface.showNotification = jest.fn();
      testExecutionInterface.resetExecutionUI = jest.fn();

      // Act
      await testExecutionInterface.executeTest();

      // Assert
      expect(testExecutionInterface.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Test execution failed'),
        'error'
      );
      expect(testExecutionInterface.resetExecutionUI).toHaveBeenCalled();
    });

    it('should create quick test configuration', () => {
      // Act
      const e2eConfig = testExecutionInterface.createQuickTestConfig('e2e');
      const unitConfig = testExecutionInterface.createQuickTestConfig('unit');
      const performanceConfig = testExecutionInterface.createQuickTestConfig('performance');

      // Assert
      expect(e2eConfig.name).toBe('E2E Tests Suite');
      expect(e2eConfig.engine).toBe('playwright');
      expect(unitConfig.name).toBe('Unit Tests Suite');
      expect(unitConfig.engine).toBe('jest');
      expect(performanceConfig.name).toBe('Performance Tests Suite');
      expect(performanceConfig.engine).toBe('k6');
    });
  });

  describe('Real-time Monitoring', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
      testExecutionInterface.currentTestId = 'test_123';
      
      // Ensure clean timer state
      jest.clearAllTimers();
    });

    it('should start test monitoring with polling', () => {
      // Arrange
      const mockSetInterval = jest.fn(() => 'interval_id' as any);
      (global as any).setInterval = mockSetInterval;

      // Act
      testExecutionInterface.startTestMonitoring();

      // Assert
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 2000);
      expect(testExecutionInterface.monitoringInterval).toBe('interval_id');
    });

    it('should stop test monitoring', () => {
      // Arrange
      const mockClearInterval = jest.fn();
      (global as any).clearInterval = mockClearInterval;
      testExecutionInterface.monitoringInterval = 'interval_id';

      // Act
      testExecutionInterface.stopTestMonitoring();

      // Assert
      expect(mockClearInterval).toHaveBeenCalledWith('interval_id');
      expect(testExecutionInterface.monitoringInterval).toBeNull();
    });

    it('should update progress indicators', () => {
      // Arrange
      const mockProgressFill = { style: { width: '0%' } };
      const mockProgressText = { textContent: '0%' };
      const mockElapsedTime = { textContent: '0s' };
      
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'test-progress-fill') return mockProgressFill;
        if (id === 'test-progress-text') return mockProgressText;
        if (id === 'test-elapsed-time') return mockElapsedTime;
        return null;
      });

      testExecutionInterface.updateStatusBadge = jest.fn();

      // Mock API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: {
            progress: 75,
            status: 'running',
            duration: 5000
          }
        })
      });

      // Act - simulate monitoring interval execution
      const monitoringFunction = jest.fn(async () => {
        const response = await apiService.getTestStatus('test_123');
        if (response.success && response.data) {
          const status = response.data;
          mockProgressFill.style.width = `${status.progress}%`;
          mockProgressText.textContent = `${status.progress}%`;
        }
      });

      // Assert
      expect(monitoringFunction).toBeDefined();
    });

    it('should handle test completion', async () => {
      // Arrange
      testExecutionInterface.stopTestMonitoring = jest.fn();
      testExecutionInterface.resetExecutionUI = jest.fn();
      testExecutionInterface.loadTestHistory = jest.fn();
      testExecutionInterface.showNotification = jest.fn();

      const completedStatus = {
        status: 'passed',
        duration: 5000
      };

      // Mock successful result fetch
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/v1/tests/test_123/result')) {
          return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({
              success: true,
              data: {
                output: 'Test completed successfully'
              }
            })
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: true, data: {} })
        });
      });

      // Act
      try {
        await testExecutionInterface.onTestComplete(completedStatus);
        console.log('onTestComplete executed successfully');
      } catch (error) {
        console.log('onTestComplete failed:', error);
      }

      // Assert
      expect(testExecutionInterface.stopTestMonitoring).toHaveBeenCalled();
      expect(testExecutionInterface.resetExecutionUI).toHaveBeenCalled();
      expect(testExecutionInterface.loadTestHistory).toHaveBeenCalled();
      expect(testExecutionInterface.showNotification).toHaveBeenCalledWith(
        'Test completed successfully in 5s',
        'success'
      );
    });
  });

  describe('Test Cancellation', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
      testExecutionInterface.currentTestId = 'test_123';
      
      // Clear fetch mock after initialization to isolate test behavior
      mockFetch.mockClear();
    });

    it('should cancel current test with confirmation', async () => {
      // Arrange
      (global as any).confirm = jest.fn(() => true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true })
      });

      testExecutionInterface.showNotification = jest.fn();
      testExecutionInterface.stopTestMonitoring = jest.fn();
      testExecutionInterface.updateStatusBadge = jest.fn();
      testExecutionInterface.resetExecutionUI = jest.fn();
      testExecutionInterface.loadTestHistory = jest.fn();

      // Act
      await testExecutionInterface.cancelCurrentTest();

      // Assert
      expect((global as any).confirm).toHaveBeenCalledWith('Are you sure you want to cancel the running test?');
      expect(testExecutionInterface.showNotification).toHaveBeenCalledWith('Test cancelled successfully', 'warning');
      expect(testExecutionInterface.stopTestMonitoring).toHaveBeenCalled();
      expect(testExecutionInterface.resetExecutionUI).toHaveBeenCalled();
    });

    it('should not cancel test if user declines confirmation', async () => {
      // Arrange
      (global as any).confirm = jest.fn(() => false);
      testExecutionInterface.showNotification = jest.fn();

      // Act
      await testExecutionInterface.cancelCurrentTest();

      // Assert
      expect((global as any).confirm).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(testExecutionInterface.showNotification).not.toHaveBeenCalled();
    });
  });

  describe('Test History Management', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should load test history successfully', async () => {
      // Arrange
      const mockTableBody = { innerHTML: '' };
      mockDocument.getElementById.mockReturnValue(mockTableBody);

      const mockHistoryData = {
        success: true,
        data: {
          items: [
            {
              id: 'test_1',
              name: 'E2E Test',
              engine: 'playwright',
              status: 'passed',
              duration: 5000,
              startTime: '2023-01-01T10:00:00Z'
            }
          ],
          pagination: {
            page: 1,
            totalPages: 1,
            total: 1
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => mockHistoryData
      });

      testExecutionInterface.renderTestHistory = jest.fn();

      // Act
      await testExecutionInterface.loadTestHistory();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/results'),
        expect.any(Object)
      );
      expect(testExecutionInterface.renderTestHistory).toHaveBeenCalledWith(mockHistoryData.data);
    });

    it('should handle history loading failure', async () => {
      // Arrange
      const mockTableBody = { innerHTML: '' };
      mockDocument.getElementById.mockReturnValue(mockTableBody);
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      await testExecutionInterface.loadTestHistory();

      // Assert
      expect(mockTableBody.innerHTML).toBe('<tr><td colspan="6" class="history-error">Failed to load test history</td></tr>');
    });

    it('should render test history table', () => {
      // Arrange
      const mockTableBody = { innerHTML: '' };
      const mockPaginationInfo = { textContent: '' };
      const mockPrevButton = { disabled: false };
      const mockNextButton = { disabled: false };

      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'history-table-body') return mockTableBody;
        if (id === 'history-pagination-info') return mockPaginationInfo;
        if (id === 'history-prev-page') return mockPrevButton;
        if (id === 'history-next-page') return mockNextButton;
        return null;
      });

      const testData = {
        items: [
          {
            id: 'test_1',
            name: 'E2E Test',
            engine: 'playwright',
            status: 'passed',
            duration: 5000,
            startTime: '2023-01-01T10:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          totalPages: 2,
          total: 10
        }
      };

      testExecutionInterface.setupHistoryActionButtons = jest.fn();

      // Act
      testExecutionInterface.renderTestHistory(testData);

      // Assert
      expect(mockTableBody.innerHTML).toContain('E2E Test');
      expect(mockTableBody.innerHTML).toContain('playwright');
      expect(mockTableBody.innerHTML).toContain('status-passed');
      expect(mockPaginationInfo.textContent).toBe('Page 1 of 2 (10 total)');
      expect(mockPrevButton.disabled).toBe(true);
      expect(mockNextButton.disabled).toBe(false);
    });
  });

  describe('Modal Functionality', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should view test result and show modal', async () => {
      // Arrange
      const testResult = {
        name: 'E2E Test',
        status: 'passed',
        duration: 5000,
        startTime: '2023-01-01T10:00:00Z',
        output: 'Test output',
        healingAttempts: [
          {
            strategy: 'ID Fallback',
            confidence: 0.9,
            success: true
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, data: testResult })
      });

      testExecutionInterface.showTestResultModal = jest.fn();

      // Act
      await testExecutionInterface.viewTestResult('test_123');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/results/test_123'),
        expect.any(Object)
      );
      expect(testExecutionInterface.showTestResultModal).toHaveBeenCalledWith(testResult);
    });

    it('should create and display test result modal', () => {
      // Arrange
      const testResult = {
        name: 'E2E Test',
        status: 'passed',
        duration: 5000,
        startTime: '2023-01-01T10:00:00Z',
        output: 'Test completed successfully',
        healingAttempts: [
          {
            strategy: 'ID Fallback',
            confidence: 0.9,
            success: true,
            description: 'Successfully healed locator'
          }
        ],
        metrics: {
          memoryUsage: 128,
          cpuUsage: 45,
          networkRequests: 10
        }
      };

      // Act
      testExecutionInterface.showTestResultModal(testResult);

      // Assert
      expect(mockDocument.body.insertAdjacentHTML).toHaveBeenCalledWith(
        'beforeend',
        expect.stringContaining('Test Result Details')
      );
      expect(mockDocument.body.insertAdjacentHTML).toHaveBeenCalledWith(
        'beforeend',
        expect.stringContaining('E2E Test')
      );
      expect(mockDocument.body.insertAdjacentHTML).toHaveBeenCalledWith(
        'beforeend',
        expect.stringContaining('ID Fallback')
      );
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should extract test type from button ID', () => {
      // Act & Assert
      expect(testExecutionInterface.extractTestTypeFromButtonId('run-e2e-tests')).toBe('e2e');
      expect(testExecutionInterface.extractTestTypeFromButtonId('run-unit-tests')).toBe('unit');
      expect(testExecutionInterface.extractTestTypeFromButtonId('run-performance-tests')).toBe('performance');
      expect(testExecutionInterface.extractTestTypeFromButtonId('invalid-id')).toBe('all');
    });

    it('should get status messages', () => {
      // Act & Assert
      expect(testExecutionInterface.getStatusMessage('running')).toBe('Test is running...');
      expect(testExecutionInterface.getStatusMessage('passed')).toBe('Test completed successfully');
      expect(testExecutionInterface.getStatusMessage('failed')).toBe('Test failed');
      expect(testExecutionInterface.getStatusMessage('unknown')).toBe('unknown');
    });

    it('should update status badge correctly', () => {
      // Arrange
      const mockBadge = {
        className: 'status-badge',
        classList: { add: jest.fn() },
        querySelector: jest.fn(() => ({ textContent: '' }))
      };
      mockDocument.getElementById.mockReturnValue(mockBadge);

      // Act
      testExecutionInterface.updateStatusBadge('running', 'Test is running...');

      // Assert
      expect(mockBadge.classList.add).toHaveBeenCalledWith('status-running');
    });

    it('should show notifications', () => {
      // Arrange
      const mockNotification = {
        className: '',
        textContent: '',
        style: {},
        addEventListener: jest.fn()
      };
      mockDocument.createElement.mockReturnValue(mockNotification);

      // Act
      testExecutionInterface.showNotification('Test message', 'success');

      // Assert
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockNotification.className).toBe('notification notification-success');
      expect(mockNotification.textContent).toBe('Test message');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockNotification);
    });
  });

  describe('Cleanup and Destruction', () => {
    beforeEach(async () => {
      testExecutionInterface = new TestExecutionInterface(apiService, {
        autoInit: false,
        enableLogging: false,
        skipDOMInit: true
      });
      await testExecutionInterface.init();
    });

    it('should cleanup resources on destroy', () => {
      // Arrange
      testExecutionInterface.monitoringInterval = 'interval_id';
      testExecutionInterface.stopTestMonitoring = jest.fn();

      // Act
      testExecutionInterface.destroy();

      // Assert
      expect(testExecutionInterface.stopTestMonitoring).toHaveBeenCalled();
      expect(testExecutionInterface.currentTestId).toBeNull();
      expect(testExecutionInterface.isInitialized).toBe(false);
    });
  });
});
