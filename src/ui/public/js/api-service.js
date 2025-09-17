/**
 * Self-Healing Test Automation Harness - API Integration Service
 * 
 * Modern JavaScript service layer for communicating with the REST API endpoints.
 * Implements comprehensive error handling, retry logic, and response parsing.
 * 
 * Features:
 * - Fetch-based API client with proper error handling
 * - Automatic retry logic for failed requests
 * - Request/response logging for debugging
 * - TypeScript-style JSDoc for better IDE support
 * - Consistent error handling across all endpoints
 */

class ApiService {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || '';
        this.timeout = options.timeout || 30000;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.enableLogging = options.enableLogging !== false;
        
        // Request interceptor for logging
        this.requestInterceptor = options.requestInterceptor || null;
        this.responseInterceptor = options.responseInterceptor || null;
        
        this.log('ApiService initialized', { baseUrl: this.baseUrl, timeout: this.timeout });
    }

    /**
     * Base fetch method with retry logic and error handling
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Parsed response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const requestOptions = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Apply request interceptor
        if (this.requestInterceptor) {
            await this.requestInterceptor(url, requestOptions);
        }

        this.log('Making request', { url, method: requestOptions.method || 'GET' });

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                // Apply response interceptor
                if (this.responseInterceptor) {
                    await this.responseInterceptor(response);
                }

                const data = await this.parseResponse(response);
                
                this.log('Request successful', { 
                    url, 
                    status: response.status, 
                    attempt 
                });
                
                return data;
                
            } catch (error) {
                lastError = error;
                this.log('Request failed', { 
                    url, 
                    attempt, 
                    error: error.message,
                    willRetry: attempt < this.retryAttempts
                });
                
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        
        throw this.createApiError(lastError, url);
    }

    /**
     * Parse response and handle errors
     * @param {Response} response - Fetch response
     * @returns {Promise<Object>} Parsed data
     */
    async parseResponse(response) {
        if (!response) {
            throw new ApiError('No response received', 500, {});
        }
        
        const contentType = response?.headers?.get('content-type');
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = contentType?.includes('application/json') 
                    ? await response.json() 
                    : await response.text();
            } catch (e) {
                errorData = { message: 'Unknown error' };
            }
            
            throw new ApiError(
                errorData.message || `HTTP ${response.status}`,
                response.status,
                errorData
            );
        }
        
        if (contentType?.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    }

    /**
     * Create standardized API error
     * @param {Error} error - Original error
     * @param {string} url - Request URL
     * @returns {ApiError} Standardized error
     */
    createApiError(error, url) {
        if (error instanceof ApiError) {
            return error;
        }
        
        if (error.name === 'AbortError') {
            return new ApiError('Request timeout', 408, { url, originalError: error.message });
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return new ApiError('Network error - unable to connect to server', 0, { url, originalError: error.message });
        }
        
        return new ApiError(
            error.message || 'Unknown error occurred',
            500,
            { url, originalError: error.message }
        );
    }

    /**
     * Utility method for delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Logging utility
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    log(message, data = {}) {
        if (this.enableLogging) {
            console.log(`[ApiService] ${message}`, data);
        }
    }

    // ============================================================================
    // SYSTEM STATUS & HEALTH ENDPOINTS
    // ============================================================================

    /**
     * Get system health status
     * @returns {Promise<Object>} Health status data
     */
    async getSystemStatus() {
        return await this.request('/health');
    }

    /**
     * Get API status information
     * @returns {Promise<Object>} API status data
     */
    async getApiStatus() {
        return await this.request('/api/status');
    }

    /**
     * Get observability health status
     * @returns {Promise<Object>} Observability health data
     */
    async getObservabilityHealth() {
        return await this.request('/api/v1/observability/health');
    }

    // ============================================================================
    // TEST EXECUTION ENDPOINTS
    // ============================================================================

    /**
     * Execute a new test
     * @param {Object} testConfig - Test configuration
     * @returns {Promise<Object>} Test execution result
     */
    async executeTest(testConfig) {
        return await this.request('/api/v1/tests/execute', {
            method: 'POST',
            body: JSON.stringify(testConfig)
        });
    }

    /**
     * Get test execution status
     * @param {string} testId - Test ID
     * @returns {Promise<Object>} Test status data
     */
    async getTestStatus(testId) {
        return await this.request(`/api/v1/tests/${testId}/status`);
    }

    /**
     * Get complete test result
     * @param {string} testId - Test ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Test result data
     */
    async getTestResult(testId, options = {}) {
        const params = new URLSearchParams();
        if (options.includeArtifacts !== undefined) {
            params.append('includeArtifacts', options.includeArtifacts);
        }
        if (options.includeHealingAttempts !== undefined) {
            params.append('includeHealingAttempts', options.includeHealingAttempts);
        }
        if (options.includeMetrics !== undefined) {
            params.append('includeMetrics', options.includeMetrics);
        }
        
        const queryString = params.toString();
        const endpoint = `/api/v1/tests/${testId}/result${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Cancel a running test
     * @param {string} testId - Test ID
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelTest(testId) {
        return await this.request(`/api/v1/tests/${testId}/cancel`, {
            method: 'POST'
        });
    }

    /**
     * Get test execution queue status
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Queue status data
     */
    async getTestQueue(options = {}) {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page);
        if (options.limit) params.append('limit', options.limit);
        if (options.sort) params.append('sort', options.sort);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/tests/queue${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get available test engines
     * @returns {Promise<Object>} Available engines data
     */
    async getAvailableEngines() {
        return await this.request('/api/v1/tests/engines');
    }

    /**
     * Execute multiple tests in batch
     * @param {Array} tests - Array of test configurations
     * @param {Object} options - Batch options
     * @returns {Promise<Object>} Batch execution result
     */
    async executeBatchTests(tests, options = {}) {
        return await this.request('/api/v1/tests/batch', {
            method: 'POST',
            body: JSON.stringify({ tests, options })
        });
    }

    // ============================================================================
    // TEST RESULTS ENDPOINTS
    // ============================================================================

    /**
     * Get test results with filtering and pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Test results data
     */
    async getTestResults(options = {}) {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page);
        if (options.limit) params.append('limit', options.limit);
        if (options.status) params.append('status', options.status);
        if (options.engine) params.append('engine', options.engine);
        if (options.testName) params.append('testName', options.testName);
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.sort) params.append('sort', options.sort);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        if (options.includeArtifacts !== undefined) {
            params.append('includeArtifacts', options.includeArtifacts);
        }
        if (options.includeHealingAttempts !== undefined) {
            params.append('includeHealingAttempts', options.includeHealingAttempts);
        }
        
        const queryString = params.toString();
        const endpoint = `/api/v1/results${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get specific test result by ID
     * @param {string} testId - Test result ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Test result data
     */
    async getTestResultById(testId, options = {}) {
        const params = new URLSearchParams();
        if (options.includeArtifacts !== undefined) {
            params.append('includeArtifacts', options.includeArtifacts);
        }
        if (options.includeHealingAttempts !== undefined) {
            params.append('includeHealingAttempts', options.includeHealingAttempts);
        }
        if (options.includeMetrics !== undefined) {
            params.append('includeMetrics', options.includeMetrics);
        }
        if (options.includeOutput !== undefined) {
            params.append('includeOutput', options.includeOutput);
        }
        
        const queryString = params.toString();
        const endpoint = `/api/v1/results/${testId}${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get test results summary and statistics
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Results summary data
     */
    async getTestResultsSummary(options = {}) {
        const params = new URLSearchParams();
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.engine) params.append('engine', options.engine);
        if (options.groupBy) params.append('groupBy', options.groupBy);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/results/summary${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Generate a test report
     * @param {Object} reportConfig - Report configuration
     * @returns {Promise<Object>} Report generation result
     */
    async generateTestReport(reportConfig) {
        return await this.request('/api/v1/results/reports', {
            method: 'POST',
            body: JSON.stringify(reportConfig)
        });
    }

    /**
     * Get report status and details
     * @param {string} reportId - Report ID
     * @returns {Promise<Object>} Report status data
     */
    async getReportStatus(reportId) {
        return await this.request(`/api/v1/results/reports/${reportId}`);
    }

    /**
     * Download generated report
     * @param {string} reportId - Report ID
     * @returns {Promise<Object>} Report download data
     */
    async downloadReport(reportId) {
        return await this.request(`/api/v1/results/reports/${reportId}/download`);
    }

    /**
     * Get test artifacts
     * @param {string} testId - Test ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Test artifacts data
     */
    async getTestArtifacts(testId, options = {}) {
        const params = new URLSearchParams();
        if (options.type) params.append('type', options.type);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/results/artifacts/${testId}${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    // ============================================================================
    // HEALING MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * Get available healing strategies
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Healing strategies data
     */
    async getHealingStrategies(options = {}) {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page);
        if (options.limit) params.append('limit', options.limit);
        if (options.failureType) params.append('failureType', options.failureType);
        if (options.enabled !== undefined) params.append('enabled', options.enabled);
        if (options.sort) params.append('sort', options.sort);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/healing/strategies${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get specific healing strategy details
     * @param {string} strategyId - Strategy ID
     * @returns {Promise<Object>} Strategy details data
     */
    async getHealingStrategy(strategyId) {
        return await this.request(`/api/v1/healing/strategies/${strategyId}`);
    }

    /**
     * Update healing strategy configuration
     * @param {string} strategyId - Strategy ID
     * @param {Object} updates - Strategy updates
     * @returns {Promise<Object>} Update result
     */
    async updateHealingStrategy(strategyId, updates) {
        return await this.request(`/api/v1/healing/strategies/${strategyId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    /**
     * Get healing attempts with filtering and pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Healing attempts data
     */
    async getHealingAttempts(options = {}) {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page);
        if (options.limit) params.append('limit', options.limit);
        if (options.testId) params.append('testId', options.testId);
        if (options.strategy) params.append('strategy', options.strategy);
        if (options.success !== undefined) params.append('success', options.success);
        if (options.minConfidence) params.append('minConfidence', options.minConfidence);
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.sort) params.append('sort', options.sort);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/healing/attempts${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get specific healing attempt details
     * @param {string} attemptId - Attempt ID
     * @returns {Promise<Object>} Healing attempt data
     */
    async getHealingAttempt(attemptId) {
        return await this.request(`/api/v1/healing/attempts/${attemptId}`);
    }

    /**
     * Get healing statistics and metrics
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Healing statistics data
     */
    async getHealingStatistics(options = {}) {
        const params = new URLSearchParams();
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.groupBy) params.append('groupBy', options.groupBy);
        if (options.strategy) params.append('strategy', options.strategy);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/healing/statistics${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Manually trigger a healing attempt
     * @param {Object} healingConfig - Healing configuration
     * @returns {Promise<Object>} Healing attempt result
     */
    async triggerHealingAttempt(healingConfig) {
        return await this.request('/api/v1/healing/attempts', {
            method: 'POST',
            body: JSON.stringify(healingConfig)
        });
    }

    // ============================================================================
    // ENGINE MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * Get all available test engines
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Engines data
     */
    async getEngines(options = {}) {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page);
        if (options.limit) params.append('limit', options.limit);
        if (options.testType) params.append('testType', options.testType);
        if (options.status) params.append('status', options.status);
        if (options.supportsHealing !== undefined) {
            params.append('supportsHealing', options.supportsHealing);
        }
        if (options.sort) params.append('sort', options.sort);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/engines${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get specific test engine details
     * @param {string} engineId - Engine ID
     * @returns {Promise<Object>} Engine details data
     */
    async getEngine(engineId) {
        return await this.request(`/api/v1/engines/${engineId}`);
    }

    /**
     * Get test engine health status
     * @param {string} engineId - Engine ID
     * @returns {Promise<Object>} Engine health data
     */
    async getEngineHealth(engineId) {
        return await this.request(`/api/v1/engines/${engineId}/health`);
    }

    /**
     * Initialize a test engine
     * @param {string} engineId - Engine ID
     * @param {Object} config - Engine configuration
     * @param {boolean} force - Force initialization
     * @returns {Promise<Object>} Initialization result
     */
    async initializeEngine(engineId, config, force = false) {
        return await this.request(`/api/v1/engines/${engineId}/initialize`, {
            method: 'POST',
            body: JSON.stringify({ config, force })
        });
    }

    /**
     * Clean up test engine resources
     * @param {string} engineId - Engine ID
     * @returns {Promise<Object>} Cleanup result
     */
    async cleanupEngine(engineId) {
        return await this.request(`/api/v1/engines/${engineId}/cleanup`, {
            method: 'POST'
        });
    }

    /**
     * Update engine configuration
     * @param {string} engineId - Engine ID
     * @param {Object} config - New configuration
     * @param {boolean} restart - Restart engine after update
     * @returns {Promise<Object>} Update result
     */
    async updateEngineConfig(engineId, config, restart = false) {
        return await this.request(`/api/v1/engines/${engineId}/config`, {
            method: 'PUT',
            body: JSON.stringify({ config, restart })
        });
    }

    /**
     * Get engine performance metrics
     * @param {string} engineId - Engine ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Engine metrics data
     */
    async getEngineMetrics(engineId, options = {}) {
        const params = new URLSearchParams();
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.metric) params.append('metric', options.metric);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/engines/${engineId}/metrics${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get available test engine types
     * @returns {Promise<Object>} Engine types data
     */
    async getEngineTypes() {
        return await this.request('/api/v1/engines/types');
    }

    // ============================================================================
    // OBSERVABILITY ENDPOINTS
    // ============================================================================

    /**
     * Get system metrics
     * @param {Object} options - Query options
     * @returns {Promise<Object>} System metrics data
     */
    async getSystemMetrics(options = {}) {
        const params = new URLSearchParams();
        if (options.name) params.append('name', options.name);
        if (options.format) params.append('format', options.format);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/observability/metrics${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Get system logs
     * @param {Object} options - Query options
     * @returns {Promise<Object>} System logs data
     */
    async getSystemLogs(options = {}) {
        const params = new URLSearchParams();
        if (options.level) params.append('level', options.level);
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/observability/logs${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Create a new log entry
     * @param {Object} logEntry - Log entry data
     * @returns {Promise<Object>} Log creation result
     */
    async createLogEntry(logEntry) {
        return await this.request('/api/v1/observability/logs', {
            method: 'POST',
            body: JSON.stringify(logEntry)
        });
    }

    /**
     * Get available reports
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Available reports data
     */
    async getAvailableReports(options = {}) {
        const params = new URLSearchParams();
        if (options.type) params.append('type', options.type);
        if (options.limit) params.append('limit', options.limit);
        
        const queryString = params.toString();
        const endpoint = `/api/v1/observability/reports${queryString ? `?${queryString}` : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * Generate a new report
     * @param {Object} reportConfig - Report configuration
     * @returns {Promise<Object>} Report generation result
     */
    async generateReport(reportConfig) {
        return await this.request('/api/v1/observability/reports', {
            method: 'POST',
            body: JSON.stringify(reportConfig)
        });
    }

    /**
     * Get a specific report
     * @param {string} reportId - Report ID
     * @returns {Promise<Object>} Report data
     */
    async getReport(reportId) {
        return await this.request(`/api/v1/observability/reports/${reportId}`);
    }

    /**
     * Get observability system summary
     * @returns {Promise<Object>} Observability summary data
     */
    async getObservabilitySummary() {
        return await this.request('/api/v1/observability/summary');
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, ApiError };
}

// Global availability for browser usage
if (typeof window !== 'undefined') {
    window.ApiService = ApiService;
    window.ApiError = ApiError;
}
