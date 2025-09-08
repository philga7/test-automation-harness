/**
 * Comprehensive integration tests for all API endpoints
 */

import request from 'supertest';
import createApiTestApp from '../setup/api-test-server';

describe('API Endpoints Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = createApiTestApp();
  });

  afterAll(async () => {
    // Clean up any resources
    if (app && app.close) {
      await new Promise<void>((resolve) => {
        app.close(() => {
          resolve();
        });
      });
    }
  });

  describe('Health and Status Endpoints', () => {
    describe('GET /health', () => {
      it('should return healthy status', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('version');
        expect(typeof response.body.timestamp).toBe('string');
        expect(typeof response.body.version).toBe('string');
      });

      it('should return valid timestamp format', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        const timestamp = new Date(response.body.timestamp);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).not.toBeNaN();
      });
    });

    describe('GET /api/status', () => {
      it('should return API status information', async () => {
        const response = await request(app)
          .get('/api/status')
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('status', 'running');
        expect(response.body).toHaveProperty('features');
        
        expect(response.body.features).toHaveProperty('testOrchestration');
        expect(response.body.features).toHaveProperty('selfHealing');
        expect(response.body.features).toHaveProperty('unifiedReporting');
      });

      it('should return expected message format', async () => {
        const response = await request(app)
          .get('/api/status')
          .expect(200);

        expect(response.body.message).toContain('Self-Healing Test Automation Harness');
        expect(response.body.message).toContain('API');
      });
    });
  });

  describe('Test Execution Endpoints', () => {
    describe('POST /api/v1/tests/execute', () => {
      it('should execute a test successfully', async () => {
        const testConfig = {
          name: 'Login Test',
          description: 'Test user login functionality',
          engine: 'playwright',
          config: {
            url: 'https://example.com',
            timeout: 30000
          },
          options: {
            timeout: 30000,
            retries: 2,
            parallel: false,
            healing: true
          }
        };

        const response = await request(app)
          .post('/api/v1/tests/execute')
          .send(testConfig)
          .expect(202);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('testId');
        expect(response.body.data).toHaveProperty('status', 'accepted');
        expect(response.body.data).toHaveProperty('message');
        expect(response.body.data).toHaveProperty('estimatedDuration');
      });

      it('should reject invalid test configuration', async () => {
        const invalidConfig = {
          name: '', // Invalid: empty name
          engine: 'invalid-engine'
        };

        const response = await request(app)
          .post('/api/v1/tests/execute')
          .send(invalidConfig)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('type', 'ValidationError');
      });

      it('should reject missing required fields', async () => {
        const incompleteConfig = {
          description: 'Test without name and engine'
        };

        const response = await request(app)
          .post('/api/v1/tests/execute')
          .send(incompleteConfig)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/tests/:id/status', () => {
      it('should return test status for valid test ID', async () => {
        // First create a test
        const testConfig = {
          name: 'Status Test',
          engine: 'playwright',
          config: { url: 'https://example.com' }
        };

        const createResponse = await request(app)
          .post('/api/v1/tests/execute')
          .send(testConfig)
          .expect(202);

        const testId = createResponse.body.data.testId;

        // Then check status
        const response = await request(app)
          .get(`/api/v1/tests/${testId}/status`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('testId', testId);
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('startTime');
        expect(response.body.data).toHaveProperty('progress');
        expect(response.body.data).toHaveProperty('healingAttempts');
        expect(response.body.data).toHaveProperty('errors');
      });

      it('should return 404 for non-existent test ID', async () => {
        const response = await request(app)
          .get('/api/v1/tests/non-existent-id/status')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('type', 'NotFoundError');
      });
    });

    describe('GET /api/v1/tests/:id/result', () => {
      it('should return test result for valid test ID', async () => {
        // First create a test
        const testConfig = {
          name: 'Result Test',
          engine: 'playwright',
          config: { url: 'https://example.com' }
        };

        const createResponse = await request(app)
          .post('/api/v1/tests/execute')
          .send(testConfig)
          .expect(202);

        const testId = createResponse.body.data.testId;

        // Then get result
        const response = await request(app)
          .get(`/api/v1/results/${testId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id', testId);
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('startTime');
        expect(response.body.data).toHaveProperty('duration');
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('output');
      });

      it('should include artifacts when requested', async () => {
        // First create a test
        const testConfig = {
          name: 'Artifacts Test',
          engine: 'playwright',
          config: { url: 'https://example.com' }
        };

        const createResponse = await request(app)
          .post('/api/v1/tests/execute')
          .send(testConfig)
          .expect(202);

        const testId = createResponse.body.data.testId;

        // Then get result with artifacts
        const response = await request(app)
          .get(`/api/v1/results/${testId}?includeArtifacts=true`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('artifacts');
      });
    });

    describe('POST /api/v1/tests/:id/cancel', () => {
      it('should cancel a running test', async () => {
        // First create a test
        const testConfig = {
          name: 'Cancel Test',
          engine: 'playwright',
          config: { url: 'https://example.com' }
        };

        const createResponse = await request(app)
          .post('/api/v1/tests/execute')
          .send(testConfig)
          .expect(202);

        const testId = createResponse.body.data.testId;

        // Then cancel it
        const response = await request(app)
          .post(`/api/v1/tests/${testId}/cancel`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('testId', testId);
        expect(response.body.data).toHaveProperty('status', 'cancelled');
        expect(response.body.data).toHaveProperty('message');
      });

      it('should return 404 for non-existent test ID', async () => {
        const response = await request(app)
          .post('/api/v1/tests/non-existent-id/cancel')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/tests/queue', () => {
      it('should return test queue status', async () => {
        const response = await request(app)
          .get('/api/v1/tests/queue')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/v1/tests/queue?page=1&limit=5')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('pagination');
        expect(response.body.data.pagination).toHaveProperty('page', 1);
        expect(response.body.data.pagination).toHaveProperty('limit', 5);
      });
    });

    describe('GET /api/v1/tests/engines', () => {
      it('should return available test engines', async () => {
        const response = await request(app)
          .get('/api/v1/engines')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
        
        if (response.body.data.items.length > 0) {
          const engine = response.body.data.items[0];
          expect(engine).toHaveProperty('id');
          expect(engine).toHaveProperty('name');
          expect(engine).toHaveProperty('version');
          expect(engine).toHaveProperty('testType');
          expect(engine).toHaveProperty('status');
          expect(engine).toHaveProperty('supportsHealing');
        }
      });

      it('should filter engines by type', async () => {
        const response = await request(app)
          .get('/api/v1/engines?testType=e2e')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });
    });
  });

  describe('Test Results Endpoints', () => {
    describe('GET /api/v1/results', () => {
      it('should return test results with pagination', async () => {
        const response = await request(app)
          .get('/api/v1/results?page=1&limit=10')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.items)).toBe(true);
        
        expect(response.body.data.pagination).toHaveProperty('page', 1);
        expect(response.body.data.pagination).toHaveProperty('limit', 10);
        expect(response.body.data.pagination).toHaveProperty('total');
        expect(response.body.data.pagination).toHaveProperty('totalPages');
        expect(response.body.data.pagination).toHaveProperty('hasNext');
        expect(response.body.data.pagination).toHaveProperty('hasPrev');
      });

      it('should filter results by status', async () => {
        const response = await request(app)
          .get('/api/v1/results?status=passed')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should filter results by engine', async () => {
        const response = await request(app)
          .get('/api/v1/results?engine=playwright')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should filter results by date range', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app)
          .get(`/api/v1/results?startDate=${startDate}&endDate=${endDate}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should sort results', async () => {
        const response = await request(app)
          .get('/api/v1/results?sort=asc&sortBy=startTime')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });
    });

    describe('GET /api/v1/results/:id', () => {
      it('should return specific test result', async () => {
        // First create a test
        const testConfig = {
          name: 'Specific Result Test',
          engine: 'playwright',
          config: { url: 'https://example.com' }
        };

        const createResponse = await request(app)
          .post('/api/v1/tests/execute')
          .send(testConfig)
          .expect(202);

        const testId = createResponse.body.data.testId;

        // Then get the specific result
        const response = await request(app)
          .get(`/api/v1/results/${testId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id', testId);
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('startTime');
        expect(response.body.data).toHaveProperty('duration');
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('output');
      });

      it('should return 404 for non-existent result ID', async () => {
        const response = await request(app)
          .get('/api/v1/results/non-existent-id')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/results/summary', () => {
      it('should return test results summary', async () => {
        const response = await request(app)
          .get('/api/v1/results/summary')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('passed');
        expect(response.body.data).toHaveProperty('failed');
        expect(response.body.data).toHaveProperty('skipped');
        expect(response.body.data).toHaveProperty('running');
        expect(response.body.data).toHaveProperty('successRate');
        expect(response.body.data).toHaveProperty('avgDuration');
      });

      it('should filter summary by date range', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app)
          .get(`/api/v1/results/summary?startDate=${startDate}&endDate=${endDate}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('passed');
        expect(response.body.data).toHaveProperty('failed');
        expect(response.body.data).toHaveProperty('successRate');
      });
    });
  });

  describe('Healing Management Endpoints', () => {
    describe('GET /api/v1/healing/strategies', () => {
      it('should return available healing strategies', async () => {
        const response = await request(app)
          .get('/api/v1/healing/strategies')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
        
        if (response.body.data.length > 0) {
          const strategy = response.body.data[0];
          expect(strategy).toHaveProperty('id');
          expect(strategy).toHaveProperty('name');
          expect(strategy).toHaveProperty('description');
          expect(strategy).toHaveProperty('failureTypes');
          expect(strategy).toHaveProperty('enabled');
          expect(strategy).toHaveProperty('confidence');
        }
      });

      it('should filter strategies by failure type', async () => {
        const response = await request(app)
          .get('/api/v1/healing/strategies?failureType=element_not_found')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should filter strategies by enabled status', async () => {
        const response = await request(app)
          .get('/api/v1/healing/strategies?enabled=true')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });
    });

    describe('GET /api/v1/healing/attempts', () => {
      it('should return healing attempts with pagination', async () => {
        const response = await request(app)
          .get('/api/v1/healing/attempts?page=1&limit=10')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.items)).toBe(true);
        
        expect(response.body.data.pagination).toHaveProperty('page', 1);
        expect(response.body.data.pagination).toHaveProperty('limit', 10);
        expect(response.body.data.pagination).toHaveProperty('total');
        expect(response.body.data.pagination).toHaveProperty('totalPages');
      });

      it('should filter attempts by test ID', async () => {
        const response = await request(app)
          .get('/api/v1/healing/attempts?testId=test-123')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should filter attempts by strategy', async () => {
        const response = await request(app)
          .get('/api/v1/healing/attempts?strategy=css-fallback')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should filter attempts by success status', async () => {
        const response = await request(app)
          .get('/api/v1/healing/attempts?success=true')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });
    });

    describe('GET /api/v1/healing/statistics', () => {
      it('should return healing statistics', async () => {
        const response = await request(app)
          .get('/api/v1/healing/statistics')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('successful');
        expect(response.body.data).toHaveProperty('failed');
        expect(response.body.data).toHaveProperty('successRate');
        expect(response.body.data).toHaveProperty('avgConfidence');
        expect(response.body.data).toHaveProperty('avgDuration');
        expect(response.body.data).toHaveProperty('strategyStats');
        expect(typeof response.body.data.strategyStats).toBe('object');
      });

      it('should filter statistics by date range', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app)
          .get(`/api/v1/healing/statistics?startDate=${startDate}&endDate=${endDate}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('successRate');
      });

      it('should group statistics by strategy', async () => {
        const response = await request(app)
          .get('/api/v1/healing/statistics?groupBy=strategy')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('strategyStats');
        expect(typeof response.body.data.strategyStats).toBe('object');
      });
    });
  });

  describe('Engine Management Endpoints', () => {
    describe('GET /api/v1/engines', () => {
      it('should return all available test engines', async () => {
        const response = await request(app)
          .get('/api/v1/engines')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
        
        if (response.body.data.items.length > 0) {
          const engine = response.body.data.items[0];
          expect(engine).toHaveProperty('id');
          expect(engine).toHaveProperty('name');
          expect(engine).toHaveProperty('version');
          expect(engine).toHaveProperty('testType');
          expect(engine).toHaveProperty('status');
          expect(engine).toHaveProperty('supportsHealing');
          expect(engine).toHaveProperty('config');
          expect(engine).toHaveProperty('capabilities');
        }
      });

      it('should filter engines by type', async () => {
        const response = await request(app)
          .get('/api/v1/engines?testType=e2e')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should filter engines by status', async () => {
        const response = await request(app)
          .get('/api/v1/engines?status=enabled')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('should filter engines by healing support', async () => {
        const response = await request(app)
          .get('/api/v1/engines?supportsHealing=true')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });
    });

    describe('GET /api/v1/engines/:id', () => {
      it('should return specific engine details', async () => {
        // First get all engines to find a valid ID
        const enginesResponse = await request(app)
          .get('/api/v1/engines')
          .expect(200);

        if (enginesResponse.body.data.length > 0) {
          const engineId = enginesResponse.body.data[0].id;

          const response = await request(app)
            .get(`/api/v1/engines/${engineId}`)
            .expect(200);

          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('id', engineId);
          expect(response.body.data).toHaveProperty('name');
          expect(response.body.data).toHaveProperty('version');
          expect(response.body.data).toHaveProperty('type');
          expect(response.body.data).toHaveProperty('enabled');
          expect(response.body.data).toHaveProperty('supportsHealing');
          expect(response.body.data).toHaveProperty('config');
        }
      });

      it('should return 404 for non-existent engine ID', async () => {
        const response = await request(app)
          .get('/api/v1/engines/non-existent-id')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/engines/:id/health', () => {
      it('should return engine health status', async () => {
        // First get all engines to find a valid ID
        const enginesResponse = await request(app)
          .get('/api/v1/engines')
          .expect(200);

        if (enginesResponse.body.data.length > 0) {
          const engineId = enginesResponse.body.data[0].id;

          const response = await request(app)
            .get(`/api/v1/engines/${engineId}/health`)
            .expect(200);

          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('engineId', engineId);
          expect(response.body.data).toHaveProperty('status');
          expect(response.body.data).toHaveProperty('lastCheck');
          expect(response.body.data).toHaveProperty('uptime');
          expect(response.body.data).toHaveProperty('version');
          expect(response.body.data).toHaveProperty('capabilities');
        }
      });

      it('should return 404 for non-existent engine ID', async () => {
        const response = await request(app)
          .get('/api/v1/engines/non-existent-id/health')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body).toHaveProperty('path', '/api/v1/nonexistent');
    });

    it('should handle malformed JSON requests gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/tests/execute')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/v1/tests/execute')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });

  describe('Response Headers', () => {
    it('should include proper content-type headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include proper content-type for API endpoints', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
