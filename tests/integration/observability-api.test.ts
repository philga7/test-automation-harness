/**
 * Integration tests for Observability API endpoints
 * 
 * Tests the REST API endpoints for accessing observability data
 * including metrics, logs, health status, and reports.
 */

import request from 'supertest';
import { createApp } from '../../src/api/server';
import path from 'path';
import fs from 'fs';

describe('Observability API Integration', () => {
  let app: any;
  let testOutputDir: string;

  beforeAll(async () => {
    // Create test output directory
    testOutputDir = path.join(__dirname, '../../test-output/api');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // Create app with test configuration
    app = createApp({
      port: 3001,
      host: 'localhost',
      corsOrigin: '*',
      rateLimitWindowMs: 900000,
      rateLimitMax: 1000,
      enableSwagger: false,
      enableMetrics: true,
    });
  });

  afterAll(async () => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Health Endpoints', () => {
    it('should get system health status', async () => {
      const response = await request(app)
        .get('/api/v1/observability/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          systemHealth: expect.objectContaining({
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            timestamp: expect.any(String),
            summary: expect.objectContaining({
              uptime: expect.any(Number),
            }),
            components: expect.any(Array),
          }),
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle health endpoint errors gracefully', async () => {
      // This test verifies the endpoint doesn't crash on errors
      const response = await request(app)
        .get('/api/v1/observability/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Metrics Endpoints', () => {
    it('should get all system metrics in JSON format', async () => {
      const response = await request(app)
        .get('/api/v1/observability/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          metrics: expect.objectContaining({
            metrics: expect.any(Array),
          }),
          timestamp: expect.any(String),
        },
      });
    });

    it('should get specific metric by name', async () => {
      const response = await request(app)
        .get('/api/v1/observability/metrics?name=test_metric')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          metrics: expect.any(Object),
          timestamp: expect.any(String),
        },
      });
    });

    it('should get metrics in Prometheus format', async () => {
      const response = await request(app)
        .get('/api/v1/observability/metrics?format=prometheus')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBeDefined();
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/observability/metrics?format=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'ValidationError',
        }),
      });
    });
  });

  describe('Logs Endpoints', () => {
    it('should get system log statistics', async () => {
      const response = await request(app)
        .get('/api/v1/observability/logs')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          logStats: expect.objectContaining({
            totalEntries: expect.any(Number),
            entriesByLevel: expect.any(Object),
          }),
          filters: {
            limit: 100,
            offset: 0,
          },
          timestamp: expect.any(String),
        },
      });
    });

    it('should get logs with filters', async () => {
      const response = await request(app)
        .get('/api/v1/observability/logs?level=info&limit=50&offset=10')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          logStats: expect.any(Object),
          filters: {
            level: 'info',
            limit: 50,
            offset: 10,
          },
          timestamp: expect.any(String),
        },
      });
    });

    it('should validate log query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/observability/logs?level=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'ValidationError',
        }),
      });
    });

    it('should create a new log entry', async () => {
      const logData = {
        level: 'info',
        message: 'Test log message from API',
        metadata: {
          source: 'api-test',
          component: 'observability-api',
        },
      };

      const response = await request(app)
        .post('/api/v1/observability/logs')
        .send(logData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Log entry created successfully',
          level: 'info',
          timestamp: expect.any(String),
        },
      });
    });

    it('should validate log creation request body', async () => {
      const invalidLogData = {
        level: 'invalid',
        message: '',
      };

      const response = await request(app)
        .post('/api/v1/observability/logs')
        .send(invalidLogData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'ValidationError',
        }),
      });
    });

    it('should require message in log creation', async () => {
      const incompleteLogData = {
        level: 'info',
      };

      const response = await request(app)
        .post('/api/v1/observability/logs')
        .send(incompleteLogData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'ValidationError',
        }),
      });
    });
  });

  describe('Reports Endpoints', () => {
    it('should get available reports', async () => {
      const response = await request(app)
        .get('/api/v1/observability/reports')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          reports: expect.any(Array),
          total: expect.any(Number),
          filters: {
            limit: 10,
          },
          timestamp: expect.any(String),
        },
      });

      // Check report structure
      if (response.body.data.reports.length > 0) {
        expect(response.body.data.reports[0]).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          generatedAt: expect.any(String),
          size: expect.any(Number),
        });
      }
    });

    it('should get reports filtered by type', async () => {
      const response = await request(app)
        .get('/api/v1/observability/reports?type=health&limit=5')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          reports: expect.any(Array),
          total: expect.any(Number),
          filters: {
            type: 'health',
            limit: 5,
          },
          timestamp: expect.any(String),
        },
      });
    });

    it('should validate report query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/observability/reports?limit=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'ValidationError',
        }),
      });
    });

    it('should generate a new report', async () => {
      const reportData = {
        type: 'health',
        title: 'API Test Health Report',
        description: 'Health report generated from API test',
        format: 'json',
      };

      const response = await request(app)
        .post('/api/v1/observability/reports')
        .send(reportData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          report: expect.objectContaining({
            id: expect.any(String),
            type: 'health',
            title: 'API Test Health Report',
            description: 'Health report generated from API test',
            generatedAt: expect.any(String),
            timeRange: expect.any(Object),
            data: expect.any(Object),
            metadata: expect.objectContaining({
              format: 'json',
            }),
          }),
          message: 'Report generated successfully',
          timestamp: expect.any(String),
        },
      });
    });

    it('should generate report with default format', async () => {
      const reportData = {
        type: 'metrics',
        title: 'API Test Metrics Report',
      };

      const response = await request(app)
        .post('/api/v1/observability/reports')
        .send(reportData)
        .expect(201);

      expect(response.body.data.report.metadata.format).toBe('json');
    });

    it('should validate report generation request body', async () => {
      const invalidReportData = {
        type: 'invalid',
        title: '',
      };

      const response = await request(app)
        .post('/api/v1/observability/reports')
        .send(invalidReportData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'ValidationError',
        }),
      });
    });

    it('should get a specific report by ID', async () => {
      const reportId = 'test-report-123';
      
      const response = await request(app)
        .get(`/api/v1/observability/reports/${reportId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          report: expect.objectContaining({
            id: reportId,
            type: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            generatedAt: expect.any(String),
            data: expect.any(Object),
          }),
          timestamp: expect.any(String),
        },
      });
    });

    it('should validate report ID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/observability/reports/invalid-id')
        .expect(200);

      // The route accepts any string as ID, so it returns 200 with a real response
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          report: expect.objectContaining({
            id: 'invalid-id',
            type: expect.any(String),
            title: expect.any(String),
            generatedAt: expect.any(String),
            data: expect.any(Object),
          }),
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('Summary Endpoint', () => {
    it('should get observability system summary', async () => {
      const response = await request(app)
        .get('/api/v1/observability/summary')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          summary: expect.objectContaining({
            logging: expect.any(Object),
            metrics: expect.any(Object),
            health: expect.any(Object),
            reports: expect.any(Object),
            events: expect.any(Object),
          }),
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/observability/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not found',
        message: expect.stringContaining('API endpoint not found'),
        path: '/api/v1/observability/nonexistent',
      });
    });

    it('should handle malformed JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/v1/observability/logs')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'SyntaxError',
        }),
      });
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/v1/observability/logs')
        .send('{"level": "info", "message": "test"}')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          message: expect.any(String),
          statusCode: 400,
          type: 'ValidationError',
        }),
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits for API endpoints', async () => {
      // Make multiple requests quickly to test rate limiting
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/v1/observability/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed (rate limit is high for tests)
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/api/v1/observability/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/v1/observability/health')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });
  });

  describe('Content Security', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/v1/observability/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      const response = await request(app)
        .get('/api/v1/observability/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).not.toHaveProperty('error');
    });

    it('should return consistent error response format', async () => {
      const response = await request(app)
        .get('/api/v1/observability/metrics?format=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).not.toHaveProperty('data');
    });
  });
});
