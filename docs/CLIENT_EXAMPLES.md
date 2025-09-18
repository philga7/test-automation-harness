# Client Code Examples

This document provides code examples for integrating with the Self-Healing Test Automation Harness API in various programming languages.

## Table of Contents

1. [JavaScript/TypeScript](#javascripttypescript)
2. [Python](#python)
3. [cURL](#curl)
4. [Java](#java)
5. [C#](#c)
6. [Go](#go)
7. [App Analysis API Examples](#app-analysis-api-examples)

## JavaScript/TypeScript

### Basic Setup

```typescript
class TestAutomationClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = 'http://localhost:3000', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  // Execute a test
  async executeTest(config: TestConfig): Promise<TestExecutionResult> {
    return this.request<TestExecutionResult>('/api/v1/tests/execute', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Get test status
  async getTestStatus(testId: string): Promise<TestStatus> {
    return this.request<TestStatus>(`/api/v1/tests/${testId}/status`);
  }

  // Get test result
  async getTestResult(testId: string, includeArtifacts = false): Promise<TestResult> {
    const params = new URLSearchParams();
    if (includeArtifacts) params.append('includeArtifacts', 'true');
    
    return this.request<TestResult>(`/api/v1/tests/${testId}/result?${params}`);
  }

  // Get test results with filtering
  async getTestResults(filters: TestResultFilters = {}): Promise<TestResultsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    
    return this.request<TestResultsResponse>(`/api/v1/results?${params}`);
  }

  // Get healing statistics
  async getHealingStatistics(filters: HealingStatsFilters = {}): Promise<HealingStatistics> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    
    return this.request<HealingStatistics>(`/api/v1/healing/statistics?${params}`);
  }
}

// Type definitions
interface TestConfig {
  name: string;
  description?: string;
  engine: string;
  config: Record<string, any>;
  options?: {
    timeout?: number;
    retries?: number;
    parallel?: boolean;
    healing?: boolean;
  };
}

interface TestExecutionResult {
  success: boolean;
  data: {
    testId: string;
    status: string;
    message: string;
    estimatedDuration: number;
  };
}

interface TestStatus {
  success: boolean;
  data: {
    testId: string;
    status: string;
    startTime: string;
    endTime?: string;
    duration: number;
    progress: number;
    healingAttempts: number;
    errors: number;
  };
}

interface TestResult {
  success: boolean;
  data: {
    testId: string;
    name: string;
    status: string;
    engine: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    results: {
      passed: number;
      failed: number;
      skipped: number;
      total: number;
    };
  };
}

interface TestResultFilters {
  page?: number;
  limit?: number;
  status?: string;
  engine?: string;
  testName?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  sortBy?: string;
}

interface TestResultsResponse {
  success: boolean;
  data: {
    results: TestResult['data'][];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

interface HealingStatsFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
  minConfidence?: number;
}

interface HealingStatistics {
  success: boolean;
  data: {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    successRate: number;
    avgConfidence: number;
    avgDuration: number;
  };
}
```

### Usage Examples

```typescript
// Initialize client
const client = new TestAutomationClient('http://localhost:3000');

// Execute a test
async function runLoginTest() {
  try {
    const result = await client.executeTest({
      name: 'Login Test',
      description: 'Test user login functionality',
      engine: 'playwright',
      config: {
        url: 'https://example.com',
        browser: 'chromium',
        headless: true,
      },
      options: {
        timeout: 30000,
        healing: true,
      },
    });

    console.log('Test started:', result.data.testId);
    return result.data.testId;
  } catch (error) {
    console.error('Failed to start test:', error);
    throw error;
  }
}

// Monitor test execution
async function monitorTest(testId: string) {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await client.getTestStatus(testId);
      
      if (status.data.status === 'passed' || status.data.status === 'failed') {
        console.log(`Test completed with status: ${status.data.status}`);
        return await client.getTestResult(testId, true);
      }
      
      console.log(`Test progress: ${status.data.progress}%`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
    } catch (error) {
      console.error('Error monitoring test:', error);
      throw error;
    }
  }
  
  throw new Error('Test monitoring timeout');
}

// Get test results with filtering
async function getRecentTestResults() {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

  return client.getTestResults({
    startDate,
    endDate,
    status: 'passed',
    limit: 10,
    sort: 'desc',
    sortBy: 'startTime',
  });
}

// Get healing statistics
async function getHealingStats() {
  return client.getHealingStatistics({
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-01-07T23:59:59.999Z',
    groupBy: 'strategy',
  });
}
```

## Python

### Basic Setup

```python
import requests
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class TestConfig:
    name: str
    description: Optional[str] = None
    engine: str = ""
    config: Dict[str, Any] = None
    options: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.config is None:
            self.config = {}
        if self.options is None:
            self.options = {}

class TestAutomationClient:
    def __init__(self, base_url: str = "http://localhost:3000", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
        })
        
        if self.api_key:
            self.session.headers.update({
                'X-API-Key': self.api_key
            })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            try:
                error_data = response.json()
                raise Exception(f"API Error: {error_data.get('error', {}).get('message', str(e))}")
            except ValueError:
                raise Exception(f"API Error: {e}")

    def execute_test(self, config: TestConfig) -> Dict[str, Any]:
        """Execute a new test"""
        return self._request('POST', '/api/v1/tests/execute', json=config.__dict__)

    def get_test_status(self, test_id: str) -> Dict[str, Any]:
        """Get test execution status"""
        return self._request('GET', f'/api/v1/tests/{test_id}/status')

    def get_test_result(self, test_id: str, include_artifacts: bool = False) -> Dict[str, Any]:
        """Get complete test result"""
        params = {}
        if include_artifacts:
            params['includeArtifacts'] = 'true'
        
        return self._request('GET', f'/api/v1/tests/{test_id}/result', params=params)

    def get_test_results(self, **filters) -> Dict[str, Any]:
        """Get test results with filtering"""
        # Remove None values
        params = {k: v for k, v in filters.items() if v is not None}
        return self._request('GET', '/api/v1/results', params=params)

    def get_healing_statistics(self, **filters) -> Dict[str, Any]:
        """Get healing statistics"""
        params = {k: v for k, v in filters.items() if v is not None}
        return self._request('GET', '/api/v1/healing/statistics', params=params)

    def cancel_test(self, test_id: str) -> Dict[str, Any]:
        """Cancel a running test"""
        return self._request('POST', f'/api/v1/tests/{test_id}/cancel')

    def get_engines(self, **filters) -> Dict[str, Any]:
        """Get available test engines"""
        params = {k: v for k, v in filters.items() if v is not None}
        return self._request('GET', '/api/v1/engines', params=params)
```

### Usage Examples

```python
# Initialize client
client = TestAutomationClient('http://localhost:3000')

# Execute a test
def run_login_test():
    config = TestConfig(
        name="Login Test",
        description="Test user login functionality",
        engine="playwright",
        config={
            "url": "https://example.com",
            "browser": "chromium",
            "headless": True,
        },
        options={
            "timeout": 30000,
            "healing": True,
        }
    )
    
    try:
        result = client.execute_test(config)
        print(f"Test started: {result['data']['testId']}")
        return result['data']['testId']
    except Exception as e:
        print(f"Failed to start test: {e}")
        raise

# Monitor test execution
def monitor_test(test_id: str, max_wait_time: int = 300):
    """Monitor test execution until completion"""
    start_time = time.time()
    
    while time.time() - start_time < max_wait_time:
        try:
            status = client.get_test_status(test_id)
            test_status = status['data']['status']
            
            if test_status in ['passed', 'failed', 'cancelled']:
                print(f"Test completed with status: {test_status}")
                return client.get_test_result(test_id, include_artifacts=True)
            
            progress = status['data']['progress']
            print(f"Test progress: {progress}%")
            time.sleep(5)  # Wait 5 seconds
            
        except Exception as e:
            print(f"Error monitoring test: {e}")
            raise
    
    raise Exception("Test monitoring timeout")

# Get recent test results
def get_recent_test_results():
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    return client.get_test_results(
        startDate=start_date.isoformat(),
        endDate=end_date.isoformat(),
        status='passed',
        limit=10,
        sort='desc',
        sortBy='startTime'
    )

# Get healing statistics
def get_healing_stats():
    return client.get_healing_statistics(
        startDate='2025-01-01T00:00:00.000Z',
        endDate='2025-01-07T23:59:59.999Z',
        groupBy='strategy'
    )

# Example workflow
def main():
    try:
        # Start a test
        test_id = run_login_test()
        
        # Monitor the test
        result = monitor_test(test_id)
        print(f"Test result: {result['data']['status']}")
        
        # Get recent results
        recent_results = get_recent_test_results()
        print(f"Found {len(recent_results['data']['results'])} recent test results")
        
        # Get healing stats
        healing_stats = get_healing_stats()
        print(f"Healing success rate: {healing_stats['data']['successRate']:.2%}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
```

## cURL

### Basic Commands

```bash
# Set base URL
BASE_URL="http://localhost:3000"

# Execute a test
curl -X POST "$BASE_URL/api/v1/tests/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Login Test",
    "description": "Test user login functionality",
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

# Get test status
curl "$BASE_URL/api/v1/tests/test_Login_Test_abc123/status"

# Get test result
curl "$BASE_URL/api/v1/tests/test_Login_Test_abc123/result?includeArtifacts=true"

# Get test results with filtering
curl "$BASE_URL/api/v1/results?status=passed&limit=10&sort=desc&sortBy=startTime"

# Get healing statistics
curl "$BASE_URL/api/v1/healing/statistics?startDate=2025-01-01&endDate=2025-01-07&groupBy=strategy"

# Cancel a test
curl -X POST "$BASE_URL/api/v1/tests/test_Login_Test_abc123/cancel"

# Get available engines
curl "$BASE_URL/api/v1/engines?testType=e2e&supportsHealing=true"
```

### Advanced cURL Examples

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
API_KEY=""  # Set if authentication is enabled

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "$API_KEY" ]; then
        headers+=(-H "X-API-Key: $API_KEY")
    fi
    
    if [ -n "$data" ]; then
        curl -X "$method" "$BASE_URL$endpoint" "${headers[@]}" -d "$data"
    else
        curl -X "$method" "$BASE_URL$endpoint" "${headers[@]}"
    fi
}

# Execute a test and get the test ID
execute_test() {
    local test_config='{
        "name": "Login Test",
        "description": "Test user login functionality",
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
    
    local response=$(api_call "POST" "/api/v1/tests/execute" "$test_config")
    echo "$response" | jq -r '.data.testId'
}

# Monitor test execution
monitor_test() {
    local test_id=$1
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local status_response=$(api_call "GET" "/api/v1/tests/$test_id/status")
        local test_status=$(echo "$status_response" | jq -r '.data.status')
        local progress=$(echo "$status_response" | jq -r '.data.progress')
        
        echo "Test progress: $progress%"
        
        if [ "$test_status" = "passed" ] || [ "$test_status" = "failed" ]; then
            echo "Test completed with status: $test_status"
            api_call "GET" "/api/v1/tests/$test_id/result?includeArtifacts=true"
            return
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "Test monitoring timeout"
}

# Get test results with date filtering
get_recent_results() {
    local start_date=$(date -u -d '7 days ago' '+%Y-%m-%dT%H:%M:%S.000Z')
    local end_date=$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')
    
    api_call "GET" "/api/v1/results?startDate=$start_date&endDate=$end_date&status=passed&limit=10&sort=desc&sortBy=startTime"
}

# Get healing statistics
get_healing_stats() {
    api_call "GET" "/api/v1/healing/statistics?startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-07T23:59:59.999Z&groupBy=strategy"
}

# Main workflow
main() {
    echo "Starting test execution..."
    
    # Execute test
    test_id=$(execute_test)
    echo "Test ID: $test_id"
    
    # Monitor test
    monitor_test "$test_id"
    
    # Get recent results
    echo "Getting recent test results..."
    get_recent_results
    
    # Get healing stats
    echo "Getting healing statistics..."
    get_healing_stats
}

# Run main function
main
```

## Java

### Basic Setup

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class TestAutomationClient {
    private final String baseUrl;
    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TestAutomationClient(String baseUrl, String apiKey) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
        this.objectMapper = new ObjectMapper();
    }

    public TestAutomationClient(String baseUrl) {
        this(baseUrl, null);
    }

    private HttpRequest.Builder createRequestBuilder() {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .header("Content-Type", "application/json");
        
        if (apiKey != null) {
            builder.header("X-API-Key", apiKey);
        }
        
        return builder;
    }

    private <T> T makeRequest(HttpRequest request, Class<T> responseType) throws Exception {
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() >= 400) {
            throw new RuntimeException("API Error: " + response.statusCode() + " - " + response.body());
        }
        
        return objectMapper.readValue(response.body(), responseType);
    }

    public CompletableFuture<TestExecutionResult> executeTest(TestConfig config) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String json = objectMapper.writeValueAsString(config);
                HttpRequest request = createRequestBuilder()
                    .uri(URI.create(baseUrl + "/api/v1/tests/execute"))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
                
                return makeRequest(request, TestExecutionResult.class);
            } catch (Exception e) {
                throw new RuntimeException("Failed to execute test", e);
            }
        });
    }

    public CompletableFuture<TestStatus> getTestStatus(String testId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                HttpRequest request = createRequestBuilder()
                    .uri(URI.create(baseUrl + "/api/v1/tests/" + testId + "/status"))
                    .GET()
                    .build();
                
                return makeRequest(request, TestStatus.class);
            } catch (Exception e) {
                throw new RuntimeException("Failed to get test status", e);
            }
        });
    }

    public CompletableFuture<TestResult> getTestResult(String testId, boolean includeArtifacts) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String url = baseUrl + "/api/v1/tests/" + testId + "/result";
                if (includeArtifacts) {
                    url += "?includeArtifacts=true";
                }
                
                HttpRequest request = createRequestBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();
                
                return makeRequest(request, TestResult.class);
            } catch (Exception e) {
                throw new RuntimeException("Failed to get test result", e);
            }
        });
    }
}

// Data classes
class TestConfig {
    public String name;
    public String description;
    public String engine;
    public Map<String, Object> config;
    public Map<String, Object> options;

    public TestConfig(String name, String engine, Map<String, Object> config) {
        this.name = name;
        this.engine = engine;
        this.config = config;
    }
}

class TestExecutionResult {
    public boolean success;
    public TestExecutionData data;
    public String timestamp;
    public int statusCode;
}

class TestExecutionData {
    public String testId;
    public String status;
    public String message;
    public int estimatedDuration;
}

class TestStatus {
    public boolean success;
    public TestStatusData data;
}

class TestStatusData {
    public String testId;
    public String status;
    public String startTime;
    public String endTime;
    public int duration;
    public int progress;
    public int healingAttempts;
    public int errors;
}

class TestResult {
    public boolean success;
    public TestResultData data;
}

class TestResultData {
    public String testId;
    public String name;
    public String status;
    public String engine;
    public String startTime;
    public String endTime;
    public int duration;
    public TestResults results;
}

class TestResults {
    public int passed;
    public int failed;
    public int skipped;
    public int total;
}
```

## C#

### Basic Setup

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class TestAutomationClient
{
    private readonly HttpClient httpClient;
    private readonly string baseUrl;
    private readonly string apiKey;
    private readonly JsonSerializerOptions jsonOptions;

    public TestAutomationClient(string baseUrl, string apiKey = null)
    {
        this.baseUrl = baseUrl.TrimEnd('/');
        this.apiKey = apiKey;
        this.httpClient = new HttpClient();
        this.httpClient.DefaultRequestHeaders.Add("Content-Type", "application/json");
        
        if (!string.IsNullOrEmpty(apiKey))
        {
            this.httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey);
        }

        this.jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };
    }

    public async Task<TestExecutionResult> ExecuteTestAsync(TestConfig config)
    {
        var json = JsonSerializer.Serialize(config, jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await httpClient.PostAsync($"{baseUrl}/api/v1/tests/execute", content);
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<TestExecutionResult>(responseContent, jsonOptions);
    }

    public async Task<TestStatus> GetTestStatusAsync(string testId)
    {
        var response = await httpClient.GetAsync($"{baseUrl}/api/v1/tests/{testId}/status");
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<TestStatus>(content, jsonOptions);
    }

    public async Task<TestResult> GetTestResultAsync(string testId, bool includeArtifacts = false)
    {
        var url = $"{baseUrl}/api/v1/tests/{testId}/result";
        if (includeArtifacts)
        {
            url += "?includeArtifacts=true";
        }
        
        var response = await httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<TestResult>(content, jsonOptions);
    }

    public async Task<TestResultsResponse> GetTestResultsAsync(TestResultFilters filters = null)
    {
        var queryString = "";
        if (filters != null)
        {
            var parameters = new List<string>();
            if (filters.Page.HasValue) parameters.Add($"page={filters.Page.Value}");
            if (filters.Limit.HasValue) parameters.Add($"limit={filters.Limit.Value}");
            if (!string.IsNullOrEmpty(filters.Status)) parameters.Add($"status={filters.Status}");
            if (!string.IsNullOrEmpty(filters.Engine)) parameters.Add($"engine={filters.Engine}");
            if (!string.IsNullOrEmpty(filters.TestName)) parameters.Add($"testName={filters.TestName}");
            if (!string.IsNullOrEmpty(filters.StartDate)) parameters.Add($"startDate={filters.StartDate}");
            if (!string.IsNullOrEmpty(filters.EndDate)) parameters.Add($"endDate={filters.EndDate}");
            if (!string.IsNullOrEmpty(filters.Sort)) parameters.Add($"sort={filters.Sort}");
            if (!string.IsNullOrEmpty(filters.SortBy)) parameters.Add($"sortBy={filters.SortBy}");
            
            if (parameters.Count > 0)
            {
                queryString = "?" + string.Join("&", parameters);
            }
        }
        
        var response = await httpClient.GetAsync($"{baseUrl}/api/v1/results{queryString}");
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<TestResultsResponse>(content, jsonOptions);
    }

    public void Dispose()
    {
        httpClient?.Dispose();
    }
}

// Data classes
public class TestConfig
{
    public string Name { get; set; }
    public string Description { get; set; }
    public string Engine { get; set; }
    public Dictionary<string, object> Config { get; set; }
    public Dictionary<string, object> Options { get; set; }
}

public class TestExecutionResult
{
    public bool Success { get; set; }
    public TestExecutionData Data { get; set; }
    public string Timestamp { get; set; }
    public int StatusCode { get; set; }
}

public class TestExecutionData
{
    public string TestId { get; set; }
    public string Status { get; set; }
    public string Message { get; set; }
    public int EstimatedDuration { get; set; }
}

public class TestStatus
{
    public bool Success { get; set; }
    public TestStatusData Data { get; set; }
}

public class TestStatusData
{
    public string TestId { get; set; }
    public string Status { get; set; }
    public string StartTime { get; set; }
    public string EndTime { get; set; }
    public int Duration { get; set; }
    public int Progress { get; set; }
    public int HealingAttempts { get; set; }
    public int Errors { get; set; }
}

public class TestResult
{
    public bool Success { get; set; }
    public TestResultData Data { get; set; }
}

public class TestResultData
{
    public string TestId { get; set; }
    public string Name { get; set; }
    public string Status { get; set; }
    public string Engine { get; set; }
    public string StartTime { get; set; }
    public string EndTime { get; set; }
    public int Duration { get; set; }
    public TestResults Results { get; set; }
}

public class TestResults
{
    public int Passed { get; set; }
    public int Failed { get; set; }
    public int Skipped { get; set; }
    public int Total { get; set; }
}

public class TestResultFilters
{
    public int? Page { get; set; }
    public int? Limit { get; set; }
    public string Status { get; set; }
    public string Engine { get; set; }
    public string TestName { get; set; }
    public string StartDate { get; set; }
    public string EndDate { get; set; }
    public string Sort { get; set; }
    public string SortBy { get; set; }
}

public class TestResultsResponse
{
    public bool Success { get; set; }
    public TestResultsData Data { get; set; }
}

public class TestResultsData
{
    public List<TestResultData> Results { get; set; }
    public Pagination Pagination { get; set; }
}

public class Pagination
{
    public int Page { get; set; }
    public int Limit { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
    public bool HasNext { get; set; }
    public bool HasPrev { get; set; }
}
```

## Go

### Basic Setup

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type TestAutomationClient struct {
    baseURL    string
    apiKey     string
    httpClient *http.Client
}

func NewTestAutomationClient(baseURL, apiKey string) *TestAutomationClient {
    return &TestAutomationClient{
        baseURL: baseURL,
        apiKey:  apiKey,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

func (c *TestAutomationClient) makeRequest(method, endpoint string, body interface{}) ([]byte, error) {
    var reqBody io.Reader
    if body != nil {
        jsonData, err := json.Marshal(body)
        if err != nil {
            return nil, err
        }
        reqBody = bytes.NewBuffer(jsonData)
    }

    req, err := http.NewRequest(method, c.baseURL+endpoint, reqBody)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Content-Type", "application/json")
    if c.apiKey != "" {
        req.Header.Set("X-API-Key", c.apiKey)
    }

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return nil, fmt.Errorf("API error: %d", resp.StatusCode)
    }

    return io.ReadAll(resp.Body)
}

func (c *TestAutomationClient) ExecuteTest(config TestConfig) (*TestExecutionResult, error) {
    body, err := c.makeRequest("POST", "/api/v1/tests/execute", config)
    if err != nil {
        return nil, err
    }

    var result TestExecutionResult
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, err
    }

    return &result, nil
}

func (c *TestAutomationClient) GetTestStatus(testID string) (*TestStatus, error) {
    body, err := c.makeRequest("GET", "/api/v1/tests/"+testID+"/status", nil)
    if err != nil {
        return nil, err
    }

    var status TestStatus
    if err := json.Unmarshal(body, &status); err != nil {
        return nil, err
    }

    return &status, nil
}

func (c *TestAutomationClient) GetTestResult(testID string, includeArtifacts bool) (*TestResult, error) {
    endpoint := "/api/v1/tests/" + testID + "/result"
    if includeArtifacts {
        endpoint += "?includeArtifacts=true"
    }

    body, err := c.makeRequest("GET", endpoint, nil)
    if err != nil {
        return nil, err
    }

    var result TestResult
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, err
    }

    return &result, nil
}

// Data structures
type TestConfig struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description,omitempty"`
    Engine      string                 `json:"engine"`
    Config      map[string]interface{} `json:"config"`
    Options     map[string]interface{} `json:"options,omitempty"`
}

type TestExecutionResult struct {
    Success    bool                `json:"success"`
    Data       TestExecutionData   `json:"data"`
    Timestamp  string              `json:"timestamp"`
    StatusCode int                 `json:"statusCode"`
}

type TestExecutionData struct {
    TestID            string `json:"testId"`
    Status            string `json:"status"`
    Message           string `json:"message"`
    EstimatedDuration int    `json:"estimatedDuration"`
}

type TestStatus struct {
    Success bool          `json:"success"`
    Data    TestStatusData `json:"data"`
}

type TestStatusData struct {
    TestID          string `json:"testId"`
    Status          string `json:"status"`
    StartTime       string `json:"startTime"`
    EndTime         string `json:"endTime,omitempty"`
    Duration        int    `json:"duration"`
    Progress        int    `json:"progress"`
    HealingAttempts int    `json:"healingAttempts"`
    Errors          int    `json:"errors"`
}

type TestResult struct {
    Success bool          `json:"success"`
    Data    TestResultData `json:"data"`
}

type TestResultData struct {
    TestID     string      `json:"testId"`
    Name       string      `json:"name"`
    Status     string      `json:"status"`
    Engine     string      `json:"engine"`
    StartTime  string      `json:"startTime"`
    EndTime    string      `json:"endTime,omitempty"`
    Duration   int         `json:"duration"`
    Results    TestResults `json:"results"`
}

type TestResults struct {
    Passed  int `json:"passed"`
    Failed  int `json:"failed"`
    Skipped int `json:"skipped"`
    Total   int `json:"total"`
}
```

## App Analysis API Examples

### JavaScript/TypeScript

```typescript
// Start App Analysis
async function startAnalysis(url: string, analysisType: string = 'comprehensive') {
  const response = await fetch('http://localhost:3000/api/v1/analysis/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      analysisType,
      options: {
        includeScreenshots: true,
        includeAccessibility: true,
        includePerformance: true,
        includeSecurity: true,
        includeCodeGeneration: true,
        timeout: 30000
      }
    })
  });
  
  const result = await response.json();
  return result.data.analysisId;
}

// Check Analysis Status
async function checkAnalysisStatus(analysisId: string) {
  const response = await fetch(`http://localhost:3000/api/v1/analysis/${analysisId}/status`);
  return response.json();
}

// Get Analysis Results
async function getAnalysisResults(analysisId: string, includeArtifacts: boolean = false) {
  const response = await fetch(`http://localhost:3000/api/v1/analysis/${analysisId}/results?includeArtifacts=${includeArtifacts}`);
  return response.json();
}

// Generate Test Scenarios
async function generateTestScenarios(analysisId: string, testTypes: string[] = ['e2e']) {
  const response = await fetch(`http://localhost:3000/api/v1/analysis/${analysisId}/generate-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testTypes,
      options: {
        framework: 'playwright',
        includeDataDriven: true,
        includeNegativeTests: true,
        maxScenarios: 10,
        priority: 'high'
      }
    })
  });
  
  return response.json();
}

// Complete Analysis Workflow
async function completeAnalysisWorkflow(url: string) {
  try {
    // 1. Start analysis
    console.log('Starting analysis...');
    const analysisId = await startAnalysis(url);
    console.log(`Analysis started with ID: ${analysisId}`);
    
    // 2. Wait for completion
    let status = 'running';
    while (status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      const statusResponse = await checkAnalysisStatus(analysisId);
      status = statusResponse.data.status;
      console.log(`Analysis progress: ${statusResponse.data.progress}%`);
    }
    
    // 3. Get results
    console.log('Getting analysis results...');
    const results = await getAnalysisResults(analysisId, true);
    console.log('Analysis completed:', results.data.status);
    
    // 4. Generate test scenarios
    console.log('Generating test scenarios...');
    const testScenarios = await generateTestScenarios(analysisId, ['e2e', 'accessibility']);
    console.log(`Generated ${testScenarios.data.count} test scenarios`);
    
    return { analysisId, results, testScenarios };
  } catch (error) {
    console.error('Analysis workflow failed:', error);
    throw error;
  }
}

// Usage
completeAnalysisWorkflow('https://example.com')
  .then(result => console.log('Workflow completed:', result))
  .catch(error => console.error('Workflow failed:', error));
```

### Python

```python
import requests
import time
import json

class AppAnalysisClient:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
    
    def start_analysis(self, url, analysis_type='comprehensive'):
        """Start a new app analysis scan"""
        response = requests.post(
            f'{self.base_url}/api/v1/analysis/scan',
            json={
                'url': url,
                'analysisType': analysis_type,
                'options': {
                    'includeScreenshots': True,
                    'includeAccessibility': True,
                    'includePerformance': True,
                    'includeSecurity': True,
                    'includeCodeGeneration': True,
                    'timeout': 30000
                }
            }
        )
        response.raise_for_status()
        return response.json()['data']['analysisId']
    
    def check_status(self, analysis_id):
        """Check analysis scan status"""
        response = requests.get(f'{self.base_url}/api/v1/analysis/{analysis_id}/status')
        response.raise_for_status()
        return response.json()
    
    def get_results(self, analysis_id, include_artifacts=False):
        """Get complete analysis results"""
        params = {'includeArtifacts': include_artifacts}
        response = requests.get(
            f'{self.base_url}/api/v1/analysis/{analysis_id}/results',
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def generate_tests(self, analysis_id, test_types=['e2e']):
        """Generate test scenarios from analysis results"""
        response = requests.post(
            f'{self.base_url}/api/v1/analysis/{analysis_id}/generate-tests',
            json={
                'testTypes': test_types,
                'options': {
                    'framework': 'playwright',
                    'includeDataDriven': True,
                    'includeNegativeTests': True,
                    'maxScenarios': 10,
                    'priority': 'high'
                }
            }
        )
        response.raise_for_status()
        return response.json()
    
    def complete_workflow(self, url):
        """Complete analysis workflow from start to finish"""
        try:
            # Start analysis
            print('Starting analysis...')
            analysis_id = self.start_analysis(url)
            print(f'Analysis started with ID: {analysis_id}')
            
            # Wait for completion
            status = 'running'
            while status == 'running':
                time.sleep(2)  # Wait 2 seconds
                status_response = self.check_status(analysis_id)
                status = status_response['data']['status']
                progress = status_response['data']['progress']
                print(f'Analysis progress: {progress}%')
            
            # Get results
            print('Getting analysis results...')
            results = self.get_results(analysis_id, include_artifacts=True)
            print(f'Analysis completed: {results["data"]["status"]}')
            
            # Generate test scenarios
            print('Generating test scenarios...')
            test_scenarios = self.generate_tests(analysis_id, ['e2e', 'accessibility'])
            print(f'Generated {test_scenarios["data"]["count"]} test scenarios')
            
            return {
                'analysis_id': analysis_id,
                'results': results,
                'test_scenarios': test_scenarios
            }
        except Exception as error:
            print(f'Analysis workflow failed: {error}')
            raise

# Usage
client = AppAnalysisClient()
try:
    result = client.complete_workflow('https://example.com')
    print('Workflow completed:', json.dumps(result, indent=2))
except Exception as error:
    print(f'Workflow failed: {error}')
```

### cURL Examples

```bash
# Start App Analysis
curl -X POST http://localhost:3000/api/v1/analysis/scan \
  -H "Content-Type: application/json" \
  -d '{
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
  }'

# Check Analysis Status
curl "http://localhost:3000/api/v1/analysis/analysis_https_example_com_1641234567890/status"

# Get Analysis Results
curl "http://localhost:3000/api/v1/analysis/analysis_https_example_com_1641234567890/results?includeArtifacts=true"

# Generate Test Scenarios
curl -X POST http://localhost:3000/api/v1/analysis/analysis_https_example_com_1641234567890/generate-tests \
  -H "Content-Type: application/json" \
  -d '{
    "testTypes": ["e2e", "accessibility"],
    "options": {
      "framework": "playwright",
      "includeDataDriven": true,
      "includeNegativeTests": true,
      "maxScenarios": 10,
      "priority": "high"
    }
  }'

# Get Generated Test Scenarios
curl "http://localhost:3000/api/v1/analysis/generated-tests?analysisId=analysis_https_example_com_1641234567890&page=1&limit=10"
```

This comprehensive set of client examples provides developers with ready-to-use code for integrating with the Self-Healing Test Automation Harness API in their preferred programming language, including the new App Analysis API endpoints.
