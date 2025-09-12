/**
 * Health monitoring system for the Self-Healing Test Automation Harness
 * 
 * This service provides comprehensive health monitoring including:
 * - Component health checks
 * - System-wide health aggregation
 * - Dependency monitoring
 * - Health history tracking
 * - Alerting integration
 */

import { HealthStatus, SystemHealth, ObservabilityConfig } from '../types';

export interface HealthCheck {
  name: string;
  check: () => Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: Record<string, any>;
    error?: string;
  }>;
  timeout: number; // milliseconds
  interval: number; // milliseconds
  critical: boolean; // If true, failure affects overall system health
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  duration: number;
  timestamp: Date;
  details: Record<string, any>;
  error?: string;
}

export class HealthMonitor {
  private config: ObservabilityConfig['health'];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private checkTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private startTime: Date = new Date();

  constructor(config: ObservabilityConfig['health']) {
    this.config = {
      ...config,
      enabled: config.enabled !== undefined ? config.enabled : true,
      interval: config.interval || 30000, // 30 seconds
      timeout: config.timeout || 5000,   // 5 seconds
    };

    if (this.config.enabled) {
      this.registerDefaultHealthChecks();
      this.startHealthChecks();
    }
  }

  /**
   * Register default health checks
   */
  private registerDefaultHealthChecks(): void {
    // System memory health check
    this.register({
      name: 'system_memory',
      check: async () => {
        const memUsage = process.memoryUsage();
        const memLimit = 1024 * 1024 * 1024; // 1GB limit
        const usagePercent = (memUsage.heapUsed / memLimit) * 100;

        return {
          status: usagePercent > 90 ? 'unhealthy' : 
                  usagePercent > 70 ? 'degraded' : 'healthy',
          details: {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            rss: memUsage.rss,
            external: memUsage.external,
            usagePercent: Math.round(usagePercent * 100) / 100,
          },
        };
      },
      timeout: 1000,
      interval: 30000,
      critical: true,
    });

    // Event loop lag health check
    this.register({
      name: 'event_loop_lag',
      check: async () => {
        return new Promise(resolve => {
          const start = performance.now();
          setImmediate(() => {
            const lag = performance.now() - start;
            resolve({
              status: lag > 100 ? 'unhealthy' : 
                      lag > 50 ? 'degraded' : 'healthy',
              details: {
                lagMs: Math.round(lag * 100) / 100,
                threshold: {
                  degraded: 50,
                  unhealthy: 100,
                },
              },
            });
          });
        });
      },
      timeout: 2000,
      interval: 15000,
      critical: true,
    });

    // File system health check
    this.register({
      name: 'file_system',
      check: async () => {
        try {
          const fs = await import('fs/promises');
          const testFile = '/tmp/health-check-test';
          
          // Try to write and read a test file
          await fs.writeFile(testFile, 'health-check');
          const content = await fs.readFile(testFile, 'utf8');
          await fs.unlink(testFile);

          return {
            status: content === 'health-check' ? 'healthy' : 'unhealthy',
            details: {
              canWrite: true,
              canRead: true,
              canDelete: true,
            },
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            details: {
              canWrite: false,
              canRead: false,
              canDelete: false,
            },
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
      timeout: 5000,
      interval: 60000,
      critical: false,
    });

    // API responsiveness health check
    this.register({
      name: 'api_responsiveness',
      check: async () => {
        try {
          const start = performance.now();
          
          // Simulate a quick internal API call
          await new Promise(resolve => setTimeout(resolve, 1));
          
          const responseTime = performance.now() - start;

          return {
            status: responseTime > 1000 ? 'unhealthy' : 
                    responseTime > 500 ? 'degraded' : 'healthy',
            details: {
              responseTimeMs: Math.round(responseTime * 100) / 100,
              threshold: {
                degraded: 500,
                unhealthy: 1000,
              },
            },
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            error: error instanceof Error ? error.message : 'API check failed',
            details: {},
          };
        }
      },
      timeout: 2000,
      interval: 30000,
      critical: true,
    });

    // Test engine registry health check
    this.register({
      name: 'test_engines',
      check: async () => {
        try {
          // This would check if test engines are responsive
          // For now, we'll simulate this check
          const engines = ['playwright', 'jest']; // Would come from actual registry
          const healthyEngines = engines.length; // Would check actual engine health

          return {
            status: healthyEngines === 0 ? 'unhealthy' :
                    healthyEngines < engines.length ? 'degraded' : 'healthy',
            details: {
              totalEngines: engines.length,
              healthyEngines,
              engines: engines.map(name => ({ name, status: 'healthy' })),
            },
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            error: error instanceof Error ? error.message : 'Engine check failed',
            details: { totalEngines: 0, healthyEngines: 0 },
          };
        }
      },
      timeout: 3000,
      interval: 45000,
      critical: false,
    });
  }

  /**
   * Register a health check
   */
  register(healthCheck: HealthCheck): void {
    this.healthChecks.set(healthCheck.name, healthCheck);
    
    if (this.config.enabled) {
      this.startSingleHealthCheck(healthCheck);
    }
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): void {
    this.healthChecks.delete(name);
    this.lastResults.delete(name);
    
    const interval = this.checkIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(name);
    }
  }

  /**
   * Start all health checks
   */
  private startHealthChecks(): void {
    this.healthChecks.forEach(healthCheck => {
      this.startSingleHealthCheck(healthCheck);
    });
  }

  /**
   * Start a single health check
   */
  private startSingleHealthCheck(healthCheck: HealthCheck): void {
    // Run initial check
    this.runHealthCheck(healthCheck);

    // Schedule recurring checks
    const interval = setInterval(() => {
      this.runHealthCheck(healthCheck);
    }, healthCheck.interval);

    this.checkIntervals.set(healthCheck.name, interval);
  }

  /**
   * Run a single health check
   */
  private async runHealthCheck(healthCheck: HealthCheck): Promise<void> {
    const start = performance.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout);
        this.checkTimeouts.set(healthCheck.name, timeoutId);
      });

      // Race between the check and timeout
      const result = await Promise.race([
        healthCheck.check(),
        timeoutPromise,
      ]).catch(error => {
        // Clear the timeout since it won the race
        const timeoutId = this.checkTimeouts.get(healthCheck.name);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.checkTimeouts.delete(healthCheck.name);
        }
        throw error;
      });

      // Clear the timeout since check completed successfully
      const timeoutId = this.checkTimeouts.get(healthCheck.name);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.checkTimeouts.delete(healthCheck.name);
      }

      const duration = performance.now() - start;

      const healthResult: HealthCheckResult = {
        name: healthCheck.name,
        status: result.status,
        duration: Math.round(duration * 100) / 100,
        timestamp: new Date(),
        details: result.details || {},
      };
      
      if (result.error) {
        healthResult.error = result.error;
      }

      this.lastResults.set(healthCheck.name, healthResult);

    } catch (error) {
      // Clear the timeout since check failed
      const timeoutId = this.checkTimeouts.get(healthCheck.name);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.checkTimeouts.delete(healthCheck.name);
      }

      const duration = performance.now() - start;

      const healthResult: HealthCheckResult = {
        name: healthCheck.name,
        status: 'unhealthy',
        duration: Math.round(duration * 100) / 100,
        timestamp: new Date(),
        details: {},
      };
      
      if (error) {
        healthResult.error = error instanceof Error ? error.message : 'Unknown error';
      }

      this.lastResults.set(healthCheck.name, healthResult);
    }
  }

  /**
   * Get health status for a specific component
   */
  getComponentHealth(name: string): HealthStatus | null {
    const result = this.lastResults.get(name);
    const healthCheck = this.healthChecks.get(name);

    if (!result || !healthCheck) {
      return null;
    }

    return {
      status: result.status,
      component: name,
      timestamp: result.timestamp,
      uptime: Date.now() - this.startTime.getTime(),
      details: {
        // lastCheckDuration: result.duration, // Removed - not part of HealthStatus interface
        // checkInterval: healthCheck.interval, // Removed - not part of HealthStatus interface
        // timeout: healthCheck.timeout, // Removed - not part of HealthStatus interface
        // critical: healthCheck.critical, // Removed - not part of HealthStatus interface
        ...result.details,
        ...(result.error && { lastError: result.error }),
      },
    };
  }

  /**
   * Get system-wide health status
   */
  getSystemHealth(): SystemHealth {
    const components: HealthStatus[] = [];
    let healthyComponents = 0;
    let degradedComponents = 0;
    let unhealthyComponents = 0;
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Collect all component health statuses
    this.healthChecks.forEach((healthCheck, name) => {
      const componentHealth = this.getComponentHealth(name);
      if (componentHealth) {
        components.push(componentHealth);

        switch (componentHealth.status) {
          case 'healthy':
            healthyComponents++;
            break;
          case 'degraded':
            degradedComponents++;
            if (healthCheck.critical && overallStatus === 'healthy') {
              overallStatus = 'degraded';
            }
            break;
          case 'unhealthy':
            unhealthyComponents++;
            if (healthCheck.critical) {
              overallStatus = 'unhealthy';
            } else if (overallStatus === 'healthy') {
              overallStatus = 'degraded';
            }
            break;
        }
      }
    });

    return {
      status: overallStatus,
      timestamp: new Date(),
      components,
      summary: {
        totalComponents: components.length,
        healthyComponents,
        degradedComponents,
        unhealthyComponents,
        uptime: Date.now() - this.startTime.getTime(),
      },
    };
  }

  /**
   * Get health check history for a component
   */
  getHealthHistory(name: string, _limit: number = 100): HealthCheckResult[] {
    // In a real implementation, this would fetch from a persistent store
    // For now, we only have the last result
    const result = this.lastResults.get(name);
    return result ? [result] : [];
  }

  /**
   * Force run all health checks
   */
  async runAllChecks(): Promise<Map<string, HealthCheckResult>> {
    const promises: Promise<void>[] = [];

    this.healthChecks.forEach(healthCheck => {
      promises.push(this.runHealthCheck(healthCheck));
    });

    await Promise.allSettled(promises);
    return new Map(this.lastResults);
  }

  /**
   * Force run a specific health check
   */
  async runSingleCheck(name: string): Promise<HealthCheckResult | null> {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      return null;
    }

    await this.runHealthCheck(healthCheck);
    return this.lastResults.get(name) || null;
  }

  /**
   * Get all registered health checks
   */
  getRegisteredChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get health statistics
   */
  getHealthStats(): {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    criticalChecks: number;
    lastCheckTime: Date | null;
    uptimeSeconds: number;
  } {
    let healthyChecks = 0;
    let degradedChecks = 0;
    let unhealthyChecks = 0;
    let criticalChecks = 0;
    let lastCheckTime: Date | null = null;

    this.lastResults.forEach((result, name) => {
      const healthCheck = this.healthChecks.get(name);
      
      switch (result.status) {
        case 'healthy':
          healthyChecks++;
          break;
        case 'degraded':
          degradedChecks++;
          break;
        case 'unhealthy':
          unhealthyChecks++;
          break;
      }

      if (healthCheck?.critical) {
        criticalChecks++;
      }

      if (!lastCheckTime || result.timestamp > lastCheckTime) {
        lastCheckTime = result.timestamp;
      }
    });

    return {
      totalChecks: this.healthChecks.size,
      healthyChecks,
      degradedChecks,
      unhealthyChecks,
      criticalChecks,
      lastCheckTime,
      uptimeSeconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.checkIntervals.forEach(interval => {
      clearInterval(interval);
    });
    
    this.checkTimeouts.forEach(timeout => {
      clearTimeout(timeout);
    });
    
    this.checkIntervals.clear();
    this.checkTimeouts.clear();
    this.healthChecks.clear();
    this.lastResults.clear();
  }
}
