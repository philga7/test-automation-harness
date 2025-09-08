# API Testing Guide for Consumers

This guide provides comprehensive instructions for testing and integrating with the Self-Healing Test Automation Harness API.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Testing Environment Setup](#testing-environment-setup)
3. [API Testing Strategies](#api-testing-strategies)
4. [Test Scenarios](#test-scenarios)
5. [Error Handling Testing](#error-handling-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Integration Testing](#integration-testing)
9. [Monitoring and Observability](#monitoring-and-observability)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 18+ or Python 3.8+ (for client libraries)
- cURL or Postman (for manual testing)
- Access to the Test Automation Harness API endpoint
- Basic understanding of REST APIs and JSON

### Quick Start

1. **Verify API Health**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check API Status**
   ```bash
   curl http://localhost:3000/api/status
   ```

3. **Execute Your First Test**
   ```bash
   curl -X POST http://localhost:3000/api/v1/tests/execute \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Hello World Test",
       "engine": "playwright",
       "config": {
         "url": "https://example.com"
       }
     }'
   ```

## Testing Environment Setup

### Local Development

1. **Start the API Server**
   ```bash
   npm run dev
   ```

2. **Verify Server is Running**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Set Environment Variables**
   ```bash
   export API_BASE_URL="http://localhost:3000"
   export API_KEY=""  # Optional for development
   ```

### Staging Environment

1. **Configure Staging Endpoint**
   ```bash
   export API_BASE_URL="https://staging-api.test-automation-harness.com"
   export API_KEY="your-staging-api-key"
   ```

2. **Test Connectivity**
   ```bash
   curl -H "X-API-Key: $API_KEY" $API_BASE_URL/health
   ```

### Production Environment

1. **Configure Production Endpoint**
   ```bash
   export API_BASE_URL="https://api.test-automation-harness.com"
   export API_KEY="your-production-api-key"
   ```

2. **Verify Production Health**
   ```bash
   curl -H "X-API-Key: $API_KEY" $API_BASE_URL/health
   ```

## API Testing Strategies

### 1. Unit Testing

Test individual API endpoints in isolation:

```javascript
// Example using Jest
describe('Test Execution API', () => {
  test('should execute a test successfully', async () => {
    const response = await fetch('/api/v1/tests/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        engine: 'playwright',
        config: { url: 'https://example.com' }
      })
    });
    
    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.testId).toBeDefined();
  });
});
```

### 2. Integration Testing

Test complete workflows:

```javascript
describe('Test Execution Workflow', () => {
  test('should execute test and retrieve results', async () => {
    // 1. Execute test
    const executeResponse = await executeTest({
      name: 'Integration Test',
      engine: 'playwright',
      config: { url: 'https://example.com' }
    });
    
    const testId = executeResponse.data.testId;
    
    // 2. Monitor test status
    let status = 'running';
    while (status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await getTestStatus(testId);
      status = statusResponse.data.status;
    }
    
    // 3. Get final result
    const result = await getTestResult(testId);
    expect(result.data.status).toMatch(/passed|failed/);
  });
});
```

### 3. Contract Testing

Verify API contracts and schemas:

```javascript
// Example using Jest with JSON Schema validation
import Ajv from 'ajv';

const ajv = new Ajv();

const testExecutionSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      required: ['testId', 'status', 'message'],
      properties: {
        testId: { type: 'string' },
        status: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
};

test('test execution response matches schema', async () => {
  const response = await executeTest(testConfig);
  const validate = ajv.compile(testExecutionSchema);
  const valid = validate(response);
  
  expect(valid).toBe(true);
  if (!valid) {
    console.log(validate.errors);
  }
});
```

## Test Scenarios

### Happy Path Testing

Test successful API operations:

```bash
#!/bin/bash

# Test 1: Health Check
echo "Testing health endpoint..."
curl -s http://localhost:3000/health | jq '.status' | grep -q "healthy" && echo "✓ Health check passed" || echo "✗ Health check failed"

# Test 2: Execute Test
echo "Testing test execution..."
TEST_ID=$(curl -s -X POST http://localhost:3000/api/v1/tests/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Happy Path Test",
    "engine": "playwright",
    "config": {"url": "https://example.com"}
  }' | jq -r '.data.testId')

echo "Test ID: $TEST_ID"

# Test 3: Get Test Status
echo "Testing test status retrieval..."
curl -s http://localhost:3000/api/v1/tests/$TEST_ID/status | jq '.data.status' | grep -q "accepted" && echo "✓ Status retrieval passed" || echo "✗ Status retrieval failed"

# Test 4: Get Test Results
echo "Testing test results retrieval..."
curl -s http://localhost:3000/api/v1/results | jq '.data.results | length' | grep -q "0" && echo "✓ Results retrieval passed" || echo "✗ Results retrieval failed"
```

### Edge Case Testing

Test boundary conditions and edge cases:

```javascript
describe('Edge Cases', () => {
  test('should handle very long test names', async () => {
    const longName = 'a'.repeat(1000);
    const response = await executeTest({
      name: longName,
      engine: 'playwright',
      config: { url: 'https://example.com' }
    });
    
    expect(response.status).toBe(400); // Should reject long names
  });

  test('should handle special characters in test names', async () => {
    const specialName = 'Test with special chars: !@#$%^&*()';
    const response = await executeTest({
      name: specialName,
      engine: 'playwright',
      config: { url: 'https://example.com' }
    });
    
    expect(response.status).toBe(202);
  });

  test('should handle concurrent test executions', async () => {
    const promises = Array(5).fill(null).map(() => 
      executeTest({
        name: 'Concurrent Test',
        engine: 'playwright',
        config: { url: 'https://example.com' }
      })
    );
    
    const results = await Promise.all(promises);
    results.forEach(result => {
      expect(result.status).toBe(202);
    });
  });
});
```

### Negative Testing

Test error conditions and invalid inputs:

```javascript
describe('Negative Test Cases', () => {
  test('should reject empty request body', async () => {
    const response = await fetch('/api/v1/tests/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error.type).toBe('ValidationError');
  });

  test('should reject invalid engine names', async () => {
    const response = await executeTest({
      name: 'Test',
      engine: 'invalid-engine',
      config: { url: 'https://example.com' }
    });
    
    expect(response.status).toBe(400);
  });

  test('should return 404 for non-existent test IDs', async () => {
    const response = await fetch('/api/v1/tests/non-existent-id/status');
    expect(response.status).toBe(404);
  });
});
```

## Error Handling Testing

### Validation Error Testing

```javascript
describe('Validation Errors', () => {
  const testCases = [
    {
      name: 'missing required fields',
      body: { description: 'Missing name and engine' },
      expectedError: 'ValidationError'
    },
    {
      name: 'invalid field types',
      body: { name: 123, engine: 'playwright', config: {} },
      expectedError: 'ValidationError'
    },
    {
      name: 'invalid field values',
      body: { name: '', engine: 'playwright', config: {} },
      expectedError: 'ValidationError'
    }
  ];

  testCases.forEach(({ name, body, expectedError }) => {
    test(`should handle ${name}`, async () => {
      const response = await fetch('/api/v1/tests/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error.type).toBe(expectedError);
    });
  });
});
```

### Network Error Testing

```javascript
describe('Network Error Handling', () => {
  test('should handle connection timeouts', async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100); // 100ms timeout
    
    try {
      await fetch('/api/v1/tests/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTestConfig),
        signal: controller.signal
      });
    } catch (error) {
      expect(error.name).toBe('AbortError');
    } finally {
      clearTimeout(timeoutId);
    }
  });

  test('should handle server errors gracefully', async () => {
    // Mock server error
    const response = await fetch('/api/v1/tests/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* invalid config that causes server error */ })
    });
    
    if (response.status >= 500) {
      const error = await response.json();
      expect(error.error.type).toBe('InternalServerError');
    }
  });
});
```

## Performance Testing

### Load Testing

```javascript
// Example using k6 for load testing
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function() {
  // Test health endpoint
  let response = http.get('http://localhost:3000/health');
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });

  // Test API status endpoint
  response = http.get('http://localhost:3000/api/status');
  check(response, {
    'API status is 200': (r) => r.status === 200,
    'API status response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

### Stress Testing

```bash
#!/bin/bash

# Stress test with Apache Bench
echo "Stress testing health endpoint..."
ab -n 1000 -c 10 http://localhost:3000/health

echo "Stress testing API status endpoint..."
ab -n 1000 -c 10 http://localhost:3000/api/status

echo "Stress testing test execution endpoint..."
ab -n 100 -c 5 -p test-config.json -T application/json http://localhost:3000/api/v1/tests/execute
```

### Response Time Testing

```javascript
describe('Performance Tests', () => {
  test('health endpoint should respond within 100ms', async () => {
    const start = Date.now();
    const response = await fetch('/health');
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(100);
  });

  test('API status should respond within 200ms', async () => {
    const start = Date.now();
    const response = await fetch('/api/status');
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  test('test execution should respond within 1s', async () => {
    const start = Date.now();
    const response = await executeTest(validTestConfig);
    const duration = Date.now() - start;
    
    expect(response.status).toBe(202);
    expect(duration).toBeLessThan(1000);
  });
});
```

## Security Testing

### Authentication Testing

```javascript
describe('Authentication Tests', () => {
  test('should require API key in production', async () => {
    // This test would run against production environment
    const response = await fetch('https://api.test-automation-harness.com/health');
    expect(response.status).toBe(401);
  });

  test('should accept valid API key', async () => {
    const response = await fetch('/health', {
      headers: { 'X-API-Key': 'valid-api-key' }
    });
    expect(response.status).toBe(200);
  });

  test('should reject invalid API key', async () => {
    const response = await fetch('/health', {
      headers: { 'X-API-Key': 'invalid-api-key' }
    });
    expect(response.status).toBe(401);
  });
});
```

### Input Validation Testing

```javascript
describe('Security Tests', () => {
  test('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE tests; --";
    const response = await executeTest({
      name: maliciousInput,
      engine: 'playwright',
      config: { url: 'https://example.com' }
    });
    
    // Should either reject the input or sanitize it
    expect(response.status).toBe(400);
  });

  test('should prevent XSS attacks', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const response = await executeTest({
      name: xssPayload,
      engine: 'playwright',
      config: { url: 'https://example.com' }
    });
    
    // Should sanitize the input
    expect(response.status).toBe(202);
    expect(response.data.name).not.toContain('<script>');
  });

  test('should handle large payloads', async () => {
    const largeConfig = {
      name: 'Large Config Test',
      engine: 'playwright',
      config: {
        url: 'https://example.com',
        data: 'x'.repeat(1000000) // 1MB of data
      }
    };
    
    const response = await executeTest(largeConfig);
    // Should either accept or reject with appropriate error
    expect([202, 413, 400]).toContain(response.status);
  });
});
```

## Integration Testing

### End-to-End Workflow Testing

```javascript
describe('E2E Workflow Tests', () => {
  test('complete test execution workflow', async () => {
    // 1. Execute test
    const executeResponse = await executeTest({
      name: 'E2E Test',
      engine: 'playwright',
      config: { url: 'https://example.com' }
    });
    
    expect(executeResponse.status).toBe(202);
    const testId = executeResponse.data.testId;
    
    // 2. Monitor test execution
    let attempts = 0;
    let status = 'running';
    while (status === 'running' && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await getTestStatus(testId);
      status = statusResponse.data.status;
      attempts++;
    }
    
    expect(['passed', 'failed', 'cancelled']).toContain(status);
    
    // 3. Get final result
    const resultResponse = await getTestResult(testId);
    expect(resultResponse.data.testId).toBe(testId);
    expect(resultResponse.data.status).toBe(status);
    
    // 4. Verify result appears in results list
    const resultsResponse = await getTestResults({ testId });
    expect(resultsResponse.data.results.length).toBeGreaterThan(0);
  });

  test('test cancellation workflow', async () => {
    // 1. Execute long-running test
    const executeResponse = await executeTest({
      name: 'Long Running Test',
      engine: 'playwright',
      config: { url: 'https://example.com', timeout: 60000 }
    });
    
    const testId = executeResponse.data.testId;
    
    // 2. Wait a bit for test to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Cancel the test
    const cancelResponse = await cancelTest(testId);
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.data.status).toBe('cancelled');
    
    // 4. Verify cancellation
    const statusResponse = await getTestStatus(testId);
    expect(statusResponse.data.status).toBe('cancelled');
  });
});
```

### Cross-Service Integration Testing

```javascript
describe('Cross-Service Integration', () => {
  test('should integrate with external test engines', async () => {
    const engines = await getEngines();
    expect(engines.data.length).toBeGreaterThan(0);
    
    // Test each available engine
    for (const engine of engines.data) {
      if (engine.enabled) {
        const response = await executeTest({
          name: `Engine Test - ${engine.name}`,
          engine: engine.name,
          config: { url: 'https://example.com' }
        });
        
        expect(response.status).toBe(202);
      }
    }
  });

  test('should handle engine failures gracefully', async () => {
    const response = await executeTest({
      name: 'Engine Failure Test',
      engine: 'non-existent-engine',
      config: { url: 'https://example.com' }
    });
    
    expect(response.status).toBe(400);
  });
});
```

## Monitoring and Observability

### Health Check Monitoring

```javascript
// Health check monitoring script
async function monitorHealth() {
  const endpoints = [
    '/health',
    '/api/status',
    '/api/v1/engines',
    '/api/v1/healing/strategies'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`http://localhost:3000${endpoint}`);
      const duration = Date.now() - start;
      
      console.log(`${endpoint}: ${response.status} (${duration}ms)`);
      
      if (response.status !== 200) {
        console.error(`Health check failed for ${endpoint}`);
      }
    } catch (error) {
      console.error(`Health check error for ${endpoint}:`, error.message);
    }
  }
}

// Run health checks every 30 seconds
setInterval(monitorHealth, 30000);
```

### Metrics Collection

```javascript
// Metrics collection for API testing
class APIMetrics {
  constructor() {
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      responseTimes: [],
      errorTypes: {}
    };
  }

  recordRequest(response, duration) {
    this.metrics.requestCount++;
    this.metrics.responseTimes.push(duration);
    
    if (response.status >= 200 && response.status < 300) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
      const errorType = response.status >= 500 ? 'server' : 'client';
      this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
    }
  }

  getStats() {
    const avgResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
    const successRate = this.metrics.successCount / this.metrics.requestCount;
    
    return {
      totalRequests: this.metrics.requestCount,
      successRate: successRate,
      averageResponseTime: avgResponseTime,
      errorBreakdown: this.metrics.errorTypes
    };
  }
}

// Usage in tests
const metrics = new APIMetrics();

// Wrap API calls to collect metrics
async function trackedRequest(url, options) {
  const start = Date.now();
  const response = await fetch(url, options);
  const duration = Date.now() - start;
  
  metrics.recordRequest(response, duration);
  return response;
}
```

## Best Practices

### 1. Test Organization

```javascript
// Organize tests by feature and scenario
describe('Test Execution API', () => {
  describe('Happy Path', () => {
    test('should execute test successfully', () => {});
    test('should return test status', () => {});
    test('should return test results', () => {});
  });

  describe('Error Handling', () => {
    test('should handle validation errors', () => {});
    test('should handle server errors', () => {});
    test('should handle network errors', () => {});
  });

  describe('Edge Cases', () => {
    test('should handle concurrent requests', () => {});
    test('should handle large payloads', () => {});
    test('should handle special characters', () => {});
  });
});
```

### 2. Test Data Management

```javascript
// Use test data factories
class TestDataFactory {
  static createValidTestConfig(overrides = {}) {
    return {
      name: 'Test',
      engine: 'playwright',
      config: { url: 'https://example.com' },
      ...overrides
    };
  }

  static createInvalidTestConfig() {
    return {
      description: 'Missing required fields'
    };
  }
}

// Use in tests
test('should execute valid test', async () => {
  const config = TestDataFactory.createValidTestConfig();
  const response = await executeTest(config);
  expect(response.status).toBe(202);
});
```

### 3. Error Assertion Helpers

```javascript
// Create reusable error assertion helpers
function expectValidationError(response, expectedField) {
  expect(response.status).toBe(400);
  expect(response.error.type).toBe('ValidationError');
  if (expectedField) {
    expect(response.error.field).toBe(expectedField);
  }
}

function expectNotFoundError(response) {
  expect(response.status).toBe(404);
  expect(response.error.type).toBe('NotFoundError');
}

// Use in tests
test('should return validation error for missing name', async () => {
  const response = await executeTest({ engine: 'playwright', config: {} });
  expectValidationError(response, 'name');
});
```

### 4. Test Environment Management

```javascript
// Environment-specific test configuration
const testConfig = {
  development: {
    baseUrl: 'http://localhost:3000',
    timeout: 5000
  },
  staging: {
    baseUrl: 'https://staging-api.test-automation-harness.com',
    timeout: 10000
  },
  production: {
    baseUrl: 'https://api.test-automation-harness.com',
    timeout: 15000
  }
};

const config = testConfig[process.env.NODE_ENV || 'development'];
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if server is running
   curl http://localhost:3000/health
   
   # Check server logs
   npm run dev
   ```

2. **Validation Errors**
   ```bash
   # Check request format
   curl -X POST http://localhost:3000/api/v1/tests/execute \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","engine":"playwright","config":{"url":"https://example.com"}}'
   ```

3. **Timeout Issues**
   ```javascript
   // Increase timeout for long-running tests
   const response = await fetch('/api/v1/tests/execute', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(testConfig),
     signal: AbortSignal.timeout(30000) // 30 second timeout
   });
   ```

### Debugging Tips

1. **Enable Request Logging**
   ```javascript
   // Log all requests and responses
   const originalFetch = window.fetch;
   window.fetch = async (...args) => {
     console.log('Request:', args);
     const response = await originalFetch(...args);
     console.log('Response:', response.status, await response.clone().text());
     return response;
   };
   ```

2. **Use Network Tab**
   - Open browser developer tools
   - Go to Network tab
   - Monitor API requests and responses
   - Check for errors and timing

3. **Check Server Logs**
   ```bash
   # View server logs
   tail -f logs/api.log
   
   # Check for specific errors
   grep "ERROR" logs/api.log
   ```

### Performance Debugging

```javascript
// Performance monitoring
async function measureAPIPerformance() {
  const endpoints = [
    '/health',
    '/api/status',
    '/api/v1/engines',
    '/api/v1/results'
  ];
  
  for (const endpoint of endpoints) {
    const times = [];
    
    // Measure 10 requests
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await fetch(`http://localhost:3000${endpoint}`);
      const end = performance.now();
      times.push(end - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`${endpoint}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
  }
}
```

This comprehensive testing guide provides everything needed to effectively test and integrate with the Self-Healing Test Automation Harness API. Follow these practices to ensure reliable and robust API integration.
