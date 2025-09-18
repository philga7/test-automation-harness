# Self-Healing Test Automation Harness - REST API Documentation

## Overview

The Self-Healing Test Automation Harness provides a comprehensive REST API for managing test execution, monitoring results, and configuring self-healing capabilities. The API follows RESTful principles and provides consistent error handling and response formatting.

## Base URL

```
http://localhost:3000/api/v1
```

## Dashboard Access

The web dashboard is available at:
```
http://localhost:3000/
```

Static assets (CSS, JS, images) are served from:
```
http://localhost:3000/static/
```

## Authentication

Currently, the API operates without authentication for development purposes. In production, API key authentication will be implemented.

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

## Endpoints

### Health Check

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
    "timeout": 30000
  },
  "options": {
    "timeout": 30000,
    "retries": 2,
    "parallel": false,
    "healing": true
  }
}
```

**App Analysis Request Body:**
```json
{
  "name": "App Analysis Test",
  "description": "Analyze web application structure and generate locator strategies",
  "engine": "app-analysis",
  "config": {
    "url": "https://example.com",
    "timeout": 30000,
    "analysisDepth": "comprehensive",
    "includeScreenshots": true,
    "includeAccessibility": true,
    "includePerformance": true,
    "includeSecurity": false,
    "includeCodeGeneration": true
  },
  "options": {
    "timeout": 30000,
    "retries": 1,
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

**Query Parameters:**
- `includeArtifacts` (boolean): Include test artifacts (default: false)
- `includeHealingAttempts` (boolean): Include healing attempts (default: true)
- `includeMetrics` (boolean): Include performance metrics (default: true)

#### POST /api/v1/tests/:id/cancel
Cancel a running test.

#### GET /api/v1/tests/queue
Get test execution queue status.

#### GET /api/v1/tests/engines
Get available test engines.

#### POST /api/v1/tests/batch
Execute multiple tests in batch.

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

#### GET /api/v1/results/:id
Get specific test result by ID.

#### GET /api/v1/results/summary
Get test results summary and statistics.

#### POST /api/v1/results/reports
Generate a test report.

**Request Body:**
```json
{
  "name": "Weekly Test Report",
  "description": "Weekly test execution summary",
  "format": "html",
  "filters": {
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-01-07T23:59:59.999Z"
  },
  "options": {
    "includeArtifacts": false,
    "includeHealingAttempts": true,
    "includeMetrics": true,
    "includeCharts": true
  }
}
```

#### GET /api/v1/results/reports/:id
Get report status and details.

#### GET /api/v1/results/reports/:id/download
Download generated report.

#### GET /api/v1/results/artifacts/:testId
Get test artifacts.

### Healing Management

#### GET /api/v1/healing/strategies
Get available healing strategies.

#### GET /api/v1/healing/strategies/:id
Get specific healing strategy details.

#### PUT /api/v1/healing/strategies/:id
Update healing strategy configuration.

#### GET /api/v1/healing/attempts
Get healing attempts with filtering and pagination.

#### GET /api/v1/healing/attempts/:id
Get specific healing attempt details.

#### GET /api/v1/healing/statistics
Get healing statistics and metrics.

#### POST /api/v1/healing/attempts
Manually trigger a healing attempt.

### Engine Management

#### GET /api/v1/engines
Get all available test engines.

#### GET /api/v1/engines/:id
Get specific test engine details.

#### GET /api/v1/engines/:id/health
Get test engine health status.

#### POST /api/v1/engines/:id/initialize
Initialize a test engine.

#### POST /api/v1/engines/:id/cleanup
Clean up test engine resources.

#### PUT /api/v1/engines/:id/config
Update engine configuration.

#### GET /api/v1/engines/:id/metrics
Get engine performance metrics.

#### GET /api/v1/engines/types
Get available test engine types.

### App Analysis

#### POST /api/v1/analysis/scan
Start a new app analysis scan.

**Request Body:**
```json
{
  "url": "https://example.com",
  "analysisType": "comprehensive",
  "options": {
    "includeScreenshots": true,
    "includeAccessibility": true,
    "includePerformance": true,
    "includeSecurity": true,
    "includeCodeGeneration": true,
    "timeout": 30000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analysis scan started successfully",
  "data": {
    "analysisId": "analysis_https_example_com_1641234567890",
    "status": "running",
    "url": "https://example.com",
    "analysisType": "comprehensive"
  },
  "statusCode": 202
}
```

#### GET /api/v1/analysis/:id/status
Get analysis scan status.

**Path Parameters:**
- `id` (string, required): Analysis ID

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_https_example_com_1641234567890",
    "status": "running",
    "progress": 45,
    "currentStep": "analyzing_ui_elements",
    "startTime": "2025-01-06T15:30:00.000Z",
    "endTime": null,
    "duration": 15000,
    "errors": 0,
    "artifactsCount": 2
  }
}
```

#### GET /api/v1/analysis/:id/results
Get complete analysis results.

**Path Parameters:**
- `id` (string, required): Analysis ID

**Query Parameters:**
- `includeArtifacts` (boolean): Include analysis artifacts (default: false)
- `includeMetrics` (boolean): Include performance metrics (default: false)
- `includeErrors` (boolean): Include error details (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_https_example_com_1641234567890",
    "status": "passed",
    "results": {
      "url": "https://example.com",
      "analysisType": "comprehensive",
      "duration": 30000,
      "elements": {
        "total": 150,
        "forms": 5,
        "buttons": 12,
        "links": 25,
        "inputs": 8
      },
      "navigation": {
        "menus": 3,
        "breadcrumbs": 1,
        "pagination": 2
      },
      "accessibility": {
        "score": 85,
        "issues": 3,
        "warnings": 7
      },
      "performance": {
        "loadTime": 2.5,
        "domContentLoaded": 1.8,
        "firstPaint": 1.2
      }
    },
    "artifacts": [
      {
        "type": "screenshot",
        "path": "/artifacts/screenshots/analysis_1641234567890.png",
        "size": 245760
      },
      {
        "type": "report",
        "path": "/artifacts/reports/analysis_1641234567890.json",
        "size": 15360
      }
    ]
  }
}
```

#### POST /api/v1/analysis/:id/generate-tests
Generate test scenarios from analysis results.

**Path Parameters:**
- `id` (string, required): Analysis ID

**Request Body:**
```json
{
  "testTypes": ["e2e", "accessibility"],
  "options": {
    "framework": "playwright",
    "includeDataDriven": true,
    "includeNegativeTests": true,
    "maxScenarios": 10,
    "priority": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test scenarios generated successfully",
  "data": {
    "generationId": "generation_analysis_1641234567890_1641234570000",
    "status": "completed",
    "count": 8,
    "scenarios": [
      {
        "id": "scenario_analysis_1641234567890_0",
        "name": "Generated E2E Test Scenario 1 for https://example.com",
        "type": "e2e",
        "description": "AI-generated scenario based on analysis of https://example.com",
        "steps": [
          { "action": "navigate", "target": "https://example.com" },
          { "action": "click", "target": "button.submit" },
          { "action": "assertTitle", "expected": "Example Domain" }
        ],
        "framework": "playwright",
        "priority": "high"
      }
    ]
  },
  "statusCode": 201
}
```

#### GET /api/v1/analysis/generated-tests
Get list of generated test scenarios.

**Query Parameters:**
- `analysisId` (string): Filter by analysis ID
- `testType` (string): Filter by test type (e2e, accessibility, performance, security)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `sort` (string): Sort order (asc/desc, default: desc)
- `sortBy` (string): Sort field (default: createdAt)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "generation_analysis_1641234567890_1641234570000",
        "analysisId": "analysis_https_example_com_1641234567890",
        "status": "completed",
        "startTime": "2025-01-06T15:30:30.000Z",
        "endTime": "2025-01-06T15:30:35.000Z",
        "testTypes": ["e2e", "accessibility"],
        "options": {
          "framework": "playwright",
          "maxScenarios": 10,
          "priority": "high"
        },
        "count": 8
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Examples

### Execute a Test
```bash
curl -X POST http://localhost:3000/api/v1/tests/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Login Test",
    "engine": "playwright",
    "config": {
      "url": "https://example.com"
    }
  }'
```

### Get Test Results
```bash
curl "http://localhost:3000/api/v1/results?status=passed&limit=5"
```

### Get Healing Statistics
```bash
curl "http://localhost:3000/api/v1/healing/statistics?startDate=2025-01-01&endDate=2025-01-07"
```

## SDK and Client Libraries

Client libraries for popular programming languages will be available in future releases:
- JavaScript/TypeScript
- Python
- Java
- C#

## Support

For API support and questions:
- Documentation: [GitHub Repository](https://github.com/your-org/test-automation-harness)
- Issues: [GitHub Issues](https://github.com/your-org/test-automation-harness/issues)
- Discussions: [GitHub Discussions](https://github.com/your-org/test-automation-harness/discussions)
