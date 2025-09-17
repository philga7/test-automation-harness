/**
 * Self-Healing Test Automation Harness - Dashboard JavaScript
 * Handles navigation, data loading, and interactive functionality
 * 
 * Updated to use the new ApiService for all API communications
 */

class Dashboard {
    constructor() {
        this.currentSection = 'overview';
        this.refreshInterval = null;
        this.testExecutionInterface = null;
        this.apiService = new ApiService({
            baseUrl: '',
            timeout: 30000,
            retryAttempts: 3,
            enableLogging: true
        });
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.loadSystemStatus();
        this.loadApiStatus();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.dashboard-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('href').substring(1);
                this.showSection(targetSection);
                this.updateActiveNavLink(link);
            });
        });
    }

    setupMobileMenu() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', !isExpanded);
                navMenu.classList.toggle('active');
            });

            // Close mobile menu when clicking on a link
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    navToggle.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
            
            // Initialize test execution interface when execution section is shown
            if (sectionId === 'execution' && !this.testExecutionInterface) {
                this.initializeTestExecutionInterface();
            }
        }
    }

    updateActiveNavLink(activeLink) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    setupEventListeners() {
        // Test execution buttons
        const runAllTestsBtn = document.getElementById('run-all-tests');
        const runUnitTestsBtn = document.getElementById('run-unit-tests');
        const runE2eTestsBtn = document.getElementById('run-e2e-tests');
        const runPerformanceTestsBtn = document.getElementById('run-performance-tests');

        if (runAllTestsBtn) {
            runAllTestsBtn.addEventListener('click', () => this.executeTests('all'));
        }
        if (runUnitTestsBtn) {
            runUnitTestsBtn.addEventListener('click', () => this.executeTests('unit'));
        }
        if (runE2eTestsBtn) {
            runE2eTestsBtn.addEventListener('click', () => this.executeTests('e2e'));
        }
        if (runPerformanceTestsBtn) {
            runPerformanceTestsBtn.addEventListener('click', () => this.executeTests('performance'));
        }
    }

    async loadSystemStatus() {
        try {
            const data = await this.apiService.getSystemStatus();
            
            this.updateElement('system-status', data.status || 'Unknown');
            this.updateElement('system-version', data.version || 'Unknown');
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

            // Load healing statistics
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
        const button = event.target;
        const originalText = button.textContent;
        
        try {
            button.textContent = 'Running...';
            button.disabled = true;
            
            // Create test configuration based on test type
            const testConfig = this.createTestConfig(testType);
            
            const result = await this.apiService.executeTest(testConfig);
            
            // Show success message
            this.showNotification(`Tests executed successfully! Test ID: ${result.data.testId}`, 'success');
            
            // Refresh data
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

    /**
     * Create test configuration based on test type
     * @param {string} testType - Type of test to execute
     * @returns {Object} Test configuration
     */
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
            case 'performance':
                return {
                    ...baseConfig,
                    engine: 'k6',
                    config: {
                        vus: 10,
                        duration: '30s',
                        thresholds: {
                            http_req_duration: ['p(95)<200']
                        }
                    }
                };
            case 'security':
                return {
                    ...baseConfig,
                    engine: 'owasp-zap',
                    config: {
                        proxy: 'http://localhost:8080',
                        context: 'default',
                        policy: 'API'
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
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
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
        // Refresh data every 30 seconds
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

    /**
     * Initialize the test execution interface
     */
    initializeTestExecutionInterface() {
        try {
            if (window.TestExecutionInterface) {
                this.testExecutionInterface = new window.TestExecutionInterface(this.apiService);
                console.log('Test execution interface initialized');
            } else {
                console.warn('TestExecutionInterface class not available');
            }
        } catch (error) {
            console.error('Failed to initialize test execution interface:', error);
        }
    }

    destroy() {
        this.stopAutoRefresh();
        if (this.testExecutionInterface) {
            this.testExecutionInterface.destroy();
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// Handle page visibility changes to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
    if (window.dashboard) {
        if (document.hidden) {
            window.dashboard.stopAutoRefresh();
        } else {
            window.dashboard.startAutoRefresh();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});
