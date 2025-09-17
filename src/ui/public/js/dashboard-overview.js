/**
 * Self-Healing Test Automation Harness - System Overview Dashboard
 * 
 * Handles real-time system status monitoring, engine information display,
 * and key metrics visualization for the system overview section.
 * 
 * Features:
 * - Real-time system health monitoring
 * - Engine status and availability tracking
 * - Visual health indicators (green/yellow/red)
 * - Automatic refresh with configurable intervals
 * - Error handling and graceful degradation
 */

class DashboardOverview {
    constructor(options = {}) {
        this.refreshInterval = options.refreshInterval || 30000; // 30 seconds
        this.healthCheckInterval = options.healthCheckInterval || 10000; // 10 seconds
        this.apiService = options.apiService || new ApiService();
        
        this.systemHealthTimer = null;
        this.engineStatusTimer = null;
        this.isActive = false;
        
        // System status cache
        this.systemStatus = {
            health: 'unknown',
            lastUpdate: null,
            metrics: {}
        };
        
        // Engine status cache
        this.engineStatus = {
            engines: [],
            totalEngines: 0,
            healthyEngines: 0,
            lastUpdate: null
        };
        
        this.init();
    }

    /**
     * Initialize the dashboard overview
     */
    init() {
        this.log('Initializing Dashboard Overview');
        this.setupEventListeners();
        this.loadInitialData();
        this.startRealTimeUpdates();
        this.isActive = true;
    }

    /**
     * Setup event listeners for user interactions
     */
    setupEventListeners() {
        // Refresh button if it exists
        const refreshBtn = document.getElementById('refresh-overview');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
            });
        }

        // Handle visibility changes to pause/resume updates
        this.handleVisibilityChange = () => {
            if (document.hidden) {
                this.pauseUpdates();
            } else {
                this.resumeUpdates();
            }
        };
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /**
     * Load initial data for all overview components
     */
    async loadInitialData() {
        this.log('Loading initial dashboard data');
        
        try {
            await Promise.all([
                this.updateSystemStatus(),
                this.updateEngineStatus(),
                this.updateSystemMetrics()
            ]);
        } catch (error) {
            this.handleError('Failed to load initial data', error);
        }
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        this.log('Starting real-time updates');
        
        // System health updates (more frequent)
        this.systemHealthTimer = setInterval(() => {
            this.updateSystemStatus();
        }, this.healthCheckInterval);
        
        // Engine status updates (less frequent)
        this.engineStatusTimer = setInterval(() => {
            this.updateEngineStatus();
            this.updateSystemMetrics();
        }, this.refreshInterval);
    }

    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        this.log('Stopping real-time updates');
        
        if (this.systemHealthTimer) {
            clearInterval(this.systemHealthTimer);
            this.systemHealthTimer = null;
        }
        
        if (this.engineStatusTimer) {
            clearInterval(this.engineStatusTimer);
            this.engineStatusTimer = null;
        }
    }

    /**
     * Pause updates when page is hidden
     */
    pauseUpdates() {
        if (this.isActive) {
            this.stopRealTimeUpdates();
            this.log('Updates paused (page hidden)');
        }
    }

    /**
     * Resume updates when page is visible
     */
    resumeUpdates() {
        if (this.isActive) {
            this.startRealTimeUpdates();
            this.refreshAllData();
            this.log('Updates resumed (page visible)');
        }
    }

    /**
     * Update system status information
     */
    async updateSystemStatus() {
        try {
            const healthData = await this.apiService.getSystemStatus();
            const apiStatus = await this.apiService.getApiStatus();
            
            this.systemStatus = {
                health: healthData.status || 'unknown',
                version: healthData.version || 'Unknown',
                uptime: healthData.uptime || 0,
                environment: healthData.environment || 'unknown',
                lastUpdate: new Date(),
                features: apiStatus.features || {}
            };
            
            this.renderSystemStatus();
            this.updateSystemHealthIndicator();
            
        } catch (error) {
            this.handleError('Failed to update system status', error);
            this.renderSystemStatusError();
        }
    }

    /**
     * Update engine status and availability
     */
    async updateEngineStatus() {
        try {
            const enginesData = await this.apiService.getEngines();
            
            let healthyEngines = 0;
            const engines = enginesData.data || [];
            
            // Check health of each engine
            for (const engine of engines) {
                try {
                    const healthData = await this.apiService.getEngineHealth(engine.id);
                    engine.health = healthData.health || { status: 'unknown' };
                    if (engine.health.status === 'healthy') {
                        healthyEngines++;
                    }
                } catch (error) {
                    engine.health = { status: 'unhealthy', error: error.message };
                }
            }
            
            this.engineStatus = {
                engines,
                totalEngines: engines.length,
                healthyEngines,
                lastUpdate: new Date()
            };
            
            this.renderEngineStatus();
            
        } catch (error) {
            this.handleError('Failed to update engine status', error);
            this.renderEngineStatusError();
        }
    }

    /**
     * Update system metrics and observability data
     */
    async updateSystemMetrics() {
        try {
            const observabilityData = await this.apiService.getObservabilityHealth();
            const healingStats = await this.apiService.getHealingStatistics();
            
            this.renderObservabilityMetrics(observabilityData);
            this.renderHealingStatistics(healingStats);
            
        } catch (error) {
            this.handleError('Failed to update system metrics', error);
        }
    }

    /**
     * Render system status information
     */
    renderSystemStatus() {
        const elements = {
            status: document.getElementById('system-status'),
            version: document.getElementById('system-version'),
            uptime: document.getElementById('system-uptime'),
            lastUpdate: document.getElementById('last-update')
        };
        
        if (elements.status) {
            elements.status.textContent = this.formatSystemStatus(this.systemStatus.health);
        }
        
        if (elements.version) {
            elements.version.textContent = this.systemStatus.version;
        }
        
        if (elements.uptime) {
            elements.uptime.textContent = this.formatUptime(this.systemStatus.uptime);
        }
        
        if (elements.lastUpdate) {
            elements.lastUpdate.textContent = this.formatTimestamp(this.systemStatus.lastUpdate);
        }
    }

    /**
     * Render system status error state
     */
    renderSystemStatusError() {
        const elements = {
            status: document.getElementById('system-status'),
            version: document.getElementById('system-version'),
            uptime: document.getElementById('system-uptime')
        };
        
        Object.values(elements).forEach(element => {
            if (element) {
                element.textContent = 'Error';
                element.classList.add('error-state');
            }
        });
    }

    /**
     * Update system health indicator visual state
     */
    updateSystemHealthIndicator() {
        const indicators = document.querySelectorAll('.status-indicator');
        const healthClass = this.getHealthStatusClass(this.systemStatus.health);
        
        indicators.forEach(indicator => {
            // Remove existing health classes
            indicator.classList.remove('healthy', 'degraded', 'unhealthy', 'unknown');
            // Add current health class
            indicator.classList.add(healthClass);
        });
    }

    /**
     * Render engine status information
     */
    renderEngineStatus() {
        const elements = {
            count: document.getElementById('engines-count'),
            healthy: document.getElementById('healthy-engines'),
            status: document.getElementById('engines-status')
        };
        
        if (elements.count) {
            elements.count.textContent = this.engineStatus.totalEngines.toString();
        }
        
        if (elements.healthy) {
            elements.healthy.textContent = `${this.engineStatus.healthyEngines}/${this.engineStatus.totalEngines}`;
        }
        
        if (elements.status) {
            const healthPercentage = this.engineStatus.totalEngines > 0 
                ? (this.engineStatus.healthyEngines / this.engineStatus.totalEngines) * 100 
                : 0;
            elements.status.textContent = `${healthPercentage.toFixed(0)}% Healthy`;
        }
        
        // Render detailed engine list if container exists
        this.renderEngineList();
    }

    /**
     * Render detailed engine list
     */
    renderEngineList() {
        const container = document.getElementById('engines-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.engineStatus.engines.forEach(engine => {
            const engineElement = document.createElement('div');
            engineElement.className = 'engine-item';
            
            const statusClass = this.getHealthStatusClass(engine.health?.status || 'unknown');
            
            engineElement.innerHTML = `
                <div class="engine-info">
                    <span class="engine-indicator ${statusClass}"></span>
                    <span class="engine-name">${engine.name || engine.id}</span>
                    <span class="engine-type">${engine.testType || 'Unknown'}</span>
                </div>
                <div class="engine-status">
                    <span class="engine-health">${this.formatEngineHealth(engine.health?.status || 'unknown')}</span>
                </div>
            `;
            
            container.appendChild(engineElement);
        });
    }

    /**
     * Render engine status error state
     */
    renderEngineStatusError() {
        const elements = {
            count: document.getElementById('engines-count'),
            healthy: document.getElementById('healthy-engines'),
            status: document.getElementById('engines-status')
        };
        
        Object.values(elements).forEach(element => {
            if (element) {
                element.textContent = 'Error';
                element.classList.add('error-state');
            }
        });
    }

    /**
     * Render observability metrics
     */
    renderObservabilityMetrics(data) {
        const elements = {
            cpuUsage: document.getElementById('cpu-usage'),
            memoryUsage: document.getElementById('memory-usage'),
            diskUsage: document.getElementById('disk-usage')
        };
        
        if (data.systemHealth) {
            const health = data.systemHealth;
            
            if (elements.cpuUsage && health.metrics?.cpu) {
                elements.cpuUsage.textContent = `${health.metrics.cpu.toFixed(1)}%`;
            }
            
            if (elements.memoryUsage && health.metrics?.memory) {
                elements.memoryUsage.textContent = `${health.metrics.memory.toFixed(1)}%`;
            }
            
            if (elements.diskUsage && health.metrics?.disk) {
                elements.diskUsage.textContent = `${health.metrics.disk.toFixed(1)}%`;
            }
        }
    }

    /**
     * Render healing statistics
     */
    renderHealingStatistics(data) {
        const elements = {
            healingRate: document.getElementById('healing-rate'),
            totalAttempts: document.getElementById('total-healing-actions'),
            successful: document.getElementById('successful-healing'),
            failed: document.getElementById('failed-healing')
        };
        
        if (elements.healingRate) {
            const rate = data.successRate ? (data.successRate * 100).toFixed(1) : '0.0';
            elements.healingRate.textContent = `${rate}%`;
        }
        
        if (elements.totalAttempts) {
            elements.totalAttempts.textContent = (data.totalAttempts || 0).toString();
        }
        
        if (elements.successful) {
            elements.successful.textContent = (data.successfulAttempts || 0).toString();
        }
        
        if (elements.failed) {
            elements.failed.textContent = (data.failedAttempts || 0).toString();
        }
    }

    /**
     * Refresh all data manually
     */
    async refreshAllData() {
        this.log('Manual refresh triggered');
        
        try {
            // Show loading state
            this.showLoadingState();
            
            // Refresh all data
            await this.loadInitialData();
            
            // Hide loading state
            this.hideLoadingState();
            
            this.showNotification('Dashboard refreshed successfully', 'success');
            
        } catch (error) {
            this.hideLoadingState();
            this.handleError('Failed to refresh dashboard', error);
            this.showNotification('Failed to refresh dashboard', 'error');
        }
    }

    /**
     * Show loading state for all components
     */
    showLoadingState() {
        const loadingElements = document.querySelectorAll('.metric-value, .stat-number');
        loadingElements.forEach(element => {
            element.classList.add('loading');
        });
    }

    /**
     * Hide loading state for all components
     */
    hideLoadingState() {
        const loadingElements = document.querySelectorAll('.metric-value, .stat-number');
        loadingElements.forEach(element => {
            element.classList.remove('loading');
        });
    }

    /**
     * Get CSS class for health status
     */
    getHealthStatusClass(status) {
        switch (status?.toLowerCase()) {
            case 'healthy':
            case 'ok':
                return 'healthy';
            case 'degraded':
            case 'warning':
                return 'degraded';
            case 'unhealthy':
            case 'error':
            case 'critical':
                return 'unhealthy';
            default:
                return 'unknown';
        }
    }

    /**
     * Format system status for display
     */
    formatSystemStatus(status) {
        switch (status?.toLowerCase()) {
            case 'healthy':
                return '🟢 Healthy';
            case 'degraded':
                return '🟡 Degraded';
            case 'unhealthy':
                return '🔴 Unhealthy';
            default:
                return '⚪ Unknown';
        }
    }

    /**
     * Format engine health status for display
     */
    formatEngineHealth(status) {
        switch (status?.toLowerCase()) {
            case 'healthy':
                return 'Healthy';
            case 'degraded':
                return 'Degraded';
            case 'unhealthy':
                return 'Unhealthy';
            default:
                return 'Unknown';
        }
    }

    /**
     * Format uptime in human-readable format
     */
    formatUptime(seconds) {
        if (seconds === null || seconds === undefined || seconds < 0) return 'Unknown';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(date) {
        if (!date) return 'Never';
        return date.toLocaleTimeString();
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Use existing dashboard notification system if available
        if (window.dashboard && typeof window.dashboard.showNotification === 'function') {
            window.dashboard.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Handle errors gracefully
     */
    handleError(message, error) {
        this.log(`Error: ${message}`, error);
        console.error(`[DashboardOverview] ${message}:`, error);
    }

    /**
     * Log messages for debugging
     */
    log(message, data = null) {
        if (console && typeof console.log === 'function') {
            if (data) {
                console.log(`[DashboardOverview] ${message}`, data);
            } else {
                console.log(`[DashboardOverview] ${message}`);
            }
        }
    }

    /**
     * Cleanup and destroy the overview instance
     */
    destroy() {
        this.log('Destroying Dashboard Overview');
        this.isActive = false;
        this.stopRealTimeUpdates();
        
        // Remove event listeners if needed
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Initialize dashboard overview when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the overview section or if overview elements exist
    if (document.getElementById('system-status') || document.querySelector('.status-grid')) {
        window.dashboardOverview = new DashboardOverview({
            refreshInterval: 30000,  // 30 seconds
            healthCheckInterval: 10000  // 10 seconds
        });
        
        console.log('[DashboardOverview] Initialized successfully');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboardOverview) {
        window.dashboardOverview.destroy();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardOverview;
}
