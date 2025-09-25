/**
 * Self-Healing Test Automation Harness - Test Execution Interface
 * 
 * Advanced test execution interface with real-time monitoring, configuration management,
 * and comprehensive history tracking. Follows the project's glassmorphism design patterns
 * and accessibility standards.
 * 
 * Features:
 * - Dynamic test configuration forms based on selected engine
 * - Real-time test execution monitoring with progress indicators
 * - Test cancellation with confirmation dialogs
 * - Comprehensive test execution history with filtering
 * - Responsive design with mobile support
 * - Comprehensive error handling and user feedback
 */

class TestExecutionInterface {
    constructor(apiService, options = {}) {
        this.apiService = apiService || (window.ApiService ? new window.ApiService() : null);
        this.currentTestId = null;
        this.monitoringInterval = null;
        this.availableEngines = [];
        this.testHistory = [];
        this.currentHistoryPage = 1;
        this.historyPageSize = 10;
        this.isInitialized = false;

        // Support for dependency injection and test-friendly initialization
        this.options = {
            autoInit: true,
            enableLogging: true,
            ...options
        };

        if (!this.apiService) {
            if (this.options.enableLogging) {
                console.error('TestExecutionInterface: ApiService is required');
            }
            return;
        }

        // Allow disabling auto-initialization for testing
        if (this.options.autoInit) {
            this.init();
        }
    }

    async init() {
        try {
            await this.loadAvailableEngines();
            
            // Skip DOM-dependent initialization in test environment
            if (!this.options.skipDOMInit) {
                this.setupEventListeners();
                this.setupTestConfigurationForm();
                await this.loadTestHistory();
            }
            
            this.isInitialized = true;
            if (this.options.enableLogging) {
                console.log('TestExecutionInterface initialized successfully');
            }
        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to initialize TestExecutionInterface:', error);
            }
            if (this.showNotification) {
                this.showNotification('Failed to initialize test execution interface', 'error');
            }
        }
    }

    /**
     * Load available test engines from the API
     */
    async loadAvailableEngines() {
        try {
            const response = await this.apiService.getAvailableEngines();
            this.availableEngines = response.data?.engines || [];
            if (this.options.enableLogging) {
                console.log('Loaded engines:', this.availableEngines);
            }
        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to load available engines:', error);
            }
            this.availableEngines = [
                { name: 'playwright', testType: 'e2e', supportsHealing: true },
                { name: 'jest', testType: 'unit', supportsHealing: false },
                { name: 'k6', testType: 'performance', supportsHealing: false }
            ];
        }
    }

    /**
     * Setup event listeners for the interface
     */
    setupEventListeners() {
        // Engine selection change
        const engineSelect = document.getElementById('test-engine-select');
        if (engineSelect) {
            engineSelect.addEventListener('change', (e) => {
                this.updateEngineSpecificOptions(e.target.value);
            });
        }

        // Test execution form submission
        const executeForm = document.getElementById('test-execution-form');
        if (executeForm) {
            executeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.executeTest();
            });
        }

        // Cancel test button
        const cancelButton = document.getElementById('cancel-test-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.cancelCurrentTest();
            });
        }

        // History refresh button
        const refreshHistoryButton = document.getElementById('refresh-history-button');
        if (refreshHistoryButton) {
            refreshHistoryButton.addEventListener('click', () => {
                this.loadTestHistory();
            });
        }

        // History pagination
        const prevPageButton = document.getElementById('history-prev-page');
        const nextPageButton = document.getElementById('history-next-page');
        
        if (prevPageButton) {
            prevPageButton.addEventListener('click', () => {
                if (this.currentHistoryPage > 1) {
                    this.currentHistoryPage--;
                    this.loadTestHistory();
                }
            });
        }

        if (nextPageButton) {
            nextPageButton.addEventListener('click', () => {
                this.currentHistoryPage++;
                this.loadTestHistory();
            });
        }

        // Quick action buttons (if they exist from the original HTML)
        const quickActionButtons = document.querySelectorAll('[id^="run-"][id$="-tests"]');
        quickActionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const testType = this.extractTestTypeFromButtonId(button.id);
                this.executeQuickTest(testType);
            });
        });
    }

    /**
     * Setup the test configuration form with dynamic engine selection
     */
    setupTestConfigurationForm() {
        this.renderEngineSelector();
        this.renderTestConfigurationForm();
        this.renderTestMonitoringSection();
        this.renderTestHistorySection();
    }

    /**
     * Render the engine selector dropdown
     */
    renderEngineSelector() {
        const executionCard = document.querySelector('#execution .execution-card:last-child');
        if (!executionCard) return;

        const engineSelectorHTML = `
            <div class="engine-selector-container">
                <label for="test-engine-select" class="form-label">
                    <span class="label-text">Test Engine</span>
                    <span class="label-required" aria-label="Required field">*</span>
                </label>
                <select id="test-engine-select" class="form-select" required aria-describedby="engine-help">
                    <option value="">Select a test engine...</option>
                    ${this.availableEngines.map(engine => `
                        <option value="${engine.name}" 
                                data-test-type="${engine.testType}" 
                                data-supports-healing="${engine.supportsHealing}">
                            ${engine.name} (${engine.testType})
                            ${engine.supportsHealing ? '🩹' : ''}
                        </option>
                    `).join('')}
                </select>
                <div id="engine-help" class="form-help">
                    Choose the test engine for your test execution. Engines with 🩹 support self-healing.
                </div>
            </div>
        `;

        executionCard.innerHTML = `<h3>Test Configuration</h3>${engineSelectorHTML}`;
    }

    /**
     * Render the main test configuration form
     */
    renderTestConfigurationForm() {
        const executionCard = document.querySelector('#execution .execution-card:last-child');
        if (!executionCard) return;

        const formHTML = `
            <form id="test-execution-form" class="test-execution-form" novalidate>
                <div class="form-row">
                    <div class="form-group">
                        <label for="test-name" class="form-label">
                            <span class="label-text">Test Name</span>
                            <span class="label-required" aria-label="Required field">*</span>
                        </label>
                        <input type="text" 
                               id="test-name" 
                               name="testName" 
                               class="form-input" 
                               required 
                               maxlength="100"
                               placeholder="Enter a descriptive test name..."
                               aria-describedby="test-name-help">
                        <div id="test-name-help" class="form-help">
                            Provide a clear, descriptive name for your test execution.
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="test-description" class="form-label">
                            <span class="label-text">Description</span>
                        </label>
                        <textarea id="test-description" 
                                  name="testDescription" 
                                  class="form-textarea" 
                                  rows="3" 
                                  maxlength="500"
                                  placeholder="Optional description of what this test does..."
                                  aria-describedby="test-description-help"></textarea>
                        <div id="test-description-help" class="form-help">
                            Optional detailed description of the test purpose and scope.
                        </div>
                    </div>
                </div>

                <div id="engine-specific-options" class="engine-options-container">
                    <!-- Engine-specific options will be rendered here -->
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="test-timeout" class="form-label">
                            <span class="label-text">Timeout (seconds)</span>
                        </label>
                        <input type="number" 
                               id="test-timeout" 
                               name="timeout" 
                               class="form-input" 
                               min="10" 
                               max="3600" 
                               value="300"
                               aria-describedby="timeout-help">
                        <div id="timeout-help" class="form-help">
                            Maximum time to wait for test completion (10-3600 seconds).
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="test-retries" class="form-label">
                            <span class="label-text">Retry Attempts</span>
                        </label>
                        <input type="number" 
                               id="test-retries" 
                               name="retries" 
                               class="form-input" 
                               min="0" 
                               max="5" 
                               value="2"
                               aria-describedby="retries-help">
                        <div id="retries-help" class="form-help">
                            Number of retry attempts on failure (0-5).
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="enable-healing" 
                                   name="enableHealing" 
                                   class="form-checkbox"
                                   checked>
                            <span class="checkbox-text">Enable Self-Healing</span>
                        </label>
                        <div class="form-help">
                            Allow AI-powered self-healing to attempt automatic test recovery.
                        </div>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="parallel-execution" 
                                   name="parallelExecution" 
                                   class="form-checkbox">
                            <span class="checkbox-text">Parallel Execution</span>
                        </label>
                        <div class="form-help">
                            Run tests in parallel when possible (engine dependent).
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" 
                            id="execute-test-button" 
                            class="btn btn-primary"
                            aria-describedby="execute-help">
                        <span class="button-icon">▶️</span>
                        Execute Test
                    </button>
                    <button type="button" 
                            id="cancel-test-button" 
                            class="btn btn-danger"
                            disabled
                            style="display: none;">
                        <span class="button-icon">⏹️</span>
                        Cancel Test
                    </button>
                    <button type="reset" 
                            class="btn btn-secondary">
                        <span class="button-icon">🔄</span>
                        Reset Form
                    </button>
                </div>
                <div id="execute-help" class="form-help">
                    Execute the configured test with the selected engine and options.
                </div>
            </form>
        `;

        executionCard.innerHTML = `<h3>Test Configuration</h3>${formHTML}`;
    }

    /**
     * Update engine-specific configuration options
     */
    updateEngineSpecificOptions(engineName) {
        const optionsContainer = document.getElementById('engine-specific-options');
        const healingCheckbox = document.getElementById('enable-healing');
        
        if (!optionsContainer) return;

        // Find the selected engine
        const selectedEngine = this.availableEngines.find(e => e.name === engineName);
        
        // Update healing checkbox availability
        if (healingCheckbox) {
            healingCheckbox.disabled = !selectedEngine?.supportsHealing;
            if (!selectedEngine?.supportsHealing) {
                healingCheckbox.checked = false;
            }
        }

        if (!engineName) {
            optionsContainer.innerHTML = '';
            return;
        }

        let optionsHTML = '<h4 class="engine-options-title">Engine-Specific Options</h4>';

        switch (engineName) {
            case 'playwright':
                optionsHTML += this.renderPlaywrightOptions();
                break;
            case 'jest':
                optionsHTML += this.renderJestOptions();
                break;
            case 'k6':
                optionsHTML += this.renderK6Options();
                break;
            case 'owasp-zap':
                optionsHTML += this.renderOwaspZapOptions();
                break;
            default:
                optionsHTML += '<p class="engine-options-placeholder">No specific options available for this engine.</p>';
        }

        optionsContainer.innerHTML = optionsHTML;
    }

    /**
     * Render Playwright-specific options
     */
    renderPlaywrightOptions() {
        return `
            <div class="engine-options playwright-options">
                <div class="form-row">
                    <div class="form-group">
                        <label for="playwright-url" class="form-label">
                            <span class="label-text">Target URL</span>
                            <span class="label-required">*</span>
                        </label>
                        <input type="url" 
                               id="playwright-url" 
                               name="playwrightUrl" 
                               class="form-input" 
                               required
                               placeholder="https://example.com"
                               value="https://example.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="playwright-browser" class="form-label">
                            <span class="label-text">Browser</span>
                        </label>
                        <select id="playwright-browser" name="playwrightBrowser" class="form-select">
                            <option value="chromium" selected>Chromium</option>
                            <option value="firefox">Firefox</option>
                            <option value="webkit">WebKit</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="playwright-headless" 
                                   name="playwrightHeadless" 
                                   class="form-checkbox"
                                   checked>
                            <span class="checkbox-text">Headless Mode</span>
                        </label>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="playwright-video" 
                                   name="playwrightVideo" 
                                   class="form-checkbox">
                            <span class="checkbox-text">Record Video</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render Jest-specific options
     */
    renderJestOptions() {
        return `
            <div class="engine-options jest-options">
                <div class="form-row">
                    <div class="form-group">
                        <label for="jest-environment" class="form-label">
                            <span class="label-text">Test Environment</span>
                        </label>
                        <select id="jest-environment" name="jestEnvironment" class="form-select">
                            <option value="node" selected>Node</option>
                            <option value="jsdom">JSDOM</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="jest-workers" class="form-label">
                            <span class="label-text">Max Workers</span>
                        </label>
                        <input type="number" 
                               id="jest-workers" 
                               name="jestWorkers" 
                               class="form-input" 
                               min="1" 
                               max="8" 
                               value="2">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="jest-coverage" 
                                   name="jestCoverage" 
                                   class="form-checkbox"
                                   checked>
                            <span class="checkbox-text">Generate Coverage Report</span>
                        </label>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="jest-verbose" 
                                   name="jestVerbose" 
                                   class="form-checkbox">
                            <span class="checkbox-text">Verbose Output</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render k6-specific options
     */
    renderK6Options() {
        return `
            <div class="engine-options k6-options">
                <div class="form-row">
                    <div class="form-group">
                        <label for="k6-vus" class="form-label">
                            <span class="label-text">Virtual Users (VUs)</span>
                        </label>
                        <input type="number" 
                               id="k6-vus" 
                               name="k6Vus" 
                               class="form-input" 
                               min="1" 
                               max="1000" 
                               value="10">
                    </div>
                    
                    <div class="form-group">
                        <label for="k6-duration" class="form-label">
                            <span class="label-text">Duration</span>
                        </label>
                        <input type="text" 
                               id="k6-duration" 
                               name="k6Duration" 
                               class="form-input" 
                               placeholder="30s, 5m, 1h"
                               value="30s">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="k6-thresholds" class="form-label">
                        <span class="label-text">Performance Thresholds</span>
                    </label>
                    <textarea id="k6-thresholds" 
                              name="k6Thresholds" 
                              class="form-textarea" 
                              rows="3"
                              placeholder='{"http_req_duration": ["p(95)<200"]}'></textarea>
                    <div class="form-help">JSON format for performance thresholds</div>
                </div>
            </div>
        `;
    }

    /**
     * Render OWASP ZAP-specific options
     */
    renderOwaspZapOptions() {
        return `
            <div class="engine-options owasp-zap-options">
                <div class="form-row">
                    <div class="form-group">
                        <label for="zap-proxy" class="form-label">
                            <span class="label-text">Proxy URL</span>
                        </label>
                        <input type="text" 
                               id="zap-proxy" 
                               name="zapProxy" 
                               class="form-input" 
                               placeholder="http://localhost:8080"
                               value="http://localhost:8080">
                    </div>
                    
                    <div class="form-group">
                        <label for="zap-context" class="form-label">
                            <span class="label-text">Context</span>
                        </label>
                        <input type="text" 
                               id="zap-context" 
                               name="zapContext" 
                               class="form-input" 
                               value="default">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="zap-policy" class="form-label">
                        <span class="label-text">Scan Policy</span>
                    </label>
                    <select id="zap-policy" name="zapPolicy" class="form-select">
                        <option value="API" selected>API</option>
                        <option value="Web">Web Application</option>
                        <option value="Quick">Quick Scan</option>
                        <option value="Full">Full Scan</option>
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Render the test monitoring section
     */
    renderTestMonitoringSection() {
        const executionSection = document.getElementById('execution');
        if (!executionSection) return;

        const monitoringHTML = `
            <div class="execution-card test-monitoring-card" style="display: none;">
                <h3>Test Execution Monitor</h3>
                <div class="test-status-container">
                    <div class="test-status-header">
                        <div class="status-badge" id="test-status-badge">
                            <span class="status-indicator"></span>
                            <span class="status-text">Idle</span>
                        </div>
                        <div class="test-id-display">
                            <span class="test-id-label">Test ID:</span>
                            <span class="test-id-value" id="current-test-id">-</span>
                        </div>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="test-progress-fill"></div>
                        </div>
                        <div class="progress-text">
                            <span id="test-progress-text">0%</span>
                            <span id="test-elapsed-time">0s</span>
                        </div>
                    </div>
                    
                    <div class="test-details">
                        <div class="detail-item">
                            <span class="detail-label">Test Name:</span>
                            <span class="detail-value" id="monitor-test-name">-</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Engine:</span>
                            <span class="detail-value" id="monitor-test-engine">-</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Started:</span>
                            <span class="detail-value" id="monitor-start-time">-</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Duration:</span>
                            <span class="detail-value" id="monitor-duration">-</span>
                        </div>
                    </div>
                    
                    <div class="test-output-container">
                        <h4>Test Output</h4>
                        <div class="test-output" id="test-output">
                            <p class="output-placeholder">Test output will appear here...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const executionGrid = executionSection.querySelector('.execution-grid');
        if (executionGrid) {
            executionGrid.insertAdjacentHTML('beforeend', monitoringHTML);
        }
    }

    /**
     * Render the test history section
     */
    renderTestHistorySection() {
        const executionSection = document.getElementById('execution');
        if (!executionSection) return;

        const historyHTML = `
            <div class="execution-card test-history-card">
                <div class="card-header">
                    <h3>Test Execution History</h3>
                    <button id="refresh-history-button" 
                            class="btn btn-icon" 
                            title="Refresh History"
                            aria-label="Refresh test execution history">
                        🔄
                    </button>
                </div>
                
                <div class="history-filters">
                    <div class="filter-group">
                        <label for="history-status-filter" class="form-label">Status:</label>
                        <select id="history-status-filter" class="form-select form-select-sm">
                            <option value="">All</option>
                            <option value="running">Running</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="history-engine-filter" class="form-label">Engine:</label>
                        <select id="history-engine-filter" class="form-select form-select-sm">
                            <option value="">All</option>
                            ${this.availableEngines.map(engine => 
                                `<option value="${engine.name}">${engine.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="history-table-container">
                    <table class="history-table" role="table" aria-label="Test execution history">
                        <thead>
                            <tr role="row">
                                <th role="columnheader">Test Name</th>
                                <th role="columnheader">Engine</th>
                                <th role="columnheader">Status</th>
                                <th role="columnheader">Duration</th>
                                <th role="columnheader">Started</th>
                                <th role="columnheader">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="history-table-body">
                            <tr>
                                <td colspan="6" class="history-loading">Loading test history...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="history-pagination">
                    <button id="history-prev-page" 
                            class="btn btn-secondary btn-sm" 
                            disabled>
                        ← Previous
                    </button>
                    <span class="pagination-info" id="history-pagination-info">
                        Page 1 of 1
                    </span>
                    <button id="history-next-page" 
                            class="btn btn-secondary btn-sm" 
                            disabled>
                        Next →
                    </button>
                </div>
            </div>
        `;

        const executionGrid = executionSection.querySelector('.execution-grid');
        if (executionGrid) {
            executionGrid.insertAdjacentHTML('beforeend', historyHTML);
        }

        // Setup history filter event listeners
        this.setupHistoryFilters();
    }

    /**
     * Setup event listeners for history filters
     */
    setupHistoryFilters() {
        const statusFilter = document.getElementById('history-status-filter');
        const engineFilter = document.getElementById('history-engine-filter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentHistoryPage = 1;
                this.loadTestHistory();
            });
        }

        if (engineFilter) {
            engineFilter.addEventListener('change', () => {
                this.currentHistoryPage = 1;
                this.loadTestHistory();
            });
        }
    }

    /**
     * Execute a test based on form configuration
     */
    async executeTest() {
        const executeButton = document.getElementById('execute-test-button');
        const cancelButton = document.getElementById('cancel-test-button');
        const form = document.getElementById('test-execution-form');

        if (!form || !this.validateForm(form)) {
            return;
        }

        try {
            // Disable execute button and show cancel button
            executeButton.disabled = true;
            executeButton.innerHTML = '<span class="button-icon">⏳</span> Starting...';
            cancelButton.style.display = 'inline-block';
            cancelButton.disabled = false;

            // Get form data
            const formData = new FormData(form);
            const testConfig = this.buildTestConfigFromForm(formData);

            // Execute the test
            const response = await this.apiService.executeTest(testConfig);
            
            if (response.success && response.data) {
                this.currentTestId = response.data.testId;
                this.showNotification(`Test started successfully! ID: ${this.currentTestId}`, 'success');
                
                // Show monitoring section and start monitoring
                this.showTestMonitoring(testConfig, response.data);
                this.startTestMonitoring();
            } else {
                throw new Error(response.message || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('Test execution failed:', error);
            this.showNotification(`Test execution failed: ${error.message}`, 'error');
            this.resetExecutionUI();
        }
    }

    /**
     * Execute a quick test (from the quick action buttons)
     */
    async executeQuickTest(testType) {
        try {
            const testConfig = this.createQuickTestConfig(testType);
            
            const response = await this.apiService.executeTest(testConfig);
            
            if (response.success && response.data) {
                this.currentTestId = response.data.testId;
                this.showNotification(`${testType} test started! ID: ${this.currentTestId}`, 'success');
                
                // Show monitoring section and start monitoring
                this.showTestMonitoring(testConfig, response.data);
                this.startTestMonitoring();
            }

        } catch (error) {
            console.error(`Quick ${testType} test execution failed:`, error);
            this.showNotification(`${testType} test execution failed: ${error.message}`, 'error');
        }
    }

    /**
     * Create a quick test configuration
     */
    createQuickTestConfig(testType) {
        const configs = {
            'all': {
                name: 'All Tests Suite',
                engine: 'playwright',
                config: { url: 'https://example.com', browser: 'chromium', headless: true }
            },
            'unit': {
                name: 'Unit Tests Suite',
                engine: 'jest',
                config: { testEnvironment: 'node', coverage: true }
            },
            'e2e': {
                name: 'E2E Tests Suite',
                engine: 'playwright',
                config: { url: 'https://example.com', browser: 'chromium', headless: true }
            },
            'performance': {
                name: 'Performance Tests Suite',
                engine: 'k6',
                config: { vus: 10, duration: '30s' }
            }
        };

        const baseConfig = configs[testType] || configs['all'];
        
        return {
            ...baseConfig,
            description: `Quick ${testType} test execution from dashboard`,
            options: {
                timeout: 300,
                retries: 2,
                parallel: false,
                healing: true
            }
        };
    }

    /**
     * Validate the test execution form
     */
    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        // Additional validation for specific fields
        const urlField = document.getElementById('playwright-url');
        if (urlField && urlField.value) {
            try {
                new URL(urlField.value);
                this.clearFieldError(urlField);
            } catch (e) {
                this.showFieldError(urlField, 'Please enter a valid URL');
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * Show field validation error
     */
    showFieldError(field, message) {
        field.classList.add('field-error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.textContent = message;
        errorDiv.setAttribute('role', 'alert');
        field.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field validation error
     */
    clearFieldError(field) {
        field.classList.remove('field-error');
        const errorMessage = field.parentNode.querySelector('.field-error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    /**
     * Build test configuration from form data
     */
    buildTestConfigFromForm(formData) {
        const engineName = document.getElementById('test-engine-select')?.value;
        
        const config = {
            name: formData.get('testName'),
            description: formData.get('testDescription') || '',
            engine: engineName,
            options: {
                timeout: parseInt(formData.get('timeout')) * 1000, // Convert to milliseconds
                retries: parseInt(formData.get('retries')),
                parallel: formData.get('parallelExecution') === 'on',
                healing: formData.get('enableHealing') === 'on'
            },
            config: this.buildEngineSpecificConfig(engineName, formData)
        };

        return config;
    }

    /**
     * Build engine-specific configuration
     */
    buildEngineSpecificConfig(engineName, formData) {
        switch (engineName) {
            case 'playwright':
                return {
                    url: formData.get('playwrightUrl'),
                    browser: formData.get('playwrightBrowser') || 'chromium',
                    headless: formData.get('playwrightHeadless') === 'on',
                    video: formData.get('playwrightVideo') === 'on'
                };
            
            case 'jest':
                return {
                    testEnvironment: formData.get('jestEnvironment') || 'node',
                    maxWorkers: parseInt(formData.get('jestWorkers')) || 2,
                    coverage: formData.get('jestCoverage') === 'on',
                    verbose: formData.get('jestVerbose') === 'on'
                };
            
            case 'k6':
                const thresholdsText = formData.get('k6Thresholds');
                let thresholds = {};
                
                if (thresholdsText) {
                    try {
                        thresholds = JSON.parse(thresholdsText);
                    } catch (e) {
                        console.warn('Invalid thresholds JSON, using default');
                        thresholds = { http_req_duration: ['p(95)<200'] };
                    }
                }
                
                return {
                    vus: parseInt(formData.get('k6Vus')) || 10,
                    duration: formData.get('k6Duration') || '30s',
                    thresholds
                };
            
            case 'owasp-zap':
                return {
                    proxy: formData.get('zapProxy') || 'http://localhost:8080',
                    context: formData.get('zapContext') || 'default',
                    policy: formData.get('zapPolicy') || 'API'
                };
            
            default:
                return {};
        }
    }

    /**
     * Show the test monitoring section
     */
    showTestMonitoring(testConfig, executionData) {
        const monitoringCard = document.querySelector('.test-monitoring-card');
        if (!monitoringCard) return;

        monitoringCard.style.display = 'block';

        // Update monitoring display
        document.getElementById('current-test-id').textContent = executionData.testId;
        document.getElementById('monitor-test-name').textContent = testConfig.name;
        document.getElementById('monitor-test-engine').textContent = testConfig.engine;
        document.getElementById('monitor-start-time').textContent = new Date().toLocaleTimeString();
        
        // Reset progress
        document.getElementById('test-progress-fill').style.width = '0%';
        document.getElementById('test-progress-text').textContent = '0%';
        document.getElementById('test-elapsed-time').textContent = '0s';
        
        // Update status badge
        this.updateStatusBadge('running', 'Test is running...');
        
        // Clear output
        const outputContainer = document.getElementById('test-output');
        if (outputContainer) {
            outputContainer.innerHTML = '<p class="output-placeholder">Waiting for test output...</p>';
        }
    }

    /**
     * Start monitoring the current test
     */
    startTestMonitoring() {
        if (!this.currentTestId || this.monitoringInterval) {
            return;
        }

        const startTime = Date.now();

        this.monitoringInterval = setInterval(async () => {
            try {
                const response = await this.apiService.getTestStatus(this.currentTestId);
                
                if (response.success && response.data) {
                    const status = response.data;
                    
                    // Update progress
                    const progress = status.progress || 0;
                    document.getElementById('test-progress-fill').style.width = `${progress}%`;
                    document.getElementById('test-progress-text').textContent = `${progress}%`;
                    
                    // Update elapsed time
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    document.getElementById('test-elapsed-time').textContent = `${elapsed}s`;
                    
                    // Update duration if available
                    if (status.duration) {
                        document.getElementById('monitor-duration').textContent = `${Math.floor(status.duration / 1000)}s`;
                    }
                    
                    // Update status badge
                    this.updateStatusBadge(status.status, this.getStatusMessage(status.status));
                    
                    // Check if test is complete
                    if (status.status === 'passed' || status.status === 'failed') {
                        this.stopTestMonitoring();
                        this.onTestComplete(status);
                    }
                }
                
            } catch (error) {
                console.error('Failed to get test status:', error);
            }
        }, 2000); // Poll every 2 seconds
    }

    /**
     * Stop monitoring the current test
     */
    stopTestMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Handle test completion
     */
    async onTestComplete(status) {
        // Get full test result
        try {
            const resultResponse = await this.apiService.getTestResult(this.currentTestId);
            
            if (resultResponse.success && resultResponse.data) {
                const result = resultResponse.data;
                
                // Update output
                const outputContainer = document.getElementById('test-output');
                if (outputContainer && result.output) {
                    outputContainer.innerHTML = `<pre class="test-output-text">${result.output}</pre>`;
                }
                
                // Show completion notification
                const message = status.status === 'passed' 
                    ? `Test completed successfully in ${Math.floor(status.duration / 1000)}s`
                    : `Test failed after ${Math.floor(status.duration / 1000)}s`;
                
                this.showNotification(message, status.status === 'passed' ? 'success' : 'error');
            }
            
        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to get test result:', error);
            }
        }

        // Stop monitoring first
        this.stopTestMonitoring();
        
        // Reset UI
        this.resetExecutionUI();
        
        // Refresh history
        this.loadTestHistory();
    }

    /**
     * Cancel the current test
     */
    async cancelCurrentTest() {
        if (!this.currentTestId) {
            return;
        }

        // Show confirmation dialog
        if (!confirm('Are you sure you want to cancel the running test?')) {
            return;
        }

        try {
            const response = await this.apiService.cancelTest(this.currentTestId);
            
            if (response.success) {
                this.showNotification('Test cancelled successfully', 'warning');
                this.stopTestMonitoring();
                this.updateStatusBadge('failed', 'Test cancelled by user');
                this.resetExecutionUI();
                this.loadTestHistory();
            }
            
        } catch (error) {
            console.error('Failed to cancel test:', error);
            this.showNotification(`Failed to cancel test: ${error.message}`, 'error');
        }
    }

    /**
     * Reset the execution UI to initial state
     */
    resetExecutionUI() {
        const executeButton = document.getElementById('execute-test-button');
        const cancelButton = document.getElementById('cancel-test-button');

        if (executeButton) {
            executeButton.disabled = false;
            executeButton.innerHTML = '<span class="button-icon">▶️</span> Execute Test';
        }

        if (cancelButton) {
            cancelButton.style.display = 'none';
            cancelButton.disabled = true;
        }

        this.currentTestId = null;
    }

    /**
     * Update the status badge
     */
    updateStatusBadge(status, message) {
        const badge = document.getElementById('test-status-badge');
        if (!badge) return;

        const indicator = badge.querySelector('.status-indicator');
        const text = badge.querySelector('.status-text');

        // Remove all status classes
        badge.className = 'status-badge';
        
        // Add current status class
        badge.classList.add(`status-${status}`);
        
        if (text) {
            text.textContent = message || status;
        }
    }

    /**
     * Get status message for display
     */
    getStatusMessage(status) {
        const messages = {
            'running': 'Test is running...',
            'passed': 'Test completed successfully',
            'failed': 'Test failed',
            'cancelled': 'Test was cancelled'
        };
        
        return messages[status] || status;
    }

    /**
     * Load test execution history
     */
    async loadTestHistory() {
        const tableBody = document.getElementById('history-table-body');
        if (!tableBody) {
            // In test environment, just return without error
            if (this.options.enableLogging) {
                console.log('loadTestHistory: DOM element not found, skipping');
            }
            return;
        }

        try {
            // Show loading
            tableBody.innerHTML = '<tr><td colspan="6" class="history-loading">Loading test history...</td></tr>';

            // Get filter values
            const statusFilter = document.getElementById('history-status-filter')?.value || '';
            const engineFilter = document.getElementById('history-engine-filter')?.value || '';

            // Build query options
            const options = {
                page: this.currentHistoryPage,
                limit: this.historyPageSize,
                sort: 'desc',
                sortBy: 'startTime'
            };

            if (statusFilter) options.status = statusFilter;
            if (engineFilter) options.engine = engineFilter;

            const response = await this.apiService.getTestResults(options);
            
            if (response.success && response.data) {
                this.renderTestHistory(response.data);
            } else {
                throw new Error('Failed to load test history');
            }

        } catch (error) {
            console.error('Failed to load test history:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="history-error">Failed to load test history</td></tr>';
        }
    }

    /**
     * Render test history table
     */
    renderTestHistory(data) {
        const tableBody = document.getElementById('history-table-body');
        const paginationInfo = document.getElementById('history-pagination-info');
        const prevButton = document.getElementById('history-prev-page');
        const nextButton = document.getElementById('history-next-page');

        if (!tableBody) return;

        const tests = data.items || [];

        if (tests.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="history-empty">No test executions found</td></tr>';
            return;
        }

        // Render table rows
        tableBody.innerHTML = tests.map(test => `
            <tr class="history-row" data-test-id="${test.id}">
                <td class="test-name-cell">
                    <div class="test-name" title="${test.name}">${test.name}</div>
                    ${test.description ? `<div class="test-description">${test.description}</div>` : ''}
                </td>
                <td class="engine-cell">
                    <span class="engine-badge engine-${test.engine || 'unknown'}">${test.engine || 'Unknown'}</span>
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${test.status}">${test.status}</span>
                </td>
                <td class="duration-cell">
                    ${test.duration ? `${Math.floor(test.duration / 1000)}s` : '-'}
                </td>
                <td class="start-time-cell">
                    ${test.startTime ? new Date(test.startTime).toLocaleString() : '-'}
                </td>
                <td class="actions-cell">
                    <button class="btn btn-icon btn-sm view-result-btn" 
                            data-test-id="${test.id}"
                            title="View Details"
                            aria-label="View test result details">
                        👁️
                    </button>
                    ${test.status === 'running' ? `
                        <button class="btn btn-icon btn-sm cancel-test-btn" 
                                data-test-id="${test.id}"
                                title="Cancel Test"
                                aria-label="Cancel running test">
                            ⏹️
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        // Update pagination
        if (paginationInfo && data.pagination) {
            const { page, totalPages, total } = data.pagination;
            paginationInfo.textContent = `Page ${page} of ${totalPages} (${total} total)`;
            
            if (prevButton) {
                prevButton.disabled = page <= 1;
            }
            
            if (nextButton) {
                nextButton.disabled = page >= totalPages;
            }
        }

        // Add event listeners to action buttons
        this.setupHistoryActionButtons();
    }

    /**
     * Setup event listeners for history action buttons
     */
    setupHistoryActionButtons() {
        // View result buttons
        document.querySelectorAll('.view-result-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const testId = e.target.dataset.testId;
                await this.viewTestResult(testId);
            });
        });

        // Cancel test buttons
        document.querySelectorAll('.cancel-test-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const testId = e.target.dataset.testId;
                await this.cancelTestFromHistory(testId);
            });
        });
    }

    /**
     * View detailed test result
     */
    async viewTestResult(testId) {
        try {
            const response = await this.apiService.getTestResultById(testId, {
                includeArtifacts: true,
                includeHealingAttempts: true,
                includeMetrics: true,
                includeOutput: true
            });

            if (response.success && response.data) {
                this.showTestResultModal(response.data);
            }

        } catch (error) {
            console.error('Failed to load test result:', error);
            this.showNotification(`Failed to load test result: ${error.message}`, 'error');
        }
    }

    /**
     * Show test result in a modal dialog
     */
    showTestResultModal(testResult) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="test-result-modal">
                <div class="modal-dialog modal-large">
                    <div class="modal-header">
                        <h3>Test Result Details</h3>
                        <button class="modal-close" aria-label="Close modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="result-summary">
                            <div class="summary-item">
                                <span class="summary-label">Test Name:</span>
                                <span class="summary-value">${testResult.name}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Status:</span>
                                <span class="status-badge status-${testResult.status}">${testResult.status}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Duration:</span>
                                <span class="summary-value">${testResult.duration ? Math.floor(testResult.duration / 1000) + 's' : '-'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Started:</span>
                                <span class="summary-value">${testResult.startTime ? new Date(testResult.startTime).toLocaleString() : '-'}</span>
                            </div>
                        </div>
                        
                        ${testResult.output ? `
                            <div class="result-section">
                                <h4>Test Output</h4>
                                <pre class="test-output-text">${testResult.output}</pre>
                            </div>
                        ` : ''}
                        
                        ${testResult.errors && testResult.errors.length > 0 ? `
                            <div class="result-section">
                                <h4>Errors (${testResult.errors.length})</h4>
                                <div class="error-list">
                                    ${testResult.errors.map(error => `
                                        <div class="error-item">
                                            <div class="error-message">${error.message}</div>
                                            ${error.stack ? `<pre class="error-stack">${error.stack}</pre>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${testResult.healingAttempts && testResult.healingAttempts.length > 0 ? `
                            <div class="result-section">
                                <h4>Healing Attempts (${testResult.healingAttempts.length})</h4>
                                <div class="healing-list">
                                    ${testResult.healingAttempts.map(attempt => `
                                        <div class="healing-item">
                                            <div class="healing-header">
                                                <span class="healing-strategy">${attempt.strategy}</span>
                                                <span class="healing-confidence">Confidence: ${(attempt.confidence * 100).toFixed(1)}%</span>
                                                <span class="healing-result ${attempt.success ? 'success' : 'failed'}">
                                                    ${attempt.success ? '✅ Success' : '❌ Failed'}
                                                </span>
                                            </div>
                                            ${attempt.description ? `<div class="healing-description">${attempt.description}</div>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${testResult.metrics ? `
                            <div class="result-section">
                                <h4>Performance Metrics</h4>
                                <div class="metrics-grid">
                                    <div class="metric-item">
                                        <span class="metric-label">Memory Usage:</span>
                                        <span class="metric-value">${testResult.metrics.memoryUsage || 0} MB</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">CPU Usage:</span>
                                        <span class="metric-value">${testResult.metrics.cpuUsage || 0}%</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Network Requests:</span>
                                        <span class="metric-value">${testResult.metrics.networkRequests || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-close">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup modal event listeners
        const modal = document.getElementById('test-result-modal');
        const closeButtons = modal.querySelectorAll('.modal-close');
        
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.remove();
            });
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    /**
     * Cancel test from history
     */
    async cancelTestFromHistory(testId) {
        if (!confirm('Are you sure you want to cancel this test?')) {
            return;
        }

        try {
            const response = await this.apiService.cancelTest(testId);
            
            if (response.success) {
                this.showNotification('Test cancelled successfully', 'warning');
                this.loadTestHistory();
            }

        } catch (error) {
            console.error('Failed to cancel test:', error);
            this.showNotification(`Failed to cancel test: ${error.message}`, 'error');
        }
    }

    /**
     * Extract test type from button ID
     */
    extractTestTypeFromButtonId(buttonId) {
        const match = buttonId.match(/run-(.+)-tests/);
        return match ? match[1] : 'all';
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Use the same notification system as the main dashboard
        if (window.dashboard && typeof window.dashboard.showNotification === 'function') {
            window.dashboard.showNotification(message, type);
            return;
        }

        // Fallback notification implementation
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        const colors = {
            success: '#4ade80',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.stopTestMonitoring();
        this.currentTestId = null;
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestExecutionInterface };
}

// Global availability for browser usage
if (typeof window !== 'undefined') {
    window.TestExecutionInterface = TestExecutionInterface;
}
