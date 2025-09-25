/**
 * Self-Healing Test Automation Harness - Test Results Visualization
 * Handles test results display, filtering, and artifact viewing
 * 
 * Follows project architecture patterns:
 * - Uses ApiService for all API communications
 * - Implements dependency injection for testing
 * - Provides glassmorphism UI with proper accessibility
 * - Supports real-time updates and filtering
 */

class TestResultsVisualization {
    constructor(apiService, options = {}) {
        this.apiService = apiService;
        this.options = {
            autoInit: true,
            enableLogging: true,
            skipDOMInit: false,
            refreshInterval: 30000, // 30 seconds
            pageSize: 10,
            ...options
        };
        
        if (!this.apiService) {
            if (this.options.enableLogging) {
                console.error('TestResultsVisualization: ApiService is required');
            }
            return;
        }

        // State management
        this.currentPage = 1;
        this.currentFilters = {};
        this.results = [];
        this.pagination = {};
        this.refreshTimer = null;
        this.isInitialized = false;

        // Allow disabling auto-initialization for testing
        if (this.options.autoInit) {
            this.init();
        }
    }

    async init() {
        try {
            // Skip DOM-dependent initialization in test environment
            if (!this.options.skipDOMInit) {
                this.setupEventListeners();
                this.setupFiltering();
                this.setupPagination();
                await this.loadTestResults();
                this.startAutoRefresh();
            }
            
            this.isInitialized = true;
            if (this.options.enableLogging) {
                console.log('TestResultsVisualization initialized successfully');
            }
        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to initialize TestResultsVisualization:', error);
            }
            throw error;
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-results');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh());
        }

        // Filter form
        const filterForm = document.getElementById('results-filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.handleFilterSubmit(e));
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.handleClearFilters());
        }

        // Search input with debounce
        const searchInput = document.getElementById('results-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // Status filter dropdown
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.updateFilter('status', e.target.value);
            });
        }

        // Engine filter dropdown
        const engineFilter = document.getElementById('engine-filter');
        if (engineFilter) {
            engineFilter.addEventListener('change', (e) => {
                this.updateFilter('engine', e.target.value);
            });
        }

        // Date range filters
        const startDateFilter = document.getElementById('start-date-filter');
        const endDateFilter = document.getElementById('end-date-filter');
        if (startDateFilter) {
            startDateFilter.addEventListener('change', (e) => {
                this.updateFilter('startDate', e.target.value);
            });
        }
        if (endDateFilter) {
            endDateFilter.addEventListener('change', (e) => {
                this.updateFilter('endDate', e.target.value);
            });
        }
    }

    setupFiltering() {
        // Initialize filter state
        this.currentFilters = {
            status: '',
            engine: '',
            testName: '',
            startDate: '',
            endDate: '',
            sort: 'desc',
            sortBy: 'startTime'
        };
    }

    setupPagination() {
        // Pagination will be setup when results are loaded
        this.currentPage = 1;
    }

    async loadTestResults(options = {}) {
        try {
            if (this.options.enableLogging) {
                console.log('Loading test results...', { filters: this.currentFilters, page: this.currentPage });
            }

            // Show loading state
            this.showLoadingState();

            const queryOptions = {
                page: this.currentPage,
                limit: this.options.pageSize,
                includeArtifacts: true,
                includeHealingAttempts: true,
                ...this.currentFilters,
                ...options
            };

            // Remove empty filters
            Object.keys(queryOptions).forEach(key => {
                if (queryOptions[key] === '' || queryOptions[key] === null || queryOptions[key] === undefined) {
                    delete queryOptions[key];
                }
            });

            const response = await this.apiService.getTestResults(queryOptions);
            
            if (response.success && response.data) {
                this.results = response.data.results || [];
                this.pagination = response.data.pagination || {};
                
                this.renderResults();
                this.renderPagination();
                this.updateResultsCount();
            } else {
                throw new Error(response.error?.message || 'Failed to load test results');
            }

        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to load test results:', error);
            }
            this.showErrorState(error.message);
            throw error;
        }
    }

    renderResults() {
        const resultsContainer = document.getElementById('test-results-list');
        if (!resultsContainer) return;

        if (this.results.length === 0) {
            this.showEmptyState();
            return;
        }

        const resultsHTML = this.results.map(result => this.createResultCard(result)).join('');
        resultsContainer.innerHTML = resultsHTML;

        // Setup click handlers for result cards
        this.setupResultCardHandlers();
    }

    createResultCard(result) {
        const statusClass = this.getStatusClass(result.status);
        const statusIcon = this.getStatusIcon(result.status);
        const duration = this.formatDuration(result.duration);
        const startTime = this.formatDateTime(result.startTime);
        const hasHealing = result.healingAttempts && result.healingAttempts.length > 0;
        const hasArtifacts = result.artifacts && Object.keys(result.artifacts).length > 0;

        return `
            <div class="result-card ${statusClass}" data-test-id="${result.testId}" role="article" tabindex="0">
                <div class="result-header">
                    <div class="result-title">
                        <span class="status-icon" aria-label="${result.status} test">${statusIcon}</span>
                        <h3 class="test-name">${this.escapeHtml(result.name || result.testId)}</h3>
                        <span class="test-engine">${this.escapeHtml(result.engine)}</span>
                    </div>
                    <div class="result-actions">
                        ${hasArtifacts ? '<button class="btn-icon" data-action="view-artifacts" title="View Artifacts">📁</button>' : ''}
                        ${hasHealing ? '<button class="btn-icon" data-action="view-healing" title="View Healing Attempts">🔧</button>' : ''}
                        <button class="btn-icon" data-action="view-details" title="View Details">👁️</button>
                    </div>
                </div>
                
                <div class="result-summary">
                    <div class="summary-stats">
                        <span class="stat">
                            <span class="stat-label">Duration:</span>
                            <span class="stat-value">${duration}</span>
                        </span>
                        <span class="stat">
                            <span class="stat-label">Started:</span>
                            <span class="stat-value">${startTime}</span>
                        </span>
                        ${result.results ? `
                            <span class="stat">
                                <span class="stat-label">Tests:</span>
                                <span class="stat-value">
                                    ${result.results.passed}/${result.results.total}
                                    ${result.results.failed > 0 ? `(${result.results.failed} failed)` : ''}
                                </span>
                            </span>
                        ` : ''}
                    </div>
                    
                    ${hasHealing ? `
                        <div class="healing-indicator">
                            <span class="healing-badge">
                                🔧 ${result.healingAttempts.length} healing attempt${result.healingAttempts.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    ` : ''}
                </div>

                ${result.error ? `
                    <div class="result-error">
                        <span class="error-label">Error:</span>
                        <span class="error-message">${this.escapeHtml(result.error.message || result.error)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    setupResultCardHandlers() {
        const resultCards = document.querySelectorAll('.result-card');
        resultCards.forEach(card => {
            // Card click to view details
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.result-actions')) {
                    const testId = card.dataset.testId;
                    this.viewTestDetails(testId);
                }
            });

            // Action button handlers
            const actionButtons = card.querySelectorAll('[data-action]');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = button.dataset.action;
                    const testId = card.dataset.testId;
                    this.handleResultAction(action, testId);
                });
            });

            // Keyboard navigation
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const testId = card.dataset.testId;
                    this.viewTestDetails(testId);
                }
            });
        });
    }

    handleResultAction(action, testId) {
        switch (action) {
            case 'view-details':
                this.viewTestDetails(testId);
                break;
            case 'view-artifacts':
                this.viewTestArtifacts(testId);
                break;
            case 'view-healing':
                this.viewHealingAttempts(testId);
                break;
            default:
                if (this.options.enableLogging) {
                    console.warn('Unknown result action:', action);
                }
        }
    }

    async viewTestDetails(testId) {
        try {
            if (this.options.enableLogging) {
                console.log('Viewing test details for:', testId);
            }

            const response = await this.apiService.getTestResult(testId, {
                includeArtifacts: true,
                includeHealingAttempts: true,
                includeMetrics: true
            });

            if (response.success && response.data) {
                this.showTestDetailsModal(response.data);
            } else {
                throw new Error(response.error?.message || 'Failed to load test details');
            }
        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to load test details:', error);
            }
            this.showNotification('Failed to load test details', 'error');
        }
    }

    async viewTestArtifacts(testId) {
        try {
            const result = this.results.find(r => r.testId === testId);
            if (result && result.artifacts) {
                this.showArtifactsModal(result.artifacts, testId);
            } else {
                // Fetch artifacts from API
                const response = await this.apiService.getTestResult(testId, {
                    includeArtifacts: true
                });
                
                if (response.success && response.data && response.data.artifacts) {
                    this.showArtifactsModal(response.data.artifacts, testId);
                } else {
                    this.showNotification('No artifacts found for this test', 'info');
                }
            }
        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to load test artifacts:', error);
            }
            this.showNotification('Failed to load test artifacts', 'error');
        }
    }

    async viewHealingAttempts(testId) {
        try {
            const result = this.results.find(r => r.testId === testId);
            if (result && result.healingAttempts) {
                this.showHealingModal(result.healingAttempts, testId);
            } else {
                // Fetch healing attempts from API
                const response = await this.apiService.getTestResult(testId, {
                    includeHealingAttempts: true
                });
                
                if (response.success && response.data && response.data.healingAttempts) {
                    this.showHealingModal(response.data.healingAttempts, testId);
                } else {
                    this.showNotification('No healing attempts found for this test', 'info');
                }
            }
        } catch (error) {
            if (this.options.enableLogging) {
                console.error('Failed to load healing attempts:', error);
            }
            this.showNotification('Failed to load healing attempts', 'error');
        }
    }

    showTestDetailsModal(testData) {
        const modal = this.createModal('test-details-modal', 'Test Details');
        const content = this.createTestDetailsContent(testData);
        modal.querySelector('.modal-body').innerHTML = content;
        document.body.appendChild(modal);
        this.showModal(modal);
    }

    showArtifactsModal(artifacts, testId) {
        const modal = this.createModal('artifacts-modal', 'Test Artifacts');
        const content = this.createArtifactsContent(artifacts, testId);
        modal.querySelector('.modal-body').innerHTML = content;
        document.body.appendChild(modal);
        this.showModal(modal);
    }

    showHealingModal(healingAttempts, testId) {
        const modal = this.createModal('healing-modal', 'Healing Attempts');
        const content = this.createHealingContent(healingAttempts, testId);
        modal.querySelector('.modal-body').innerHTML = content;
        document.body.appendChild(modal);
        this.showModal(modal);
    }

    createModal(id, title) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', `${id}-title`);
        modal.setAttribute('aria-modal', 'true');
        
        modal.innerHTML = `
            <div class="modal-overlay" data-action="close-modal"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h2 id="${id}-title" class="modal-title">${this.escapeHtml(title)}</h2>
                    <button class="modal-close" data-action="close-modal" aria-label="Close modal">×</button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-action="close-modal">Close</button>
                </div>
            </div>
        `;

        // Setup close handlers
        modal.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(modal));
        });

        // Close on Escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
            }
        });

        return modal;
    }

    createTestDetailsContent(testData) {
        const duration = this.formatDuration(testData.duration);
        const startTime = this.formatDateTime(testData.startTime);
        const endTime = testData.endTime ? this.formatDateTime(testData.endTime) : 'N/A';
        
        return `
            <div class="test-details">
                <div class="details-section">
                    <h3>Basic Information</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Test ID:</span>
                            <span class="detail-value">${this.escapeHtml(testData.testId)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Name:</span>
                            <span class="detail-value">${this.escapeHtml(testData.name || 'N/A')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Engine:</span>
                            <span class="detail-value">${this.escapeHtml(testData.engine)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-${testData.status}">${this.escapeHtml(testData.status)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Duration:</span>
                            <span class="detail-value">${duration}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Start Time:</span>
                            <span class="detail-value">${startTime}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">End Time:</span>
                            <span class="detail-value">${endTime}</span>
                        </div>
                    </div>
                </div>

                ${testData.results ? `
                    <div class="details-section">
                        <h3>Test Results</h3>
                        <div class="results-summary">
                            <div class="summary-item passed">
                                <span class="summary-number">${testData.results.passed}</span>
                                <span class="summary-label">Passed</span>
                            </div>
                            <div class="summary-item failed">
                                <span class="summary-number">${testData.results.failed}</span>
                                <span class="summary-label">Failed</span>
                            </div>
                            <div class="summary-item skipped">
                                <span class="summary-number">${testData.results.skipped}</span>
                                <span class="summary-label">Skipped</span>
                            </div>
                            <div class="summary-item total">
                                <span class="summary-number">${testData.results.total}</span>
                                <span class="summary-label">Total</span>
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${testData.error ? `
                    <div class="details-section">
                        <h3>Error Information</h3>
                        <div class="error-details">
                            <pre class="error-message">${this.escapeHtml(JSON.stringify(testData.error, null, 2))}</pre>
                        </div>
                    </div>
                ` : ''}

                ${testData.config ? `
                    <div class="details-section">
                        <h3>Configuration</h3>
                        <div class="config-details">
                            <pre class="config-json">${this.escapeHtml(JSON.stringify(testData.config, null, 2))}</pre>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createArtifactsContent(artifacts, testId) {
        if (!artifacts || Object.keys(artifacts).length === 0) {
            return '<p class="no-artifacts">No artifacts available for this test.</p>';
        }

        let content = '<div class="artifacts-list">';
        
        // Screenshots
        if (artifacts.screenshots && artifacts.screenshots.length > 0) {
            content += `
                <div class="artifact-section">
                    <h3>Screenshots</h3>
                    <div class="screenshot-grid">
                        ${artifacts.screenshots.map(screenshot => `
                            <div class="screenshot-item">
                                <img src="${screenshot.path}" alt="${screenshot.name}" class="screenshot-thumb" 
                                     onclick="this.parentElement.classList.toggle('expanded')">
                                <div class="screenshot-info">
                                    <span class="screenshot-name">${this.escapeHtml(screenshot.name)}</span>
                                    <span class="screenshot-time">${this.formatDateTime(screenshot.timestamp)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Videos
        if (artifacts.videos && artifacts.videos.length > 0) {
            content += `
                <div class="artifact-section">
                    <h3>Videos</h3>
                    <div class="video-list">
                        ${artifacts.videos.map(video => `
                            <div class="video-item">
                                <video controls class="video-player">
                                    <source src="${video.path}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                                <div class="video-info">
                                    <span class="video-name">${this.escapeHtml(video.name)}</span>
                                    <span class="video-duration">${this.formatDuration(video.duration)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Traces
        if (artifacts.traces && artifacts.traces.length > 0) {
            content += `
                <div class="artifact-section">
                    <h3>Traces</h3>
                    <div class="trace-list">
                        ${artifacts.traces.map(trace => `
                            <div class="trace-item">
                                <a href="${trace.path}" target="_blank" class="trace-link">
                                    📄 ${this.escapeHtml(trace.name)}
                                </a>
                                <span class="trace-size">${this.formatFileSize(trace.size)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Reports
        if (artifacts.reports && artifacts.reports.length > 0) {
            content += `
                <div class="artifact-section">
                    <h3>Reports</h3>
                    <div class="report-list">
                        ${artifacts.reports.map(report => `
                            <div class="report-item">
                                <a href="${report.path}" target="_blank" class="report-link">
                                    📊 ${this.escapeHtml(report.name)}
                                </a>
                                <span class="report-type">${this.escapeHtml(report.type)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        content += '</div>';
        return content;
    }

    createHealingContent(healingAttempts, testId) {
        if (!healingAttempts || healingAttempts.length === 0) {
            return '<p class="no-healing">No healing attempts found for this test.</p>';
        }

        const successfulAttempts = healingAttempts.filter(attempt => attempt.success);
        const failedAttempts = healingAttempts.filter(attempt => !attempt.success);

        let content = `
            <div class="healing-summary">
                <div class="healing-stats">
                    <div class="stat-card success">
                        <span class="stat-number">${successfulAttempts.length}</span>
                        <span class="stat-label">Successful</span>
                    </div>
                    <div class="stat-card failed">
                        <span class="stat-number">${failedAttempts.length}</span>
                        <span class="stat-label">Failed</span>
                    </div>
                    <div class="stat-card total">
                        <span class="stat-number">${healingAttempts.length}</span>
                        <span class="stat-label">Total</span>
                    </div>
                </div>
            </div>

            <div class="healing-attempts">
                <h3>Healing Attempts</h3>
                ${healingAttempts.map((attempt, index) => `
                    <div class="healing-attempt ${attempt.success ? 'success' : 'failed'}">
                        <div class="attempt-header">
                            <span class="attempt-number">#${index + 1}</span>
                            <span class="attempt-status ${attempt.success ? 'success' : 'failed'}">
                                ${attempt.success ? '✅' : '❌'} ${attempt.success ? 'Success' : 'Failed'}
                            </span>
                            <span class="attempt-time">${this.formatDateTime(attempt.timestamp)}</span>
                        </div>
                        
                        <div class="attempt-details">
                            <div class="detail-row">
                                <span class="detail-label">Strategy:</span>
                                <span class="detail-value">${this.escapeHtml(attempt.strategy)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Element:</span>
                                <span class="detail-value">${this.escapeHtml(attempt.element || 'N/A')}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Original Locator:</span>
                                <span class="detail-value code">${this.escapeHtml(attempt.originalLocator)}</span>
                            </div>
                            ${attempt.healedLocator ? `
                                <div class="detail-row">
                                    <span class="detail-label">Healed Locator:</span>
                                    <span class="detail-value code success">${this.escapeHtml(attempt.healedLocator)}</span>
                                </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Confidence:</span>
                                <span class="detail-value">${(attempt.confidence * 100).toFixed(1)}%</span>
                            </div>
                            ${attempt.error ? `
                                <div class="detail-row">
                                    <span class="detail-label">Error:</span>
                                    <span class="detail-value error">${this.escapeHtml(attempt.error)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        return content;
    }

    renderPagination() {
        const paginationContainer = document.getElementById('results-pagination');
        if (!paginationContainer || !this.pagination) return;

        const { page, totalPages, hasNext, hasPrev, total } = this.pagination;
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="pagination-info">
                Showing page ${page} of ${totalPages} (${total} total results)
            </div>
            <div class="pagination-controls">
                <button class="btn btn-secondary" ${!hasPrev ? 'disabled' : ''} data-page="1" title="First page">
                    ⏮️
                </button>
                <button class="btn btn-secondary" ${!hasPrev ? 'disabled' : ''} data-page="${page - 1}" title="Previous page">
                    ◀️
                </button>
        `;

        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="btn ${i === page ? 'btn-primary' : 'btn-secondary'}" 
                        data-page="${i}" ${i === page ? 'disabled' : ''}>${i}</button>
            `;
        }

        paginationHTML += `
                <button class="btn btn-secondary" ${!hasNext ? 'disabled' : ''} data-page="${page + 1}" title="Next page">
                    ▶️
                </button>
                <button class="btn btn-secondary" ${!hasNext ? 'disabled' : ''} data-page="${totalPages}" title="Last page">
                    ⏭️
                </button>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;

        // Setup pagination handlers
        paginationContainer.querySelectorAll('[data-page]').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = parseInt(e.target.dataset.page);
                if (targetPage !== this.currentPage) {
                    this.goToPage(targetPage);
                }
            });
        });
    }

    async goToPage(page) {
        if (page < 1 || (this.pagination.totalPages && page > this.pagination.totalPages)) {
            return;
        }

        this.currentPage = page;
        await this.loadTestResults();
    }

    updateFilter(key, value) {
        this.currentFilters[key] = value;
        this.currentPage = 1; // Reset to first page when filtering
        this.loadTestResults();
    }

    async handleSearch(searchTerm) {
        this.updateFilter('testName', searchTerm);
    }

    async handleFilterSubmit(e) {
        e.preventDefault();
        // Filters are updated via individual input handlers
        // This is mainly for accessibility
        await this.loadTestResults();
    }

    handleClearFilters() {
        // Reset all filters
        this.setupFiltering();
        
        // Reset form inputs
        const form = document.getElementById('results-filter-form');
        if (form) {
            form.reset();
        }
        
        // Reset search input
        const searchInput = document.getElementById('results-search');
        if (searchInput) {
            searchInput.value = '';
        }

        this.currentPage = 1;
        this.loadTestResults();
    }

    async handleRefresh() {
        await this.loadTestResults();
        this.showNotification('Results refreshed', 'success');
    }

    updateResultsCount() {
        const countElement = document.getElementById('results-count');
        if (countElement && this.pagination) {
            const { total } = this.pagination;
            countElement.textContent = `${total} result${total !== 1 ? 's' : ''}`;
        }
    }

    showLoadingState() {
        const resultsContainer = document.getElementById('test-results-list');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading test results...</p>
                </div>
            `;
        }
    }

    showEmptyState() {
        const resultsContainer = document.getElementById('test-results-list');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>No test results found</h3>
                    <p>Try adjusting your filters or run some tests to see results here.</p>
                    <button class="btn btn-primary" onclick="window.dashboard?.showSection('execution')">
                        Run Tests
                    </button>
                </div>
            `;
        }
    }

    showErrorState(message) {
        const resultsContainer = document.getElementById('test-results-list');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to load test results</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.testResults?.loadTestResults()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    showModal(modal) {
        modal.classList.add('show');
        
        // Focus management
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
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

        // Set background color based on type
        const colors = {
            success: '#4ade80',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    startAutoRefresh() {
        if (this.options.refreshInterval > 0) {
            this.refreshTimer = setInterval(() => {
                if (!document.hidden) {
                    this.loadTestResults();
                }
            }, this.options.refreshInterval);
        }
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // Utility methods
    getStatusClass(status) {
        const statusMap = {
            'passed': 'success',
            'failed': 'error',
            'skipped': 'warning',
            'running': 'info',
            'pending': 'info'
        };
        return statusMap[status] || 'info';
    }

    getStatusIcon(status) {
        const iconMap = {
            'passed': '✅',
            'failed': '❌',
            'skipped': '⏭️',
            'running': '🔄',
            'pending': '⏳'
        };
        return iconMap[status] || '❓';
    }

    formatDuration(ms) {
        if (!ms || ms < 0) return 'N/A';
        
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (error) {
            return dateString;
        }
    }

    formatFileSize(bytes) {
        if (!bytes || bytes < 0) return 'N/A';
        
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        this.stopAutoRefresh();
        
        // Remove event listeners and clean up
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });
        
        if (this.options.enableLogging) {
            console.log('TestResultsVisualization destroyed');
        }
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestResultsVisualization;
}

// Make available globally
window.TestResultsVisualization = TestResultsVisualization;
