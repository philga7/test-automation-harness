/**
 * Unit tests for ReportGenerator
 * 
 * Tests report generation, export formats, scheduling, and file operations
 * Following Cipher lessons learned:
 * - Use actual components to test against
 * - Validate each suite before moving on
 * - Fix TypeScript errors and unused variables
 * - Avoid duplicate code
 * - Test real functionality, not mocks
 */

import { ReportGenerator, ReportGenerationOptions } from '../../../src/observability/reporting/ReportGenerator';
import { SystemHealth } from '../../../src/observability/types';
import fs from 'fs/promises';
import path from 'path';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let testOutputDir: string;
  let config: any;

  beforeEach(() => {
    // Create a unique test output directory for each test
    testOutputDir = path.join(__dirname, 'test-reports', `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    config = {
      enabled: true,
      schedule: '0 0 * * *',
      formats: ['json', 'html'],
      outputDir: testOutputDir,
      retention: 7,
    };

    reportGenerator = new ReportGenerator(config);
  });

  afterEach(async () => {
    // Clean up test files and directories
    if (reportGenerator) {
      reportGenerator.destroy();
    }
    
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize with provided configuration', () => {
      expect(reportGenerator).toBeDefined();
      expect(reportGenerator.getAvailableTemplates()).toBeDefined();
    });

    it('should initialize with default configuration when minimal config provided', () => {
      const minimalConfig = { 
        enabled: true,
        schedule: '0 0 * * *',
        formats: ['json', 'html'] as ('json' | 'html' | 'pdf')[],
        outputDir: './reports',
        retention: 30,
      };
      const generator = new ReportGenerator(minimalConfig);
      
      expect(generator).toBeDefined();
      expect(generator.getAvailableTemplates()).toBeDefined();
      
      generator.destroy();
    });

    it('should initialize templates on construction', () => {
      const templates = reportGenerator.getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for expected template types
      const templateTypes = templates.map(t => t.type);
      expect(templateTypes).toContain('test-execution');
      expect(templateTypes).toContain('healing-summary');
      expect(templateTypes).toContain('system-health');
      expect(templateTypes).toContain('performance');
    });
  });

  describe('Template Management', () => {
    it('should provide available templates', () => {
      const templates = reportGenerator.getAvailableTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      // Verify template structure
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('template');
        expect(template).toHaveProperty('variables');
        
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(['test-execution', 'healing-summary', 'system-health', 'performance']).toContain(template.type);
        expect(typeof template.template).toBe('string');
        expect(Array.isArray(template.variables)).toBe(true);
      });
    });

    it('should have unique template IDs', () => {
      const templates = reportGenerator.getAvailableTemplates();
      const ids = templates.map(t => t.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid template types', () => {
      const templates = reportGenerator.getAvailableTemplates();
      const validTypes = ['test-execution', 'healing-summary', 'system-health', 'performance'];
      
      templates.forEach(template => {
        expect(validTypes).toContain(template.type);
      });
    });
  });

  describe('Report Generation', () => {
    const createTestExecutionData = () => ({
      summary: {
        totalTests: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        duration: 15000,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:15Z'),
      },
      tests: [
        { name: 'test1', status: 'passed', duration: 1000 },
        { name: 'test2', status: 'failed', duration: 2000, error: 'Assertion failed' },
      ],
      environment: {
        nodeVersion: '18.0.0',
        platform: 'linux',
        arch: 'x64',
      },
    });

    const createSystemHealthData = (): SystemHealth => ({
      status: 'healthy',
      timestamp: new Date(),
      components: [
        { 
          status: 'healthy', 
          component: 'database', 
          timestamp: new Date(), 
          uptime: 3600000,
          details: { metrics: { responseTime: 50 } }
        },
        { 
          status: 'healthy', 
          component: 'api', 
          timestamp: new Date(), 
          uptime: 3600000,
          details: { metrics: { responseTime: 100 } }
        },
      ],
      summary: {
        totalComponents: 2,
        healthyComponents: 2,
        unhealthyComponents: 0,
        degradedComponents: 0,
        uptime: 3600000,
      },
    });

    it('should generate JSON test execution report', async () => {
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        title: 'Test Execution Report',
        format: 'json',
        data: testData,
      };

      const report = await reportGenerator.generateReport(options);

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.type).toBe('test-execution');
      expect(report.title).toBe('Test Execution Report');
      expect(report.metadata.format).toBe('json');
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.data).toEqual(testData);
      expect(report.timeRange).toBeDefined();
    });

    it('should generate HTML test execution report', async () => {
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        title: 'Test Execution Report',
        format: 'html',
        data: testData,
      };

      const report = await reportGenerator.generateReport(options);

      expect(report).toBeDefined();
      expect(report.type).toBe('test-execution');
      expect(report.metadata.format).toBe('html');
      expect(report.data).toEqual(testData);
      expect(report.title).toBe('Test Execution Report');
    });

    it('should generate system health report', async () => {
      const healthData = createSystemHealthData();
      const options: ReportGenerationOptions = {
        type: 'system-health',
        title: 'System Health Report',
        format: 'json',
        data: healthData,
      };

      const report = await reportGenerator.generateReport(options);

      expect(report).toBeDefined();
      expect(report.type).toBe('system-health');
      expect(report.title).toBe('System Health Report');
      expect(report.data).toEqual(healthData);
      expect(report.metadata.format).toBe('json');
    });

    it('should generate healing summary report', async () => {
      const healingData = {
        summary: {
          totalFailures: 5,
          healedFailures: 3,
          healingRate: 0.6,
          averageHealingTime: 2000,
        },
        strategies: [
          { name: 'selector-healing', successRate: 0.8, usage: 10 },
          { name: 'retry-healing', successRate: 0.6, usage: 5 },
        ],
        failureTypes: {
          'element-not-found': 3,
          'timeout': 2,
        },
      };

      const options: ReportGenerationOptions = {
        type: 'healing-summary',
        title: 'Healing Summary Report',
        format: 'json',
        data: healingData,
      };

      const report = await reportGenerator.generateReport(options);

      expect(report).toBeDefined();
      expect(report.type).toBe('healing-summary');
      expect(report.title).toBe('Healing Summary Report');
      expect(report.data).toEqual(healingData);
      expect(report.metadata.format).toBe('json');
    });

    it('should generate performance report', async () => {
      const performanceData = {
        summary: {
          totalRequests: 1000,
          averageResponseTime: 150,
          p95ResponseTime: 300,
          errorRate: 0.02,
        },
        metrics: [
          { name: 'response-time', value: 150, unit: 'ms' },
          { name: 'throughput', value: 100, unit: 'req/s' },
        ],
        trends: [
          { timestamp: new Date(), value: 150 },
          { timestamp: new Date(), value: 160 },
        ],
        recommendations: [
          'Consider caching frequently accessed data',
          'Optimize database queries',
        ],
      };

      const options: ReportGenerationOptions = {
        type: 'performance',
        title: 'Performance Report',
        format: 'json',
        data: performanceData,
      };

      const report = await reportGenerator.generateReport(options);

      expect(report).toBeDefined();
      expect(report.type).toBe('performance');
      expect(report.title).toBe('Performance Report');
      expect(report.data).toEqual(performanceData);
      expect(report.metadata.format).toBe('json');
    });

    it('should use custom output path when provided', async () => {
      const testData = createTestExecutionData();
      const customPath = path.join(testOutputDir, 'custom-report.json');
      
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: testData,
        outputPath: customPath,
      };

      const report = await reportGenerator.generateReport(options);

      // Verify the report was generated successfully
      expect(report).toBeDefined();
      expect(report.type).toBe('test-execution');
      
      // Verify the file was created at the custom path
      await expect(fs.access(customPath)).resolves.not.toThrow();
    });

    it('should generate unique report IDs', async () => {
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: testData,
      };

      const report1 = await reportGenerator.generateReport(options);
      const report2 = await reportGenerator.generateReport(options);

      expect(report1.id).not.toBe(report2.id);
    });

    it('should include time range when provided', async () => {
      const testData = createTestExecutionData();
      const timeRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      };

      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: testData,
        timeRange,
      };

      const report = await reportGenerator.generateReport(options);

      expect(report).toBeDefined();
      expect(report.timeRange).toEqual(timeRange);
    });
  });

  describe('File Operations', () => {
    it('should create output directory if it does not exist', async () => {
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: testData,
      };

      // Verify directory doesn't exist initially
      try {
        await fs.access(testOutputDir);
        // If we get here, directory exists, so remove it
        await fs.rm(testOutputDir, { recursive: true, force: true });
      } catch (error) {
        // Directory doesn't exist, which is what we want
      }

      const report = await reportGenerator.generateReport(options);

      // Verify directory was created
      await expect(fs.access(testOutputDir)).resolves.not.toThrow();
      
      // Verify report was generated successfully
      expect(report).toBeDefined();
      expect(report.type).toBe('test-execution');
    });

    it('should save report content to file', async () => {
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: testData,
      };

      const report = await reportGenerator.generateReport(options);

      // Verify report was generated successfully
      expect(report).toBeDefined();
      expect(report.type).toBe('test-execution');
      
      // Verify files were created in the output directory
      const files = await fs.readdir(testOutputDir);
      expect(files.length).toBeGreaterThan(0);
      
      // Verify at least one JSON file was created
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      expect(jsonFiles.length).toBeGreaterThan(0);
      
      // Verify file content matches report data
      const reportFile = jsonFiles[0];
      if (reportFile) {
        const filePath = path.join(testOutputDir, reportFile);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const fileData = JSON.parse(fileContent);
        expect(fileData.id).toBe(report.id);
        expect(fileData.type).toBe(report.type);
      }
    });

    it('should handle file write errors gracefully', async () => {
      // Create a generator with invalid output directory
      const invalidConfig = {
        ...config,
        outputDir: '/invalid/path/that/does/not/exist',
      };
      
      const invalidGenerator = new ReportGenerator(invalidConfig);
      
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: testData,
      };

      // Should throw an error when trying to create invalid directory
      await expect(invalidGenerator.generateReport(options)).rejects.toThrow();
      
      invalidGenerator.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing data gracefully', async () => {
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: null,
      };

      // Should not throw, but should handle gracefully
      await expect(reportGenerator.generateReport(options)).resolves.toBeDefined();
    });

    it('should handle invalid report type gracefully', async () => {
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'invalid-type' as any,
        format: 'json',
        data: testData,
      };

      // Should not throw, but should handle gracefully
      await expect(reportGenerator.generateReport(options)).resolves.toBeDefined();
    });

    it('should handle invalid format gracefully', async () => {
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'invalid-format' as any,
        data: testData,
      };

      // Should throw an error for unsupported format
      await expect(reportGenerator.generateReport(options)).rejects.toThrow('Unsupported report format');
    });
  });

  describe('Report Cleanup', () => {
    it('should cleanup old reports based on retention policy', async () => {
      // Create some test reports with different timestamps
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const oldReportPath = path.join(testOutputDir, `old-report-${oldDate.getTime()}.json`);
      const recentReportPath = path.join(testOutputDir, `recent-report-${recentDate.getTime()}.json`);

      // Create test files
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(oldReportPath, '{"old": "report"}');
      await fs.writeFile(recentReportPath, '{"recent": "report"}');

      // Run cleanup
      await reportGenerator.cleanupOldReports();

      // Verify old report was deleted (file should not exist)
      try {
        await fs.access(oldReportPath);
        // If we get here, the file still exists, which means cleanup didn't work
        expect(true).toBe(false); // Force test failure
      } catch (error) {
        // File doesn't exist, which is what we want
        expect(error).toBeDefined();
      }
      
      // Verify recent report still exists
      await expect(fs.access(recentReportPath)).resolves.not.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Create a generator with invalid output directory for cleanup
      const invalidConfig = {
        ...config,
        outputDir: '/invalid/path/for/cleanup',
      };
      
      const invalidGenerator = new ReportGenerator(invalidConfig);

      // Should not throw
      await expect(invalidGenerator.cleanupOldReports()).resolves.not.toThrow();
      
      invalidGenerator.destroy();
    });
  });

  describe('Resource Management', () => {
    it('should destroy resources properly', () => {
      const templates = reportGenerator.getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);

      reportGenerator.destroy();

      // After destroy, templates should be cleared
      const templatesAfterDestroy = reportGenerator.getAvailableTemplates();
      expect(templatesAfterDestroy.length).toBe(0);
    });

    it('should handle multiple destroy calls gracefully', () => {
      expect(() => {
        reportGenerator.destroy();
        reportGenerator.destroy();
        reportGenerator.destroy();
      }).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle disabled configuration', async () => {
      const disabledConfig = {
        ...config,
        enabled: false,
      };
      
      const disabledGenerator = new ReportGenerator(disabledConfig);
      
      const testData = createTestExecutionData();
      const options: ReportGenerationOptions = {
        type: 'test-execution',
        format: 'json',
        data: testData,
      };

      // Should throw an error when report generation is disabled
      await expect(disabledGenerator.generateReport(options)).rejects.toThrow('Report generation is disabled');
      
      disabledGenerator.destroy();
    });

    it('should use default values for missing configuration', () => {
      const minimalConfig = { 
        enabled: true,
        schedule: '0 0 * * *',
        formats: ['json', 'html'] as ('json' | 'html' | 'pdf')[],
        outputDir: './reports',
        retention: 30,
      };
      const generator = new ReportGenerator(minimalConfig);
      
      expect(generator).toBeDefined();
      expect(generator.getAvailableTemplates()).toBeDefined();
      
      generator.destroy();
    });
  });

  // Helper functions
  function createTestExecutionData() {
    return {
      summary: {
        totalTests: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        duration: 15000,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:15Z'),
      },
      tests: [
        { name: 'test1', status: 'passed', duration: 1000 },
        { name: 'test2', status: 'failed', duration: 2000, error: 'Assertion failed' },
      ],
      environment: {
        nodeVersion: '18.0.0',
        platform: 'linux',
        arch: 'x64',
      },
    };
  }
});
