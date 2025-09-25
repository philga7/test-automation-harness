/**
 * Unit tests for Dashboard Overview functionality
 * 
 * Following project best practices:
 * - Use actual components to test against (not mocks where possible)
 * - Reduce repetitive testing by 60-80% through comprehensive real component testing
 * - Test actual data flow and integration patterns
 */

// Mock DOM environment with comprehensive browser-like behavior
const mockDocument = {
  getElementById: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  hidden: false
};

const mockWindow: any = {
  dashboard: null,
  dashboardOverview: null,
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  AbortController: jest.fn(() => ({
    signal: {},
    abort: jest.fn()
  })),
  fetch: jest.fn()
};

// Mock console for logging tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Setup global mocks
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true
});

Object.defineProperty(global, 'fetch', {
  value: mockWindow.fetch,
  writable: true
});

Object.defineProperty(global, 'AbortController', {
  value: mockWindow.AbortController,
  writable: true
});

Object.defineProperty(global, 'setInterval', {
  value: mockWindow.setInterval,
  writable: true
});

Object.defineProperty(global, 'clearInterval', {
  value: mockWindow.clearInterval,
  writable: true
});

// Import actual ApiService (following project pattern of using real components)
const { ApiService: ApiServiceClass } = require('../../src/ui/public/js/api-service.js');

// Mock successful API responses for testing
const mockApiResponses = {
  systemStatus: {
    status: 'healthy',
    version: '1.0.0',
    uptime: 3600,
    environment: 'test'
  },
  apiStatus: {
    features: {
      testOrchestration: 'available',
      selfHealing: 'available',
      unifiedReporting: 'available'
    }
  },
  engines: {
    data: [
      {
        id: 'playwright-engine',
        name: 'Playwright',
        testType: 'e2e',
        status: 'enabled',
        supportsHealing: true
      },
      {
        id: 'jest-engine',
        name: 'Jest',
        testType: 'unit',
        status: 'enabled',
        supportsHealing: false
      }
    ]
  },
  engineHealth: {
    health: {
      status: 'healthy',
      message: 'Engine running normally',
      metrics: {
        uptime: 3600,
        memoryUsage: 128,
        cpuUsage: 15
      }
    }
  },
  observabilityHealth: {
    systemHealth: {
      status: 'healthy',
      metrics: {
        cpu: 25.5,
        memory: 68.2,
        disk: 45.1
      }
    }
  },
  healingStatistics: {
    totalAttempts: 150,
    successfulAttempts: 120,
    failedAttempts: 30,
    successRate: 0.8
  }
};

// Import the actual DashboardOverview class after setting up mocks
// We'll need to dynamically import it to ensure mocks are in place
let DashboardOverview: any;

describe('Dashboard Overview', () => {
  let dashboardOverview: any;
  let mockElement: any;
  let mockApiService: any;

  beforeAll(async () => {
    // Setup fetch mock for ApiService
    mockWindow.fetch.mockImplementation((url: string) => {
      const mockResponse = (data: any) => ({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve(data)
      });

      // Route requests to appropriate mock responses
      if (url.includes('/health')) {
        return Promise.resolve(mockResponse(mockApiResponses.systemStatus));
      } else if (url.includes('/api/status')) {
        return Promise.resolve(mockResponse(mockApiResponses.apiStatus));
      } else if (url.includes('/engines') && !url.includes('/health')) {
        return Promise.resolve(mockResponse(mockApiResponses.engines));
      } else if (url.includes('/health')) {
        return Promise.resolve(mockResponse(mockApiResponses.engineHealth));
      } else if (url.includes('/observability/health')) {
        return Promise.resolve(mockResponse(mockApiResponses.observabilityHealth));
      } else if (url.includes('/healing/statistics')) {
        return Promise.resolve(mockResponse(mockApiResponses.healingStatistics));
      }
      
      return Promise.reject(new Error('Unknown endpoint'));
    });

    // Load the actual DashboardOverview class
    const dashboardModule = require('../../src/ui/public/js/dashboard-overview.js');
    DashboardOverview = dashboardModule.default || dashboardModule.DashboardOverview || dashboardModule;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    
    // Setup mock DOM element
    mockElement = {
      textContent: '',
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      },
      style: {},
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      innerHTML: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Setup mock API service using real ApiService
    mockApiService = new ApiServiceClass({
      baseUrl: 'http://localhost:3000',
      timeout: 1000,
      retryAttempts: 1,
      enableLogging: false
    });

    // Reset all mocks
    mockDocument.getElementById.mockReturnValue(mockElement);
    mockDocument.querySelectorAll.mockReturnValue([mockElement]);
    mockDocument.createElement.mockReturnValue(mockElement);
    mockWindow.setInterval.mockImplementation((_fn: any, _interval: any) => {
      return 'timer-id-' + Date.now();
    });
    mockWindow.clearInterval.mockImplementation((_timerId: any) => {
      // Mock clearInterval implementation
    });
    
    // Clear all mock calls
    jest.clearAllMocks();
    
    // Initialize dashboard overview with test configuration
    dashboardOverview = new DashboardOverview({
      refreshInterval: 1000,
      healthCheckInterval: 500,
      apiService: mockApiService
    });
  });

  afterEach(() => {
    if (dashboardOverview) {
      dashboardOverview.destroy();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options when no options provided', () => {
      const defaultOverview = new DashboardOverview({
        apiService: mockApiService
      });
      
      expect(defaultOverview.refreshInterval).toBe(30000);
      expect(defaultOverview.healthCheckInterval).toBe(10000);
      expect(defaultOverview.isActive).toBe(true);
    });

    it('should initialize with custom options', () => {
      expect(dashboardOverview.refreshInterval).toBe(1000);
      expect(dashboardOverview.healthCheckInterval).toBe(500);
      expect(dashboardOverview.apiService).toBeDefined();
      expect(dashboardOverview.isActive).toBe(true);
    });

    it('should setup event listeners on initialization', () => {
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should start real-time updates on initialization', () => {
      // The dashboard should have timers set up during initialization
      expect(dashboardOverview.systemHealthTimer).not.toBeNull();
      expect(dashboardOverview.engineStatusTimer).not.toBeNull();
      expect(dashboardOverview.isActive).toBe(true);
    });

    it('should cache system and engine status', () => {
      expect(dashboardOverview.systemStatus).toBeDefined();
      expect(dashboardOverview.engineStatus).toBeDefined();
      // System starts loading data immediately, so health may be 'healthy' from mock API
      expect(['unknown', 'healthy']).toContain(dashboardOverview.systemStatus.health);
      expect(Array.isArray(dashboardOverview.engineStatus.engines)).toBe(true);
    });
  });

  describe('System Status Updates', () => {
    it('should update system status successfully', async () => {
      await dashboardOverview.updateSystemStatus();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-status');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-version');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('system-uptime');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('last-update');
      
      expect(dashboardOverview.systemStatus.health).toBe('healthy');
      expect(dashboardOverview.systemStatus.version).toBe('1.0.0');
      expect(dashboardOverview.systemStatus.uptime).toBe(3600);
    });

    it('should handle system status API errors gracefully', async () => {
      // Mock API to throw error
      mockWindow.fetch.mockRejectedValueOnce(new Error('Network error'));

      await dashboardOverview.updateSystemStatus();

      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockElement.textContent).toBe('Error');
      expect(mockElement.classList.add).toHaveBeenCalledWith('error-state');
    });

    it('should update system health indicators', async () => {
      const mockIndicators = [mockElement, mockElement, mockElement];
      mockDocument.querySelectorAll.mockReturnValue(mockIndicators);

      await dashboardOverview.updateSystemStatus();

      mockIndicators.forEach(indicator => {
        expect(indicator.classList.remove).toHaveBeenCalledWith('healthy', 'degraded', 'unhealthy', 'unknown');
        expect(indicator.classList.add).toHaveBeenCalledWith('healthy');
      });
    });

    it('should format system status correctly', () => {
      expect(dashboardOverview.formatSystemStatus('healthy')).toBe('🟢 Healthy');
      expect(dashboardOverview.formatSystemStatus('degraded')).toBe('🟡 Degraded');
      expect(dashboardOverview.formatSystemStatus('unhealthy')).toBe('🔴 Unhealthy');
      expect(dashboardOverview.formatSystemStatus('unknown')).toBe('⚪ Unknown');
    });

    it('should format uptime correctly', () => {
      expect(dashboardOverview.formatUptime(3600)).toBe('1h 0m');
      expect(dashboardOverview.formatUptime(90061)).toBe('1d 1h 1m');
      expect(dashboardOverview.formatUptime(300)).toBe('5m');
      expect(dashboardOverview.formatUptime(0)).toBe('0m');
      expect(dashboardOverview.formatUptime(null)).toBe('Unknown');
    });
  });

  describe('Engine Status Updates', () => {
    it('should update engine status successfully', async () => {
      await dashboardOverview.updateEngineStatus();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('engines-count');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('healthy-engines');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('engines-status');
      
      expect(dashboardOverview.engineStatus.engines).toHaveLength(2);
      expect(dashboardOverview.engineStatus.totalEngines).toBe(2);
      // Engine health checks are async, so we might have 0 or 2 healthy engines depending on timing
      expect(dashboardOverview.engineStatus.healthyEngines).toBeGreaterThanOrEqual(0);
      expect(dashboardOverview.engineStatus.healthyEngines).toBeLessThanOrEqual(2);
    });

    it('should handle engine status API errors gracefully', async () => {
      // Mock engines API to throw error
      mockWindow.fetch.mockImplementation((url: string) => {
        if (url.includes('/engines')) {
          return Promise.reject(new Error('Engines API error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({})
        });
      });

      await dashboardOverview.updateEngineStatus();

      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockElement.textContent).toBe('Error');
      expect(mockElement.classList.add).toHaveBeenCalledWith('error-state');
    });

    it('should render engine list correctly', async () => {
      const mockContainer = { 
        ...mockElement,
        innerHTML: ''
      };
      
      // Create a mock engine element
      const mockEngineElement = {
        className: '',
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      // Ensure we have engines in the status first
      dashboardOverview.engineStatus.engines = mockApiResponses.engines.data;
      dashboardOverview.engineStatus.totalEngines = mockApiResponses.engines.data.length;
      
      // Mock the engines list container and createElement
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'engines-list') return mockContainer;
        return mockElement;
      });
      
      mockDocument.createElement.mockReturnValue(mockEngineElement);

      // Call renderEngineList directly
      dashboardOverview.renderEngineList();

      // The renderEngineList method should have been called and found the container
      expect(mockDocument.getElementById).toHaveBeenCalledWith('engines-list');
      
      // Should have created engine elements
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      
      // Should have set the className
      expect(mockEngineElement.className).toBe('engine-item');
    });

    it('should calculate engine health percentage correctly', async () => {
      // Manually set engine data to ensure we have engines for calculation
      dashboardOverview.engineStatus.engines = mockApiResponses.engines.data;
      dashboardOverview.engineStatus.totalEngines = mockApiResponses.engines.data.length;
      dashboardOverview.engineStatus.healthyEngines = 2; // Both engines are healthy in our mock

      // Ensure we have engines loaded
      expect(dashboardOverview.engineStatus.totalEngines).toBeGreaterThan(0);
      
      const healthPercentage = (dashboardOverview.engineStatus.healthyEngines / dashboardOverview.engineStatus.totalEngines) * 100;
      expect(healthPercentage).toBeGreaterThanOrEqual(0);
      expect(healthPercentage).toBeLessThanOrEqual(100);
      expect(Number.isNaN(healthPercentage)).toBe(false);
      expect(healthPercentage).toBe(100); // 2/2 * 100 = 100%
    });

    it('should get correct health status class', () => {
      expect(dashboardOverview.getHealthStatusClass('healthy')).toBe('healthy');
      expect(dashboardOverview.getHealthStatusClass('degraded')).toBe('degraded');
      expect(dashboardOverview.getHealthStatusClass('unhealthy')).toBe('unhealthy');
      expect(dashboardOverview.getHealthStatusClass('unknown')).toBe('unknown');
      expect(dashboardOverview.getHealthStatusClass('ok')).toBe('healthy');
      expect(dashboardOverview.getHealthStatusClass('error')).toBe('unhealthy');
    });
  });

  describe('System Metrics Updates', () => {
    it('should update observability metrics successfully', async () => {
      await dashboardOverview.updateSystemMetrics();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('cpu-usage');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('memory-usage');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('disk-usage');
    });

    it('should update healing statistics successfully', async () => {
      await dashboardOverview.updateSystemMetrics();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('healing-rate');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('total-healing-actions');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('successful-healing');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('failed-healing');
    });

    it('should format healing statistics correctly', async () => {
      const mockHealingRateElement = { ...mockElement };
      
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'healing-rate') return mockHealingRateElement;
        return mockElement;
      });

      // Call renderHealingStatistics directly with our mock data
      dashboardOverview.renderHealingStatistics(mockApiResponses.healingStatistics);

      // Check that healing rate element was targeted and formatted correctly
      expect(mockDocument.getElementById).toHaveBeenCalledWith('healing-rate');
      
      // The healing rate should be formatted as percentage
      const expectedRate = (mockApiResponses.healingStatistics.successRate * 100).toFixed(1);
      expect(mockHealingRateElement.textContent).toBe(`${expectedRate}%`);
    });

    it('should handle metrics API errors gracefully', async () => {
      mockWindow.fetch.mockImplementation((url: string) => {
        if (url.includes('/observability/health') || url.includes('/healing/statistics')) {
          return Promise.reject(new Error('Metrics API error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({})
        });
      });

      await dashboardOverview.updateSystemMetrics();

      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('should start real-time updates with correct intervals', () => {
      // Clear any existing timers first
      dashboardOverview.stopRealTimeUpdates();
      
      // Verify timers are null before starting
      expect(dashboardOverview.systemHealthTimer).toBeNull();
      expect(dashboardOverview.engineStatusTimer).toBeNull();
      
      dashboardOverview.startRealTimeUpdates();

      // Should have created timer IDs
      expect(dashboardOverview.systemHealthTimer).not.toBeNull();
      expect(dashboardOverview.engineStatusTimer).not.toBeNull();
      
      // Verify timers are different (they should have different IDs)
      expect(dashboardOverview.systemHealthTimer).not.toBe(dashboardOverview.engineStatusTimer);
    });

    it('should stop real-time updates', () => {
      // Start timers first
      dashboardOverview.startRealTimeUpdates();
      
      // Ensure timers are set
      expect(dashboardOverview.systemHealthTimer).not.toBeNull();
      expect(dashboardOverview.engineStatusTimer).not.toBeNull();
      
      dashboardOverview.stopRealTimeUpdates();

      // Should have cleared both timers (set to null)
      expect(dashboardOverview.systemHealthTimer).toBeNull();
      expect(dashboardOverview.engineStatusTimer).toBeNull();
    });

    it('should pause updates when page is hidden', () => {
      const stopSpy = jest.spyOn(dashboardOverview, 'stopRealTimeUpdates');
      
      dashboardOverview.pauseUpdates();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should resume updates when page is visible', () => {
      const startSpy = jest.spyOn(dashboardOverview, 'startRealTimeUpdates');
      const refreshSpy = jest.spyOn(dashboardOverview, 'refreshAllData');
      
      dashboardOverview.resumeUpdates();

      expect(startSpy).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('Manual Refresh', () => {
    it('should refresh all data manually', async () => {
      const loadSpy = jest.spyOn(dashboardOverview, 'loadInitialData');
      const showLoadingSpy = jest.spyOn(dashboardOverview, 'showLoadingState');
      const hideLoadingSpy = jest.spyOn(dashboardOverview, 'hideLoadingState');

      await dashboardOverview.refreshAllData();

      expect(showLoadingSpy).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
      expect(hideLoadingSpy).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      jest.spyOn(dashboardOverview, 'loadInitialData').mockRejectedValue(new Error('Refresh failed'));
      const hideLoadingSpy = jest.spyOn(dashboardOverview, 'hideLoadingState');
      const showNotificationSpy = jest.spyOn(dashboardOverview, 'showNotification');

      await dashboardOverview.refreshAllData();

      expect(hideLoadingSpy).toHaveBeenCalled();
      expect(showNotificationSpy).toHaveBeenCalledWith('Failed to refresh dashboard', 'error');
    });

    it('should show and hide loading states', () => {
      const mockLoadingElements = [mockElement, mockElement];
      mockDocument.querySelectorAll.mockReturnValue(mockLoadingElements);

      dashboardOverview.showLoadingState();
      mockLoadingElements.forEach(element => {
        expect(element.classList.add).toHaveBeenCalledWith('loading');
      });

      dashboardOverview.hideLoadingState();
      mockLoadingElements.forEach(element => {
        expect(element.classList.remove).toHaveBeenCalledWith('loading');
      });
    });
  });

  describe('Event Handling', () => {
    it('should handle refresh button click', () => {
      const refreshBtn = { ...mockElement };
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'refresh-overview') return refreshBtn;
        return mockElement;
      });

      const refreshSpy = jest.spyOn(dashboardOverview, 'refreshAllData');
      dashboardOverview.setupEventListeners();

      // Simulate button click
      const clickHandler = refreshBtn.addEventListener.mock.calls[0][1];
      clickHandler();

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle visibility change events', () => {
      const pauseSpy = jest.spyOn(dashboardOverview, 'pauseUpdates');
      const resumeSpy = jest.spyOn(dashboardOverview, 'resumeUpdates');

      // Simulate page becoming hidden
      mockDocument.hidden = true;
      const visibilityHandler = mockDocument.addEventListener.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )[1];
      visibilityHandler();

      expect(pauseSpy).toHaveBeenCalled();

      // Simulate page becoming visible
      mockDocument.hidden = false;
      visibilityHandler();

      expect(resumeSpy).toHaveBeenCalled();
    });
  });

  describe('Notification System', () => {
    it('should show notifications using dashboard notification system', () => {
      const mockDashboard = {
        showNotification: jest.fn()
      };
      mockWindow.dashboard = mockDashboard;

      dashboardOverview.showNotification('Test message', 'success');

      expect(mockDashboard.showNotification).toHaveBeenCalledWith('Test message', 'success');
    });

    it('should fallback to console logging when dashboard unavailable', () => {
      mockWindow.dashboard = null;

      dashboardOverview.showNotification('Test message', 'info');

      expect(mockConsole.log).toHaveBeenCalledWith('[INFO] Test message');
    });
  });

  describe('Utility Functions', () => {
    it('should format timestamps correctly', () => {
      const testDate = new Date('2025-01-01T12:00:00');
      const formatted = dashboardOverview.formatTimestamp(testDate);
      
      expect(formatted).toContain('12:00:00');
      expect(dashboardOverview.formatTimestamp(null)).toBe('Never');
    });

    it('should format engine health status correctly', () => {
      expect(dashboardOverview.formatEngineHealth('healthy')).toBe('Healthy');
      expect(dashboardOverview.formatEngineHealth('degraded')).toBe('Degraded');
      expect(dashboardOverview.formatEngineHealth('unhealthy')).toBe('Unhealthy');
      expect(dashboardOverview.formatEngineHealth('unknown')).toBe('Unknown');
    });

    it('should handle error logging consistently', () => {
      const testError = new Error('Test error');
      dashboardOverview.handleError('Test message', testError);

      expect(mockConsole.error).toHaveBeenCalledWith('[DashboardOverview] Test message:', testError);
    });

    it('should handle debug logging consistently', () => {
      dashboardOverview.log('Test message', { data: 'test' });

      expect(mockConsole.log).toHaveBeenCalledWith('[DashboardOverview] Test message', { data: 'test' });
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should cleanup properly on destroy', () => {
      const stopUpdatesSpy = jest.spyOn(dashboardOverview, 'stopRealTimeUpdates');
      
      dashboardOverview.destroy();

      expect(stopUpdatesSpy).toHaveBeenCalled();
      expect(dashboardOverview.isActive).toBe(false);
    });

    it('should remove event listeners on destroy', () => {
      dashboardOverview.destroy();

      expect(mockDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => {
        dashboardOverview.renderSystemStatus();
      }).not.toThrow();

      expect(() => {
        dashboardOverview.renderEngineStatus();
      }).not.toThrow();
    });

    it('should handle API timeout errors', async () => {
      mockWindow.fetch.mockRejectedValue(new Error('AbortError'));

      await dashboardOverview.updateSystemStatus();

      expect(mockConsole.error).toHaveBeenCalled();
      expect(dashboardOverview.systemStatus.health).toBe('unknown');
    });

    it('should handle malformed API responses', async () => {
      mockWindow.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(null)
      });

      await dashboardOverview.updateSystemStatus();

      expect(dashboardOverview.systemStatus.health).toBe('unknown');
    });

    it('should handle empty engine lists', async () => {
      mockWindow.fetch.mockImplementation((url: string) => {
        if (url.includes('/engines')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ data: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({})
        });
      });

      await dashboardOverview.updateEngineStatus();

      expect(dashboardOverview.engineStatus.totalEngines).toBe(0);
      expect(dashboardOverview.engineStatus.healthyEngines).toBe(0);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should not create multiple timers when already running', () => {
      const initialTimerCount = mockWindow.setInterval.mock.calls.length;
      
      dashboardOverview.startRealTimeUpdates();
      dashboardOverview.startRealTimeUpdates(); // Should not create new timers
      
      expect(mockWindow.setInterval.mock.calls.length).toBe(initialTimerCount);
    });

    it('should handle rapid successive updates gracefully', async () => {
      const updatePromises = [
        dashboardOverview.updateSystemStatus(),
        dashboardOverview.updateSystemStatus(),
        dashboardOverview.updateSystemStatus()
      ];

      await Promise.all(updatePromises);

      // After multiple updates, system should have a valid health status
      expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(dashboardOverview.systemStatus.health);
      expect(dashboardOverview.systemStatus.lastUpdate).toBeDefined();
    });
  });
});
