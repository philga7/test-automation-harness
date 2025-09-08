# Self-Healing Test Automation Harness - Complete API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL and Versioning](#base-url-and-versioning)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Endpoints](#endpoints)
   - [Health and Status](#health-and-status)
   - [Test Execution](#test-execution)
   - [Test Results](#test-results)
   - [Healing Management](#healing-management)
   - [Engine Management](#engine-management)
8. [Data Models](#data-models)
9. [Examples](#examples)
10. [SDK and Client Libraries](#sdk-and-client-libraries)

## Overview

The Self-Healing Test Automation Harness provides a comprehensive REST API for managing test execution, monitoring results, and configuring self-healing capabilities. The API follows RESTful principles and provides consistent error handling and response formatting.

### Key Features

- **Test Orchestration**: Execute and manage multiple types of tests (unit, e2e, performance, security)
- **Self-Healing**: AI-powered test recovery and adaptation
- **Unified Reporting**: Comprehensive test results and analytics
- **Plugin Architecture**: Extensible test engine support
- **Real-time Monitoring**: Live test execution status and progress tracking

## Authentication

Currently, the API operates without authentication for development purposes. In production, API key authentication will be implemented.

### Future Authentication (Planned)

```http
X-API-Key: your-api-key-here
```

## Base URL and Versioning

### Base URL
```
http://localhost:3000
```

### API Versioning
The API uses URL-based versioning:
```
/api/v1/
```

### Example URLs
```
http://localhost:3000/health
http://localhost:3000/api/status
http://localhost:3000/api/v1/tests/execute
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2025-01-06T15:30:00.000Z",
  "statusCode": 200
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Request validation failed",
    "statusCode": 400,
    "requestId": "req_abc123",
    "details": "Field 'name' is required"
  },
  "timestamp": "2025-01-06T15:30:00.000Z"
}
```

## Error Handling

### Error Types

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| `ValidationError` | 400 | Request validation failed |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Resource conflict |
| `UnauthorizedError` | 401 | Authentication required |
| `ForbiddenError` | 403 | Access denied |
| `RateLimitError` | 429 | Rate limit exceeded |
| `InternalServerError` | 500 | Internal server error |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "type": "ErrorType",
    "message": "Human-readable error message",
    "statusCode": 400,
    "requestId": "req_abc123",
    "details": "Additional error details (optional)",
    "field": "fieldName (for validation errors)",
    "value": "invalidValue (for validation errors)"
  },
  "timestamp": "2025-01-06T15:30:00.000Z"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "type": "RateLimitError",
    "message": "Rate limit exceeded. Please try again later.",
    "statusCode": 429,
    "retryAfter": 900
  },
  "timestamp": "2025-01-06T15:30:00.000Z"
}
```

## Endpoints

### Health and Status

#### GET /health
Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-06T15:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "development"
}
```

#### GET /api/status
Get API status information.

**Response:**
```json
{
  "message": "Self-Healing Test Automation Harness API",
  "status": "running",
  "version": "1.0.0",
  "features": {
    "testOrchestration": "available",
    "selfHealing": "available",
    "unifiedReporting": "available",
    "pluginArchitecture": "available"
  },
  "endpoints": {
    "tests": "/api/v1/tests",
    "results": "/api/v1/results",
    "healing": "/api/v1/healing",
    "engines": "/api/v1/engines",
    "health": "/health",
    "docs": "/api/docs"
  }
}
```

### Test Execution

#### POST /api/v1/tests/execute
Execute a new test.

**Request Body:**
```json
{
  "name": "Login Test",
  "description": "Test user login functionality",
  "engine": "playwright",
  "config": {
    "url": "https://example.com",
    "timeout": 30000,
    "browser": "chromium",
    "headless": true
  },
  "options": {
    "timeout": 30000,
    "retries": 2,
    "parallel": false,
    "healing": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test execution started successfully",
  "data": {
    "testId": "test_Login_Test_abc123",
    "status": "accepted",
    "message": "Test execution started",
    "estimatedDuration": 30000
  },
  "statusCode": 202
}
```

#### GET /api/v1/tests/:id/status
Get test execution status.

**Path Parameters:**
- `id` (string, required): Test ID

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": "test_Login_Test_abc123",
    "status": "running",
    "startTime": "2025-01-06T15:30:00.000Z",
    "endTime": null,
    "duration": 0,
    "progress": 45,
    "healingAttempts": 0,
    "errors": 0
  }
}
```

#### GET /api/v1/tests/:id/result
Get complete test result.

**Path Parameters:**
- `id` (string, required): Test ID

**Query Parameters:**
- `includeArtifacts` (boolean): Include test artifacts (default: false)
- `includeHealingAttempts` (boolean): Include healing attempts (default: true)
- `includeMetrics` (boolean): Include performance metrics (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": "test_Login_Test_abc123",
    "status": "passed",
    "startTime": "2025-01-06T15:30:00.000Z",
    "endTime": "2025-01-06T15:30:30.000Z",
    "duration": 30000,
    "engine": "playwright",
    "config": { ... },
    "results": {
      "passed": 5,
      "failed": 0,
      "skipped": 0,
      "total": 5
    },
    "artifacts": { ... },
    "healingAttempts": [ ... ],
    "metrics": { ... }
  }
}
```

#### POST /api/v1/tests/:id/cancel
Cancel a running test.

**Path Parameters:**
- `id` (string, required): Test ID

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": "test_Login_Test_abc123",
    "status": "cancelled",
    "message": "Test execution cancelled"
  }
}
```

#### GET /api/v1/tests/queue
Get test execution queue status.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `sort` (string): Sort order (asc/desc, default: desc)
- `sortBy` (string): Sort field (default: createdAt)

**Response:**
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "testId": "test_123",
        "name": "Test Name",
        "engine": "playwright",
        "status": "queued",
        "createdAt": "2025-01-06T15:30:00.000Z"
      }
    ],
    "running": 2,
    "completed": 15,
    "failed": 1,
    "total": 18,
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 18,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/v1/tests/engines
Get available test engines.

**Query Parameters:**
- `testType` (string): Filter by test type (unit, e2e, performance, security)
- `status` (string): Filter by status (enabled, disabled)
- `supportsHealing` (boolean): Filter by healing support

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "playwright",
      "version": "1.40.0",
      "type": "e2e",
      "enabled": true,
      "supportsHealing": true,
      "capabilities": ["web", "mobile", "api"],
      "config": { ... }
    }
  ]
}
```

### Test Results

#### GET /api/v1/results
Get test results with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status (passed, failed, skipped, running)
- `engine` (string): Filter by engine name
- `testName` (string): Filter by test name
- `startDate` (string): Filter by start date (ISO format)
- `endDate` (string): Filter by end date (ISO format)
- `sort` (string): Sort order (asc/desc, default: desc)
- `sortBy` (string): Sort field (default: startTime)
- `includeArtifacts` (boolean): Include artifacts (default: false)
- `includeHealingAttempts` (boolean): Include healing attempts (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "testId": "test_123",
        "name": "Login Test",
        "status": "passed",
        "engine": "playwright",
        "startTime": "2025-01-06T15:30:00.000Z",
        "endTime": "2025-01-06T15:30:30.000Z",
        "duration": 30000,
        "results": {
          "passed": 5,
          "failed": 0,
          "skipped": 0,
          "total": 5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/v1/results/:id
Get specific test result by ID.

**Path Parameters:**
- `id` (string, required): Test result ID

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": "test_123",
    "name": "Login Test",
    "status": "passed",
    "engine": "playwright",
    "startTime": "2025-01-06T15:30:00.000Z",
    "endTime": "2025-01-06T15:30:30.000Z",
    "duration": 30000,
    "config": { ... },
    "results": { ... },
    "artifacts": { ... },
    "healingAttempts": [ ... ],
    "metrics": { ... }
  }
}
```

#### GET /api/v1/results/summary
Get test results summary and statistics.

**Query Parameters:**
- `startDate` (string): Filter by start date (ISO format)
- `endDate` (string): Filter by end date (ISO format)
- `engine` (string): Filter by engine name
- `groupBy` (string): Group results by field (engine, status, date)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "passed": 85,
    "failed": 10,
    "skipped": 5,
    "running": 0,
    "successRate": 0.85,
    "avgDuration": 25000,
    "totalDuration": 2500000,
    "byEngine": {
      "playwright": { "total": 50, "passed": 45, "failed": 5 },
      "jest": { "total": 30, "passed": 25, "failed": 5 },
      "k6": { "total": 20, "passed": 15, "failed": 0 }
    },
    "byStatus": {
      "passed": 85,
      "failed": 10,
      "skipped": 5
    }
  }
}
```

### Healing Management

#### GET /api/v1/healing/strategies
Get available healing strategies.

**Query Parameters:**
- `failureType` (string): Filter by failure type
- `enabled` (boolean): Filter by enabled status
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "css-fallback",
      "name": "CSS Fallback Strategy",
      "description": "Falls back to alternative CSS selectors",
      "failureTypes": ["element_not_found", "timeout"],
      "enabled": true,
      "confidence": 0.8,
      "config": { ... }
    }
  ]
}
```

#### GET /api/v1/healing/strategies/:id
Get specific healing strategy details.

**Path Parameters:**
- `id` (string, required): Strategy ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "css-fallback",
    "name": "CSS Fallback Strategy",
    "description": "Falls back to alternative CSS selectors",
    "failureTypes": ["element_not_found", "timeout"],
    "enabled": true,
    "confidence": 0.8,
    "config": { ... },
    "statistics": {
      "totalAttempts": 100,
      "successfulAttempts": 80,
      "successRate": 0.8,
      "avgConfidence": 0.75
    }
  }
}
```

#### GET /api/v1/healing/attempts
Get healing attempts with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `testId` (string): Filter by test ID
- `strategy` (string): Filter by strategy name
- `success` (boolean): Filter by success status
- `minConfidence` (number): Minimum confidence threshold
- `startDate` (string): Filter by start date (ISO format)
- `endDate` (string): Filter by end date (ISO format)
- `sort` (string): Sort order (asc/desc, default: desc)
- `sortBy` (string): Sort field (default: timestamp)

**Response:**
```json
{
  "success": true,
  "data": {
    "attempts": [
      {
        "id": "attempt_123",
        "testId": "test_123",
        "strategy": "css-fallback",
        "failureType": "element_not_found",
        "success": true,
        "confidence": 0.8,
        "duration": 1500,
        "timestamp": "2025-01-06T15:30:00.000Z",
        "changes": {
          "selector": "button.submit",
          "newSelector": "input[type='submit']"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/v1/healing/statistics
Get healing statistics and metrics.

**Query Parameters:**
- `startDate` (string): Filter by start date (ISO format)
- `endDate` (string): Filter by end date (ISO format)
- `groupBy` (string): Group by field (strategy, failureType, testId)
- `minConfidence` (number): Minimum confidence threshold

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAttempts": 1000,
    "successfulAttempts": 800,
    "failedAttempts": 200,
    "successRate": 0.8,
    "avgConfidence": 0.75,
    "avgDuration": 2000,
    "strategies": [
      {
        "name": "css-fallback",
        "attempts": 500,
        "successful": 400,
        "successRate": 0.8,
        "avgConfidence": 0.75
      }
    ],
    "byFailureType": {
      "element_not_found": { "attempts": 600, "successful": 480 },
      "timeout": { "attempts": 400, "successful": 320 }
    }
  }
}
```

### Engine Management

#### GET /api/v1/engines
Get all available test engines.

**Query Parameters:**
- `testType` (string): Filter by test type (unit, e2e, performance, security)
- `status` (string): Filter by status (enabled, disabled)
- `supportsHealing` (boolean): Filter by healing support
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `sort` (string): Sort order (asc/desc, default: desc)
- `sortBy` (string): Sort field (default: createdAt)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "playwright-1.40.0",
      "name": "playwright",
      "version": "1.40.0",
      "type": "e2e",
      "enabled": true,
      "supportsHealing": true,
      "config": {
        "browser": "chromium",
        "headless": true,
        "timeout": 30000
      },
      "capabilities": ["web", "mobile", "api"],
      "createdAt": "2025-01-06T15:30:00.000Z",
      "updatedAt": "2025-01-06T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### GET /api/v1/engines/:id
Get specific test engine details.

**Path Parameters:**
- `id` (string, required): Engine ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "playwright-1.40.0",
    "name": "playwright",
    "version": "1.40.0",
    "type": "e2e",
    "enabled": true,
    "supportsHealing": true,
    "config": { ... },
    "capabilities": ["web", "mobile", "api"],
    "statistics": {
      "totalTests": 100,
      "successfulTests": 85,
      "failedTests": 15,
      "successRate": 0.85,
      "avgDuration": 25000
    },
    "createdAt": "2025-01-06T15:30:00.000Z",
    "updatedAt": "2025-01-06T15:30:00.000Z"
  }
}
```

#### GET /api/v1/engines/:id/health
Get test engine health status.

**Path Parameters:**
- `id` (string, required): Engine ID

**Response:**
```json
{
  "success": true,
  "data": {
    "engineId": "playwright-1.40.0",
    "status": "healthy",
    "lastCheck": "2025-01-06T15:30:00.000Z",
    "uptime": 3600,
    "version": "1.40.0",
    "capabilities": ["web", "mobile", "api"],
    "resources": {
      "memory": "512MB",
      "cpu": "2 cores"
    }
  }
}
```

## Data Models

### TestConfig
```typescript
interface TestConfig {
  name: string;
  description?: string;
  engine: string;
  config: {
    url?: string;
    timeout?: number;
    browser?: string;
    headless?: boolean;
    [key: string]: any;
  };
  options?: {
    timeout?: number;
    retries?: number;
    parallel?: boolean;
    healing?: boolean;
  };
}
```

### TestResult
```typescript
interface TestResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running' | 'cancelled';
  engine: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  config: any;
  results: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  artifacts?: any;
  healingAttempts?: HealingAttempt[];
  metrics?: any;
}
```

### HealingAttempt
```typescript
interface HealingAttempt {
  id: string;
  testId: string;
  strategy: string;
  failureType: string;
  success: boolean;
  confidence: number;
  duration: number;
  timestamp: string;
  changes: {
    [key: string]: any;
  };
}
```

### Engine
```typescript
interface Engine {
  id: string;
  name: string;
  version: string;
  type: 'unit' | 'e2e' | 'performance' | 'security';
  enabled: boolean;
  supportsHealing: boolean;
  config: any;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Examples

### Execute a Test
```bash
curl -X POST http://localhost:3000/api/v1/tests/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Login Test",
    "engine": "playwright",
    "config": {
      "url": "https://example.com",
      "browser": "chromium",
      "headless": true
    },
    "options": {
      "timeout": 30000,
      "healing": true
    }
  }'
```

### Get Test Results
```bash
curl "http://localhost:3000/api/v1/results?status=passed&limit=5&sort=desc&sortBy=startTime"
```

### Get Healing Statistics
```bash
curl "http://localhost:3000/api/v1/healing/statistics?startDate=2025-01-01&endDate=2025-01-07&groupBy=strategy"
```

### Check Engine Health
```bash
curl "http://localhost:3000/api/v1/engines/playwright-1.40.0/health"
```

### JavaScript Example
```javascript
const response = await fetch('http://localhost:3000/api/v1/tests/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Login Test',
    engine: 'playwright',
    config: {
      url: 'https://example.com',
      browser: 'chromium',
      headless: true
    },
    options: {
      timeout: 30000,
      healing: true
    }
  })
});

const result = await response.json();
console.log('Test started:', result.data.testId);
```

### Python Example
```python
import requests

response = requests.post('http://localhost:3000/api/v1/tests/execute', json={
    'name': 'Login Test',
    'engine': 'playwright',
    'config': {
        'url': 'https://example.com',
        'browser': 'chromium',
        'headless': True
    },
    'options': {
        'timeout': 30000,
        'healing': True
    }
})

result = response.json()
print(f"Test started: {result['data']['testId']}")
```

## SDK and Client Libraries

Client libraries for popular programming languages will be available in future releases:

- **JavaScript/TypeScript**: `npm install @test-automation-harness/client`
- **Python**: `pip install test-automation-harness`
- **Java**: Available via Maven Central
- **C#**: Available via NuGet

## Support

For API support and questions:

- **Documentation**: [GitHub Repository](https://github.com/your-org/test-automation-harness)
- **Issues**: [GitHub Issues](https://github.com/your-org/test-automation-harness/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/test-automation-harness/discussions)
- **Email**: support@test-automation-harness.com

## Changelog

### v1.0.0 (2025-01-06)
- Initial API release
- Test execution endpoints
- Results management
- Healing management
- Engine management
- Comprehensive error handling
- Rate limiting
- Request validation
