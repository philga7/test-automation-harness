/**
 * Self-Healing Test Automation Harness - Dashboard JavaScript
 * Handles navigation, data loading, and interactive functionality
 */

class Dashboard {
    constructor() {
        this.currentSection = 'overview';
        this.refreshInterval = null;
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
            const response = await fetch('/health');
            if (!response.ok) throw new Error('Health check failed');
            
            const data = await response.json();
            
            this.updateElement('system-status', data.status || 'Unknown');
            this.updateElement('system-version', data.version || 'Unknown');
            this.updateElement('system-uptime', data.uptime ? Math.round(data.uptime) + 's' : 'Unknown');
            this.updateElement('last-update', new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Failed to load system status:', error);
            this.updateElement('system-status', 'Error');
            this.updateElement('system-version', 'Error');
            this.updateElement('system-uptime', 'Error');
        }
    }

    async loadApiStatus() {
        try {
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error('API status check failed');
            
            const data = await response.json();
            
            if (data.features) {
                const engineCount = Object.keys(data.features).length;
                this.updateElement('engines-count', engineCount.toString());
            }

            // Load healing statistics
            await this.loadHealingStats();
        } catch (error) {
            console.error('Failed to load API status:', error);
            this.updateElement('engines-count', 'Error');
        }
    }

    async loadHealingStats() {
        try {
            const response = await fetch('/api/v1/healing');
            if (!response.ok) throw new Error('Healing stats check failed');
            
            const data = await response.json();
            
            this.updateElement('healing-rate', data.successRate ? (data.successRate * 100).toFixed(1) + '%' : 'Loading...');
            this.updateElement('total-healing-actions', data.totalActions || '0');
            this.updateElement('successful-healing', data.successfulActions || '0');
            this.updateElement('failed-healing', data.failedActions || '0');
        } catch (error) {
            console.error('Failed to load healing stats:', error);
            this.updateElement('healing-rate', 'Error');
        }
    }

    async loadTestResults() {
        try {
            const response = await fetch('/api/v1/results');
            if (!response.ok) throw new Error('Test results check failed');
            
            const data = await response.json();
            
            this.updateElement('tests-executed', data.totalTests || '0');
            this.updateElement('active-tests', data.activeTests || '0');
        } catch (error) {
            console.error('Failed to load test results:', error);
        }
    }

    async executeTests(testType) {
        const button = event.target;
        const originalText = button.textContent;
        
        try {
            button.textContent = 'Running...';
            button.disabled = true;
            
            const response = await fetch('/api/v1/tests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: testType,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error('Test execution failed');
            
            const result = await response.json();
            
            // Show success message
            this.showNotification(`Tests executed successfully! Task ID: ${result.taskId}`, 'success');
            
            // Refresh data
            await this.loadTestResults();
            await this.loadHealingStats();
            
        } catch (error) {
            console.error('Test execution failed:', error);
            this.showNotification('Test execution failed. Please try again.', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
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

    destroy() {
        this.stopAutoRefresh();
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
