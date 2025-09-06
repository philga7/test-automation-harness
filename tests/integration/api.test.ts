/**
 * Integration tests for API endpoints
 */

import express from 'express';
import request from 'supertest';
import createTestApp from '../setup/test-server';

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });
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
      
      expect(response.body.features).toHaveProperty('testOrchestration', 'planned');
      expect(response.body.features).toHaveProperty('selfHealing', 'planned');
      expect(response.body.features).toHaveProperty('unifiedReporting', 'planned');
    });

    it('should return expected message format', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.message).toContain('Self-Healing Test Automation Harness');
      expect(response.body.message).toContain('API');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body).toHaveProperty('path', '/nonexistent');
    });

    it('should return 404 for non-existent API endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body).toHaveProperty('path', '/api/nonexistent');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests gracefully', async () => {
      await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(500); // Express returns 500 for malformed JSON
    });

    it('should handle unsupported HTTP methods', async () => {
      await request(app)
        .patch('/health')
        .expect(404);
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
