/**
 * Report generation system for the Self-Healing Test Automation Harness
 * 
 * This service provides comprehensive report generation including:
 * - Test execution reports
 * - Healing summary reports
 * - System health reports
 * - Performance analysis reports
 * - Multiple output formats (JSON, HTML, PDF)
 */

import fs from 'fs/promises';
import path from 'path';
import { ReportData, HealingStats, SystemHealth, ObservabilityConfig } from '../types';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'test-execution' | 'healing-summary' | 'system-health' | 'performance';
  template: string;
  variables: string[];
}

export interface ReportGenerationOptions {
  type: 'test-execution' | 'healing-summary' | 'system-health' | 'performance';
  title?: string;
  description?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  format: 'json' | 'html' | 'pdf';
  templateId?: string;
  data: any;
  outputPath?: string;
}

export class ReportGenerator {
  private config: ObservabilityConfig['reporting'];
  private templates: Map<string, ReportTemplate> = new Map();

  constructor(config: ObservabilityConfig['reporting']) {
    this.config = {
      ...config,
      enabled: config.enabled !== undefined ? config.enabled : true,
      schedule: config.schedule || '0 0 * * *', // Daily at midnight
      formats: config.formats || ['json', 'html'],
      outputDir: config.outputDir || './reports',
      retention: config.retention || 30, // 30 days
    };

    if (this.config.enabled) {
      this.initializeTemplates();
      this.ensureOutputDirectory();
    }
  }

  /**
   * Initialize default report templates
   */
  private initializeTemplates(): void {
    // Test execution report template
    this.registerTemplate({
      id: 'test-execution-default',
      name: 'Test Execution Report',
      description: 'Comprehensive test execution summary',
      type: 'test-execution',
      template: this.getTestExecutionTemplate(),
      variables: ['title', 'timeRange', 'totalTests', 'passedTests', 'failedTests', 'executionTime', 'testDetails'],
    });

    // Healing summary report template
    this.registerTemplate({
      id: 'healing-summary-default',
      name: 'Healing Summary Report',
      description: 'Self-healing performance analysis',
      type: 'healing-summary',
      template: this.getHealingSummaryTemplate(),
      variables: ['title', 'timeRange', 'totalAttempts', 'successRate', 'strategies', 'failureTypes'],
    });

    // System health report template
    this.registerTemplate({
      id: 'system-health-default',
      name: 'System Health Report',
      description: 'System health and performance overview',
      type: 'system-health',
      template: this.getSystemHealthTemplate(),
      variables: ['title', 'timestamp', 'overallStatus', 'components', 'uptime', 'metrics'],
    });

    // Performance report template
    this.registerTemplate({
      id: 'performance-default',
      name: 'Performance Report',
      description: 'System performance analysis',
      type: 'performance',
      template: this.getPerformanceTemplate(),
      variables: ['title', 'timeRange', 'metrics', 'trends', 'recommendations'],
    });
  }

  /**
   * Register a report template
   */
  registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Generate a report
   */
  async generateReport(options: ReportGenerationOptions): Promise<ReportData> {
    if (!this.config.enabled) {
      throw new Error('Report generation is disabled');
    }

    const reportId = this.generateReportId();
    const timeRange = options.timeRange || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
    };

    const reportData: ReportData = {
      id: reportId,
      type: options.type,
      title: options.title || this.getDefaultTitle(options.type),
      description: options.description || this.getDefaultDescription(options.type),
      generatedAt: new Date(),
      timeRange,
      data: options.data,
      metadata: {
        version: '1.0.0',
        generator: 'test-automation-harness',
        format: options.format,
      },
    };

    // Generate report content based on format
    let content: string;
    switch (options.format) {
      case 'json':
        content = JSON.stringify(reportData, null, 2);
        break;
      case 'html':
        content = await this.generateHtmlReport(reportData, options.templateId);
        break;
      case 'pdf':
        content = await this.generatePdfReport(reportData, options.templateId);
        break;
      default:
        throw new Error(`Unsupported report format: ${options.format}`);
    }

    // Save report to file if output path specified or using default
    if (options.outputPath || this.config.outputDir) {
      const outputPath = options.outputPath || this.getDefaultOutputPath(reportData);
      await this.saveReport(outputPath, content);
    }

    return reportData;
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(reportData: ReportData, templateId?: string): Promise<string> {
    const template = templateId ? 
      this.templates.get(templateId) : 
      this.getDefaultTemplate(reportData.type);

    if (!template) {
      throw new Error(`Template not found: ${templateId || 'default'}`);
    }

    // Replace template variables
    let html = template.template;
    
    // Basic variable replacement
    const variables = {
      title: reportData.title,
      description: reportData.description,
      generatedAt: reportData.generatedAt.toISOString(),
      timeRange: `${reportData.timeRange.start.toISOString()} - ${reportData.timeRange.end.toISOString()}`,
      data: JSON.stringify(reportData.data, null, 2),
    };

    // Add type-specific variables
    switch (reportData.type) {
      case 'test-execution':
        Object.assign(variables, this.getTestExecutionVariables(reportData.data));
        break;
      case 'healing-summary':
        Object.assign(variables, this.getHealingSummaryVariables(reportData.data));
        break;
      case 'system-health':
        Object.assign(variables, this.getSystemHealthVariables(reportData.data));
        break;
      case 'performance':
        Object.assign(variables, this.getPerformanceVariables(reportData.data));
        break;
    }

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
    });

    return html;
  }

  /**
   * Generate PDF report (placeholder - would use a library like puppeteer)
   */
  private async generatePdfReport(reportData: ReportData, templateId?: string): Promise<string> {
    // For now, generate HTML and return as base64 (in real implementation, convert to PDF)
    await this.generateHtmlReport(reportData, templateId);
    
    // This would be replaced with actual PDF generation using puppeteer or similar
    const pdfContent = `PDF Report: ${reportData.title}\n\nGenerated: ${reportData.generatedAt}\n\nData: ${JSON.stringify(reportData.data, null, 2)}`;
    
    return Buffer.from(pdfContent).toString('base64');
  }

  /**
   * Get default template for report type
   */
  private getDefaultTemplate(type: string): ReportTemplate | undefined {
    const defaultTemplateId = `${type}-default`;
    return this.templates.get(defaultTemplateId);
  }

  /**
   * Get test execution template
   */
  private getTestExecutionTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
        .details { margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .status-passed { color: #4CAF50; }
        .status-failed { color: #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        <p><strong>Generated:</strong> {{generatedAt}}</p>
        <p><strong>Time Range:</strong> {{timeRange}}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">{{totalTests}}</div>
            <div>Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value status-passed">{{passedTests}}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value status-failed">{{failedTests}}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{executionTime}}</div>
            <div>Execution Time</div>
        </div>
    </div>
    
    <div class="details">
        <h2>Test Details</h2>
        {{testDetails}}
    </div>
</body>
</html>`;
  }

  /**
   * Get healing summary template
   */
  private getHealingSummaryTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #FF9800; }
        .strategies { margin-top: 30px; }
        .strategy { margin: 10px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        <p><strong>Generated:</strong> {{generatedAt}}</p>
        <p><strong>Time Range:</strong> {{timeRange}}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">{{totalAttempts}}</div>
            <div>Total Attempts</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{successRate}}%</div>
            <div>Success Rate</div>
        </div>
    </div>
    
    <div class="strategies">
        <h2>Healing Strategies</h2>
        {{strategies}}
    </div>
    
    <div class="failure-types">
        <h2>Failure Types</h2>
        {{failureTypes}}
    </div>
</body>
</html>`;
  }

  /**
   * Get system health template
   */
  private getSystemHealthTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; }
        .status-healthy { background: #4CAF50; }
        .status-degraded { background: #FF9800; }
        .status-unhealthy { background: #f44336; }
        .components { margin-top: 30px; }
        .component { margin: 10px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        <p><strong>Generated:</strong> {{generatedAt}}</p>
        <p><strong>Overall Status:</strong> <span class="status status-{{overallStatus}}">{{overallStatus}}</span></p>
        <p><strong>Uptime:</strong> {{uptime}}</p>
    </div>
    
    <div class="components">
        <h2>Component Health</h2>
        {{components}}
    </div>
    
    <div class="metrics">
        <h2>System Metrics</h2>
        {{metrics}}
    </div>
</body>
</html>`;
  }

  /**
   * Get performance template
   */
  private getPerformanceTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .metrics { margin-top: 30px; }
        .metric { margin: 10px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        <p><strong>Generated:</strong> {{generatedAt}}</p>
        <p><strong>Time Range:</strong> {{timeRange}}</p>
    </div>
    
    <div class="metrics">
        <h2>Performance Metrics</h2>
        {{metrics}}
    </div>
    
    <div class="trends">
        <h2>Trends</h2>
        {{trends}}
    </div>
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        {{recommendations}}
    </div>
</body>
</html>`;
  }

  /**
   * Get test execution template variables
   */
  private getTestExecutionVariables(data: any): Record<string, string> {
    return {
      totalTests: String(data.totalTests || 0),
      passedTests: String(data.passedTests || 0),
      failedTests: String(data.failedTests || 0),
      executionTime: data.executionTime || '0ms',
      testDetails: this.formatTestDetails(data.tests || []),
    };
  }

  /**
   * Get healing summary template variables
   */
  private getHealingSummaryVariables(data: any): Record<string, string> {
    return {
      totalAttempts: String(data.totalAttempts || 0),
      successRate: String(Math.round((data.successRate || 0) * 100) / 100),
      strategies: this.formatStrategies(data.strategies || []),
      failureTypes: this.formatFailureTypes(data.failureTypes || {}),
    };
  }

  /**
   * Get system health template variables
   */
  private getSystemHealthVariables(data: SystemHealth): Record<string, string> {
    return {
      overallStatus: data.status,
      uptime: this.formatUptime(data.summary.uptime),
      components: this.formatComponents(data.components),
      metrics: this.formatSystemMetrics(data),
    };
  }

  /**
   * Get performance template variables
   */
  private getPerformanceVariables(data: any): Record<string, string> {
    return {
      metrics: this.formatPerformanceMetrics(data.metrics || []),
      trends: this.formatTrends(data.trends || []),
      recommendations: this.formatRecommendations(data.recommendations || []),
    };
  }

  /**
   * Format test details for HTML
   */
  private formatTestDetails(tests: any[]): string {
    if (tests.length === 0) {
      return '<p>No test details available</p>';
    }

    const rows = tests.map(test => `
      <tr>
        <td>${test.name || 'Unknown'}</td>
        <td class="status-${test.status}">${test.status || 'Unknown'}</td>
        <td>${test.duration || 'N/A'}</td>
        <td>${test.engine || 'N/A'}</td>
      </tr>
    `).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Engine</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  /**
   * Format healing strategies for HTML
   */
  private formatStrategies(strategies: HealingStats[]): string {
    return strategies.map(strategy => `
      <div class="strategy">
        <h3>${strategy.strategyName}</h3>
        <p><strong>Success Rate:</strong> ${Math.round(strategy.successRate * 100)}%</p>
        <p><strong>Total Attempts:</strong> ${strategy.totalAttempts}</p>
        <p><strong>Average Duration:</strong> ${Math.round(strategy.averageDuration)}ms</p>
      </div>
    `).join('');
  }

  /**
   * Format failure types for HTML
   */
  private formatFailureTypes(failureTypes: Record<string, number>): string {
    const entries = Object.entries(failureTypes);
    if (entries.length === 0) {
      return '<p>No failure types recorded</p>';
    }

    return entries.map(([type, count]) => `
      <div class="failure-type">
        <strong>${type}:</strong> ${count} occurrences
      </div>
    `).join('');
  }

  /**
   * Format components for HTML
   */
  private formatComponents(components: any[]): string {
    return components.map(component => `
      <div class="component">
        <h3>${component.component}</h3>
        <p><strong>Status:</strong> <span class="status status-${component.status}">${component.status}</span></p>
        <p><strong>Last Check:</strong> ${new Date(component.timestamp).toLocaleString()}</p>
        ${component.details.lastError ? `<p><strong>Error:</strong> ${component.details.lastError}</p>` : ''}
      </div>
    `).join('');
  }

  /**
   * Format system metrics for HTML
   */
  private formatSystemMetrics(data: SystemHealth): string {
    return `
      <div class="metric">
        <p><strong>Total Components:</strong> ${data.summary.totalComponents}</p>
        <p><strong>Healthy Components:</strong> ${data.summary.healthyComponents}</p>
        <p><strong>Degraded Components:</strong> ${data.summary.degradedComponents}</p>
        <p><strong>Unhealthy Components:</strong> ${data.summary.unhealthyComponents}</p>
      </div>
    `;
  }

  /**
   * Format performance metrics for HTML
   */
  private formatPerformanceMetrics(metrics: any[]): string {
    return metrics.map((metric: any) => `
      <div class="metric">
        <h3>${metric.component} - ${metric.operation}</h3>
        <p><strong>Response Time:</strong> ${metric.responseTime}ms</p>
        <p><strong>Throughput:</strong> ${metric.throughput} req/s</p>
        <p><strong>Error Rate:</strong> ${metric.errorRate}%</p>
      </div>
    `).join('');
  }

  /**
   * Format trends for HTML
   */
  private formatTrends(trends: any[]): string {
    return trends.map((trend: any) => `
      <div class="trend">
        <p><strong>${trend.metric}:</strong> ${trend.trend} (${trend.change})</p>
      </div>
    `).join('');
  }

  /**
   * Format recommendations for HTML
   */
  private formatRecommendations(recommendations: string[]): string {
    if (recommendations.length === 0) {
      return '<p>No recommendations available</p>';
    }

    return `
      <ul>
        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    `;
  }

  /**
   * Format uptime duration
   */
  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default title for report type
   */
  private getDefaultTitle(type: string): string {
    const titles = {
      'test-execution': 'Test Execution Report',
      'healing-summary': 'Healing Summary Report',
      'system-health': 'System Health Report',
      'performance': 'Performance Report',
    };
    return titles[type as keyof typeof titles] || 'Report';
  }

  /**
   * Get default description for report type
   */
  private getDefaultDescription(type: string): string {
    const descriptions = {
      'test-execution': 'Comprehensive analysis of test execution results',
      'healing-summary': 'Summary of self-healing activities and performance',
      'system-health': 'Overview of system health and component status',
      'performance': 'Performance metrics and analysis',
    };
    return descriptions[type as keyof typeof descriptions] || 'Automated report';
  }

  /**
   * Get default output path for report
   */
  private getDefaultOutputPath(reportData: ReportData): string {
    const timestamp = reportData.generatedAt.toISOString().split('T')[0];
    const filename = `${reportData.type}_${timestamp}_${reportData.id}.${reportData.metadata.format}`;
    return path.join(this.config.outputDir, filename);
  }

  /**
   * Save report to file
   */
  private async saveReport(outputPath: string, content: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, content, 'utf8');
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create output directory:', error);
    }
  }

  /**
   * List available templates
   */
  getAvailableTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ReportTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Cleanup old reports based on retention policy
   */
  async cleanupOldReports(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.outputDir);
      const cutoffDate = new Date(Date.now() - this.config.retention * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.config.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old reports:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.templates.clear();
  }
}
