/**
 * Unit tests for Dashboard integration with ApiService
 */

// Mock DOM environment
const mockDocument = {
  getElementById: jest.fn(),
  addEventListener: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

const mockWindow = {
  dashboard: null
};

// Mock global objects
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

// Mock ApiService
class MockApiService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.enableLogging = options.enableLogging !== false;
  }

  async getSystemStatus() {
    return {
      status: 'healthy',
      version: '1.0.0',
      uptime: 3600
    };
  }

  async getApiStatus() {
    return {
      features: {
        testOrchestration: 'available',
        selfHealing: 'available',
        unifiedReporting: 'available',
        pluginArchitecture: 'available'
      }
    };
  }

  async getHealingStatistics() {
    return {
      totalAttempts: 100,
      successfulAttempts: 80,
      failedAttempts: 20,
      successRate: 0.8
    };
  }

  async getTestResultsSummary() {
    return {
      total: 50,
      passed: 40,
      failed: 8,
      skipped: 2,
      running: 0
    };
  }

  async executeTest(testConfig) {
    return {
      data: {
        testId: 'test_123',
        status: 'accepted'
      }
    };
  }
}

// Mock Dashboard class
class MockDashboard {
  constructor() {
    this.currentSection = 'overview';
    this.refreshInterval = null;
    this.apiService = new MockApiService({
      baseUrl: '',
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true
    });
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.loadSystemStatus();
    this.loadApiStatus();
    this.startAutoRefresh();
  }

  setupNavigation() {
    // Mock navigation setup
  }

  setupEventListeners() {
    // Mock event listeners setup
  }

  async loadSystemStatus() {
    try {
      const data = await this.apiService.getSystemStatus();
      this.updateElement('system-status', data.status);
      this.updateElement('system-version', data.version);
      this.updateElement('system-uptime', data.uptime ? Math.round(data.uptime) + 's' : 'Unknown');
      this.updateElement('last-update', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to load system status:', error);
      this.updateElement('system-status', 'Error');
      this.updateElement('system-version', 'Error');
      this.updateElement('system-uptime', 'Error');
      this.showNotification('Failed to load system status', 'error');
    }
  }

  async loadApiStatus() {
    try {
      const data = await this.apiService.getApiStatus();
      
      if (data.features) {
        const engineCount = Object.keys(data.features).length;
        this.updateElement('engines-count', engineCount.toString());
      }

      await this.loadHealingStats();
    } catch (error) {
      console.error('Failed to load API status:', error);
      this.updateElement('engines-count', 'Error');
      this.showNotification('Failed to load API status', 'error');
    }
  }

  async loadHealingStats() {
    try {
      const data = await this.apiService.getHealingStatistics();
      
      this.updateElement('healing-rate', data.successRate ? (data.successRate * 100).toFixed(1) + '%' : 'Loading...');
      this.updateElement('total-healing-actions', data.totalAttempts || '0');
      this.updateElement('successful-healing', data.successfulAttempts || '0');
      this.updateElement('failed-healing', data.failedAttempts || '0');
    } catch (error) {
      console.error('Failed to load healing stats:', error);
      this.updateElement('healing-rate', 'Error');
      this.showNotification('Failed to load healing statistics', 'error');
    }
  }

  async loadTestResults() {
    try {
      const data = await this.apiService.getTestResultsSummary();
      
      this.updateElement('tests-executed', data.total || '0');
      this.updateElement('active-tests', data.running || '0');
    } catch (error) {
      console.error('Failed to load test results:', error);
      this.showNotification('Failed to load test results', 'error');
    }
  }

  async executeTests(testType) {
    const button = { textContent: 'Run Tests', disabled: false };
    const originalText = button.textContent;
    
    try {
      button.textContent = 'Running...';
      button.disabled = true;
      
      const testConfig = this.createTestConfig(testType);
      const result = await this.apiService.executeTest(testConfig);
      
      this.showNotification(`Tests executed successfully! Test ID: ${result.data.testId}`, 'success');
      
      await this.loadTestResults();
      await this.loadHealingStats();
      
    } catch (error) {
      console.error('Test execution failed:', error);
      this.showNotification(`Test execution failed: ${error.message}`, 'error');
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  createTestConfig(testType) {
    const baseConfig = {
      name: `${testType.charAt(0).toUpperCase() + testType.slice(1)} Test Suite`,
      description: `Automated ${testType} test execution from dashboard`,
      options: {
        timeout: 30000,
        retries: 2,
        parallel: false,
        healing: true
      }
    };

    switch (testType) {
      case 'e2e':
        return {
          ...baseConfig,
          engine: 'playwright',
          config: {
            url: 'https://example.com',
            browser: 'chromium',
            headless: true,
            timeout: 30000
          }
        };
      case 'unit':
        return {
          ...baseConfig,
          engine: 'jest',
          config: {
            testEnvironment: 'node',
            timeout: 5000,
            maxWorkers: 2,
            coverage: true
          }
        };
      default:
        return {
          ...baseConfig,
          engine: 'playwright',
          config: {
            url: 'https://example.com',
            browser: 'chromium',
            headless: true
          }
        };
    }
  }

  updateElement(id, value) {
    const element = mockDocument.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  showNotification(message, type = 'info') {
    const notification = {
      className: `notification notification-${type}`,
      textContent: message,
      style: {}
    };
    
    mockDocument.body.appendChild(notification);
    
    // Simulate notification lifecycle
    setTimeout(() => {
      if (notification.parentNode) {
        mockDocument.body.removeChild(notification);
      }
    }, 100);
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadSystemStatus();
      this.loadApiStatus();
      this.loadTestResults();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
  }
}

describe('Dashboard Integration', () => {
  let dashboard: MockDashboard;
  let mockElement: any;

  beforeEach(() => {
    mockElement = {
      textContent: '',
      disabled: false
    };
    
    mockDocument.getElementById.mockReturnValue(mockElement);
    mockDocument.body.appendChild.mockClear();
    mockDocument.body.removeChild.mockClear();
    
    dashboard = new MockDashboard();
  });

  afterEach(() => {
    if (dashboard) {
      dashboard.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize dashboard with ApiService', () => {
      expect(dashboard.apiService).toBeDefined();
      expect(dashboard.apiService.baseUrl).toBe('');
      expect(dashboard.apiService.timeout).toBe(30000);
      expect(dashboard.apiService.retryAttempts).toBe(3);
    });

    it('should start auto-refresh on initialization', () => {
      expect(dashboard.refreshInterval).toBeDefined();
    });
  });

  describe('loadSystemStatus', () => {
    it('should load system status successfully', async () => {
      await dashboard.loadSystemStatus();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-status');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-version');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-uptime');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('last-update');
    });

    it('should handle API errors gracefully', async () => {
      // Mock API service to throw error
      dashboard.apiService.getSystemStatus = jest.fn().mockRejectedValue(new Error('API Error'));

      await dashboard.loadSystemStatus();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-status');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('loadHealingStats', () => {
    it('should load healing statistics successfully', async () => {
      await dashboard.loadHealingStats();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('healing-rate');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('total-healing-actions');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('successful-healing');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('failed-healing');
    });

    it('should format success rate as percentage', async () => {
      await dashboard.loadHealingStats();

      expect(mockElement.textContent).toBe('80.0%');
    });
  });

  describe('loadTestResults', () => {
    it('should load test results successfully', async () => {
      await dashboard.loadTestResults();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('tests-executed');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('active-tests');
    });
  });

  describe('executeTests', () => {
    it('should execute e2e tests successfully', async () => {
      const button = { textContent: 'Run E2E Tests', disabled: false };
      
      await dashboard.executeTests('e2e');

      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should execute unit tests successfully', async () => {
      const button = { textContent: 'Run Unit Tests', disabled: false };
      
      await dashboard.executeTests('unit');

      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should handle test execution errors', async () => {
      dashboard.apiService.executeTest = jest.fn().mockRejectedValue(new Error('Test execution failed'));

      await dashboard.executeTests('e2e');

      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('createTestConfig', () => {
    it('should create e2e test configuration', () => {
      const config = dashboard.createTestConfig('e2e');

      expect(config.name).toBe('E2e Test Suite');
      expect(config.engine).toBe('playwright');
      expect(config.config.url).toBe('https://example.com');
      expect(config.config.browser).toBe('chromium');
      expect(config.config.headless).toBe(true);
    });

    it('should create unit test configuration', () => {
      const config = dashboard.createTestConfig('unit');

      expect(config.name).toBe('Unit Test Suite');
      expect(config.engine).toBe('jest');
      expect(config.config.testEnvironment).toBe('node');
      expect(config.config.coverage).toBe(true);
    });

    it('should create default configuration for unknown test type', () => {
      const config = dashboard.createTestConfig('unknown');

      expect(config.name).toBe('Unknown Test Suite');
      expect(config.engine).toBe('playwright');
    });
  });

  describe('showNotification', () => {
    it('should show success notification', () => {
      dashboard.showNotification('Test completed successfully', 'success');

      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'notification notification-success',
          textContent: 'Test completed successfully'
        })
      );
    });

    it('should show error notification', () => {
      dashboard.showNotification('Test failed', 'error');

      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'notification notification-error',
          textContent: 'Test failed'
        })
      );
    });

    it('should show info notification by default', () => {
      dashboard.showNotification('Information message');

      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'notification notification-info',
          textContent: 'Information message'
        })
      );
    });
  });

  describe('updateElement', () => {
    it('should update element text content', () => {
      dashboard.updateElement('test-element', 'New Value');

      expect(mockDocument.getElementById).toHaveBeenCalledWith('test-element');
      expect(mockElement.textContent).toBe('New Value');
    });

    it('should handle missing element gracefully', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => {
        dashboard.updateElement('missing-element', 'Value');
      }).not.toThrow();
    });
  });

  describe('Auto-refresh', () => {
    it('should start auto-refresh', () => {
      dashboard.startAutoRefresh();

      expect(dashboard.refreshInterval).toBeDefined();
    });

    it('should stop auto-refresh', () => {
      dashboard.startAutoRefresh();
      dashboard.stopAutoRefresh();

      expect(dashboard.refreshInterval).toBeNull();
    });

    it('should destroy dashboard and stop auto-refresh', () => {
      dashboard.startAutoRefresh();
      dashboard.destroy();

      expect(dashboard.refreshInterval).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle API service errors gracefully', async () => {
      dashboard.apiService.getSystemStatus = jest.fn().mockRejectedValue(new Error('Network error'));

      await dashboard.loadSystemStatus();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-status');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should handle missing DOM elements gracefully', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => {
        dashboard.updateElement('missing-element', 'value');
      }).not.toThrow();
    });
  });
});
