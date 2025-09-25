/**
 * Healing Statistics Visualization Component
 * 
 * This component provides comprehensive visualization of self-healing test automation
 * statistics including success rates, strategy breakdowns, and performance metrics.
 * 
 * Features:
 * - Real-time healing statistics display
 * - Interactive charts using Chart.js
 * - Strategy performance breakdown
 * - Auto-refresh functionality
 * - Responsive design with glassmorphism styling
 */

class HealingStatisticsVisualization {
  constructor(apiService, options = {}) {
    // Validate required dependencies
    if (!apiService) {
      if (options.enableLogging !== false) {
        console.error('HealingStatisticsVisualization: ApiService is required');
      }
      return;
    }

    this.apiService = apiService;
    this.options = {
      autoInit: true,
      enableLogging: true,
      skipDOMInit: false,
      refreshInterval: 30000, // 30 seconds
      ...options
    };

    // Initialize component state
    this.isInitialized = false;
    this.charts = {};
    this.refreshTimer = null;
    
    // Bind methods to maintain context
    this.loadHealingStatistics = this.loadHealingStatistics.bind(this);
    this.renderSuccessRateChart = this.renderSuccessRateChart.bind(this);
    this.renderStrategyBreakdownChart = this.renderStrategyBreakdownChart.bind(this);
    this.updateHealingMetrics = this.updateHealingMetrics.bind(this);
    this.startAutoRefresh = this.startAutoRefresh.bind(this);
    this.stopAutoRefresh = this.stopAutoRefresh.bind(this);
    this.showNotification = this.showNotification.bind(this);
    this.destroy = this.destroy.bind(this);

    if (this.options.enableLogging) {
      console.log('HealingStatisticsVisualization initialized with options:', this.options);
    }

    // Allow disabling auto-initialization for testing
    if (this.options.autoInit) {
      this.init();
    }
  }

  /**
   * Initialize the healing statistics visualization component
   */
  async init() {
    try {
      if (this.options.enableLogging) {
        console.log('Initializing HealingStatisticsVisualization...');
      }

      // Skip DOM-dependent initialization in test environment
      if (!this.options.skipDOMInit) {
        await this.loadHealingStatistics();
        this.startAutoRefresh();
      }

      this.isInitialized = true;

      if (this.options.enableLogging) {
        console.log('HealingStatisticsVisualization initialized successfully');
      }
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('Failed to initialize HealingStatisticsVisualization:', error);
      }
      throw error;
    }
  }

  /**
   * Load healing statistics from the API
   */
  async loadHealingStatistics() {
    try {
      if (this.options.enableLogging) {
        console.log('Loading healing statistics...');
      }

      const response = await this.apiService.getHealingStatistics();
      
      if (response && response.success && response.data) {
        const stats = response.data;
        
        // Update metrics display
        this.updateHealingMetrics(stats);
        
        // Update charts
        this.renderSuccessRateChart(stats);
        this.renderStrategyBreakdownChart(stats);

        if (this.options.enableLogging) {
          console.log('Healing statistics loaded successfully:', stats);
        }

        return stats;
      } else {
        throw new Error('Invalid response format from healing statistics API');
      }
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('Failed to load healing statistics:', error);
      }
      
      this.showNotification('Failed to load healing statistics', 'error');
      throw error;
    }
  }

  /**
   * Render success rate chart using Chart.js
   */
  renderSuccessRateChart(data) {
    try {
      const canvas = document.getElementById('healing-success-rate-chart');
      if (!canvas) {
        if (this.options.enableLogging) {
          console.warn('Success rate chart canvas not found');
        }
        return;
      }

      // Destroy existing chart if it exists
      if (this.charts.successRate) {
        this.charts.successRate.destroy();
      }

      const ctx = canvas.getContext('2d');
      
      this.charts.successRate = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Successful', 'Failed'],
          datasets: [{
            data: [data.successful || 0, data.failed || 0],
            backgroundColor: [
              'rgba(102, 126, 234, 0.8)',  // Success color
              'rgba(239, 68, 68, 0.8)'     // Failure color
            ],
            borderColor: [
              'rgba(102, 126, 234, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: 'rgba(255, 255, 255, 0.8)',
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = data.total || 1;
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          }
        }
      });

      if (this.options.enableLogging) {
        console.log('Success rate chart rendered');
      }
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('Failed to render success rate chart:', error);
      }
    }
  }

  /**
   * Render strategy breakdown chart using Chart.js
   */
  renderStrategyBreakdownChart(data) {
    try {
      const canvas = document.getElementById('healing-strategy-chart');
      if (!canvas) {
        if (this.options.enableLogging) {
          console.warn('Strategy breakdown chart canvas not found');
        }
        return;
      }

      // Destroy existing chart if it exists
      if (this.charts.strategyBreakdown) {
        this.charts.strategyBreakdown.destroy();
      }

      const ctx = canvas.getContext('2d');
      const strategyStats = data.strategyStats || {};
      
      const labels = Object.keys(strategyStats);
      const successRates = labels.map(strategy => strategyStats[strategy].successRate || 0);
      const totals = labels.map(strategy => strategyStats[strategy].total || 0);

      this.charts.strategyBreakdown = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.map(label => label.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
          datasets: [{
            label: 'Success Rate (%)',
            data: successRates,
            backgroundColor: 'rgba(102, 126, 234, 0.6)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 1
          }, {
            label: 'Total Attempts',
            data: totals,
            backgroundColor: 'rgba(118, 75, 162, 0.6)',
            borderColor: 'rgba(118, 75, 162, 1)',
            borderWidth: 1,
            yAxisID: 'y1'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: 'rgba(255, 255, 255, 0.8)'
              }
            }
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Success Rate (%)',
                color: 'rgba(255, 255, 255, 0.8)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.6)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Total Attempts',
                color: 'rgba(255, 255, 255, 0.8)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.6)'
              },
              grid: {
                drawOnChartArea: false,
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              ticks: {
                color: 'rgba(255, 255, 255, 0.6)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          }
        }
      });

      if (this.options.enableLogging) {
        console.log('Strategy breakdown chart rendered');
      }
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('Failed to render strategy breakdown chart:', error);
      }
    }
  }

  /**
   * Update healing metrics in the DOM
   */
  updateHealingMetrics(data) {
    try {
      // Update total healing actions
      const totalElement = document.getElementById('total-healing-actions');
      if (totalElement) {
        totalElement.textContent = (data.total || 0).toString();
      }

      // Update successful healing actions
      const successfulElement = document.getElementById('successful-healing');
      if (successfulElement) {
        successfulElement.textContent = (data.successful || 0).toString();
      }

      // Update failed healing actions
      const failedElement = document.getElementById('failed-healing');
      if (failedElement) {
        failedElement.textContent = (data.failed || 0).toString();
      }

      // Update success rate
      const successRateElement = document.getElementById('healing-success-rate');
      if (successRateElement) {
        const rate = data.successRate || 0;
        successRateElement.textContent = `${rate.toFixed(1)}%`;
      }

      // Update average confidence
      const avgConfidenceElement = document.getElementById('avg-healing-confidence');
      if (avgConfidenceElement) {
        const confidence = data.avgConfidence || 0;
        avgConfidenceElement.textContent = `${(confidence * 100).toFixed(1)}%`;
      }

      // Update average duration
      const avgDurationElement = document.getElementById('avg-healing-duration');
      if (avgDurationElement) {
        const duration = data.avgDuration || 0;
        avgDurationElement.textContent = `${duration}ms`;
      }

      if (this.options.enableLogging) {
        console.log('Healing metrics updated');
      }
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('Failed to update healing metrics:', error);
      }
    }
  }

  /**
   * Start auto-refresh functionality
   */
  startAutoRefresh() {
    if (this.refreshTimer) {
      this.stopAutoRefresh();
    }

    // Use window.setInterval if available (browser), otherwise use global setInterval (Node.js/test)
    const setIntervalFn = (typeof window !== 'undefined' && window.setInterval) ? window.setInterval : setInterval;
    
    this.refreshTimer = setIntervalFn(() => {
      if (!document.hidden && this.isInitialized) {
        this.loadHealingStatistics().catch(error => {
          if (this.options.enableLogging) {
            console.error('Auto-refresh failed:', error);
          }
        });
      }
    }, this.options.refreshInterval);

    if (this.options.enableLogging) {
      console.log(`Auto-refresh started with interval: ${this.options.refreshInterval}ms`);
    }
  }

  /**
   * Stop auto-refresh functionality
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      // Use window.clearInterval if available (browser), otherwise use global clearInterval (Node.js/test)
      const clearIntervalFn = (typeof window !== 'undefined' && window.clearInterval) ? window.clearInterval : clearInterval;
      
      clearIntervalFn(this.refreshTimer);
      this.refreshTimer = null;

      if (this.options.enableLogging) {
        console.log('Auto-refresh stopped');
      }
    }
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    try {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      
      // Apply glassmorphism styling
      Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        background: 'var(--background-glass, rgba(255, 255, 255, 0.1))',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.2))',
        color: 'white',
        zIndex: '10000',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      });

      // Add type-specific styling
      if (type === 'error') {
        notification.style.background = 'rgba(239, 68, 68, 0.2)';
        notification.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      } else if (type === 'success') {
        notification.style.background = 'rgba(34, 197, 94, 0.2)';
        notification.style.borderColor = 'rgba(34, 197, 94, 0.5)';
      }

      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);

      if (this.options.enableLogging) {
        console.log(`Notification shown: ${message} (${type})`);
      }
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('Failed to show notification:', error);
      }
    }
  }

  /**
   * Cleanup and destroy the component
   */
  destroy() {
    try {
      // Stop auto-refresh
      this.stopAutoRefresh();

      // Destroy charts
      if (this.charts.successRate) {
        this.charts.successRate.destroy();
        this.charts.successRate = null;
      }

      if (this.charts.strategyBreakdown) {
        this.charts.strategyBreakdown.destroy();
        this.charts.strategyBreakdown = null;
      }

      // Clear component state
      this.isInitialized = false;
      this.charts = {};

      if (this.options.enableLogging) {
        console.log('HealingStatisticsVisualization destroyed');
      }
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('Failed to destroy HealingStatisticsVisualization:', error);
      }
    }
  }
}

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HealingStatisticsVisualization;
}

// Export for browser environment
if (typeof window !== 'undefined') {
  window.HealingStatisticsVisualization = HealingStatisticsVisualization;
}
