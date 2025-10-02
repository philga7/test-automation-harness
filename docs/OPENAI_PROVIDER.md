# OpenAI Provider Implementation

## Overview

The **OpenAI Provider** is a production-ready implementation of the `AIProviderStrategy` pattern, providing seamless integration with OpenAI's Chat Completions API. Built using strict Test-Driven Development methodology with comprehensive error handling and TypeScript strict mode compliance.

## 🎯 Features

### ✅ Implemented Capabilities
- **Chat Completions API**: Full integration with `/v1/chat/completions` endpoint
- **Connection Testing**: API key validation via `/v1/models` endpoint
- **Error Handling**: Comprehensive categorization (rate limits, quotas, invalid keys)
- **Token Tracking**: Automatic usage logging from `response.usage.total_tokens`
- **Retry Logic**: HTTPClient integration with exponential backoff
- **Environment Security**: API key from `OPENAI_API_KEY` environment variable
- **Configurable Models**: Default gpt-4 with parameter override support
- **Performance Metrics**: Response time and success rate tracking

## 🏗️ Architecture

### File Location
```
src/ai/providers/OpenAIProvider.ts
tests/unit/openai-provider.test.ts
```

### Class Structure
```typescript
export class OpenAIProvider extends AIProviderStrategy {
  // Properties
  private httpClient: HTTPClient;
  private apiKey: string = '';
  private baseUrl: string = 'https://api.openai.com/v1';
  private defaultModel: string = 'gpt-4';

  // Constructor
  constructor()

  // Abstract method implementations
  protected async doInitialize(config: ProviderConfig): Promise<void>
  protected async doSendRequest(request: AIRequest): Promise<AIResponse>
  protected async doTestConnection(config: ProviderConfig): Promise<ConnectionTestResult>
  protected async doCalculateConfidence(request: AIRequest, context: ProviderContext): Promise<number>
  protected async doCleanup(): Promise<void>

  // Private helpers
  private handleOpenAIError(error: HTTPError, request: AIRequest, responseTime: number): AIResponse
}
```

## 📋 Usage Guide

### Installation

The OpenAI provider is included with the base installation. Ensure the `openai@^4.20.0` package is installed:

```bash
npm install
```

### Configuration

#### Environment Variables
```bash
# Required: OpenAI API key
export OPENAI_API_KEY=sk-your-api-key-here
```

#### Provider Configuration
```typescript
import { OpenAIProvider } from '@/ai/providers/OpenAIProvider';

const provider = new OpenAIProvider();

await provider.initialize({
  name: 'openai',
  version: '1.0.0',
  parameters: {
    'apiKey': process.env['OPENAI_API_KEY'],  // Read from environment
    'model': 'gpt-4',                           // Optional, defaults to gpt-4
    'temperature': 0.7                          // Optional
  },
  services: {
    'chat-completion': {
      enabled: true,
      configuration: {}
    }
  },
  timeout: 30000,  // Optional, defaults to 30s
  retries: {       // Optional, uses HTTPClient defaults
    maxAttempts: 3,
    backoffMs: 1000
  }
});
```

### Basic Usage

#### Sending Requests
```typescript
import { AIRequest } from '@/ai/types';

const request: AIRequest = {
  id: 'req-001',
  serviceType: 'chat-completion',
  prompt: 'Generate test scenarios for user login flow',
  parameters: {
    'temperature': 0.7,
    'maxTokens': 2000,
    'model': 'gpt-4'  // Optional override
  },
  metadata: {
    userId: 'test-user',
    sessionId: 'session-123'
  }
};

const response = await provider.sendRequest(request);

console.log(response.content);           // Generated text
console.log(response.metadata.tokensUsed); // Token count
console.log(response.metadata.responseTime); // Response time in ms
```

#### Connection Testing
```typescript
const result = await provider.testConnection(config);

if (result.success) {
  console.log('✅ OpenAI API connection verified');
} else {
  console.error('❌ Connection failed:', result.error?.code);
  console.error('   Message:', result.error?.message);
}
```

#### Health Monitoring
```typescript
const health = await provider.getHealth();

console.log('Status:', health.status);  // 'healthy' | 'degraded' | 'unhealthy'
console.log('Score:', health.score);    // 0-1
console.log('Details:', {
  connectionStatus: health.details.connectionStatus,
  responseTime: health.details.responseTime,
  errorRate: health.details.errorRate
});
```

#### Provider Statistics
```typescript
const stats = provider.getStatistics();

console.log('Statistics:', {
  name: stats.name,
  totalRequests: stats.totalRequests,
  successfulRequests: stats.successfulRequests,
  failedRequests: stats.failedRequests,
  successRate: stats.successRate,
  averageResponseTime: stats.averageResponseTime
});
```

## 🛡️ Error Handling

### Error Types

#### Rate Limit Error (429)
```typescript
try {
  const response = await provider.sendRequest(request);
} catch (error) {
  if (error instanceof RateLimitError) {
    const retryAfter = error.retryAfter || 60000;
    console.log(`⏱️  Rate limited, retry after ${retryAfter}ms`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter));
    const response = await provider.sendRequest(request);
  }
}
```

#### Quota Exceeded Error
```typescript
try {
  const response = await provider.sendRequest(request);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('💳 Quota exceeded - insufficient subscription quota');
    // Fallback to alternative provider or notify user
  }
}
```

#### Invalid API Key (401)
```typescript
try {
  const response = await provider.sendRequest(request);
} catch (error) {
  if (error instanceof AIProviderError && error.field === 'apiKey') {
    console.error('🔑 Invalid API key - check OPENAI_API_KEY environment variable');
  }
}
```

### Complete Error Handling Pattern
```typescript
import { RateLimitError, QuotaExceededError, AIProviderError } from '@/ai/providers/AIProviderStrategy';

async function sendWithErrorHandling(provider: OpenAIProvider, request: AIRequest) {
  try {
    return await provider.sendRequest(request);
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.error('⏱️  Rate limit:', error.message);
      console.error('   Retry after:', error.retryAfter, 'ms');
      // Implement retry logic
    } else if (error instanceof QuotaExceededError) {
      console.error('💳 Quota exceeded:', error.message);
      // Fallback to alternative provider
    } else if (error instanceof AIProviderError) {
      console.error('❌ AI Provider error:', error.message);
      console.error('   Field:', error.field);
      console.error('   Cause:', error.cause);
    } else {
      console.error('❌ Unexpected error:', error);
    }
    throw error;
  }
}
```

## 📊 API Reference

### Request Format

The OpenAI Provider transforms `AIRequest` into OpenAI's Chat Completions format:

```typescript
// Input: AIRequest
{
  id: 'req-001',
  serviceType: 'chat-completion',
  prompt: 'Generate test scenarios',
  parameters: {
    'temperature': 0.7,
    'maxTokens': 2000,
    'model': 'gpt-4'
  }
}

// Transforms to: OpenAI API Request
{
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Generate test scenarios' }
  ],
  temperature: 0.7,
  max_tokens: 2000
}
```

### Response Format

OpenAI API responses are transformed to `AIResponse`:

```typescript
// OpenAI API Response
{
  id: 'chatcmpl-123',
  choices: [{
    message: { content: 'Generated content...' }
  }],
  usage: { total_tokens: 1523 }
}

// Transforms to: AIResponse
{
  id: 'req-001',
  content: 'Generated content...',
  metadata: {
    model: 'gpt-4',
    provider: 'openai',
    tokensUsed: 1523,
    responseTime: 2341,
    timestamp: Date
  },
  status: 'success'
}
```

## 🔧 Advanced Configuration

### Custom HTTP Client Configuration
```typescript
import { HTTPClient } from '@/utils/http-client';

const customHttpClient = new HTTPClient(
  {
    maxRetries: 5,
    delay: 2000,
    backoffMultiplier: 3,
    maxDelay: 20000
  },
  60000  // 60 second timeout
);

// Provider automatically uses HTTPClient from constructor
```

### Model Selection
```typescript
// Default model (gpt-4)
const request1 = {
  id: 'req-001',
  serviceType: 'chat-completion',
  prompt: 'Generate tests',
  parameters: {}
};

// Override with specific model
const request2 = {
  id: 'req-002',
  serviceType: 'chat-completion',
  prompt: 'Generate tests',
  parameters: {
    'model': 'gpt-3.5-turbo'
  }
};

// Override with different temperature
const request3 = {
  id: 'req-003',
  serviceType: 'chat-completion',
  prompt: 'Generate creative tests',
  parameters: {
    'model': 'gpt-4',
    'temperature': 0.9,
    'maxTokens': 3000
  }
};
```

## 🧪 Testing

### Test Coverage
The OpenAI Provider has **14 comprehensive tests** with **100% success rate**:

1. **Initialization Tests** (3 tests)
   - Provider instance creation
   - Configuration initialization
   - API key reading from environment

2. **API Integration Tests** (3 tests)
   - Request sending and response parsing
   - Response content extraction
   - Request parameter formatting

3. **Error Handling Tests** (4 tests)
   - Rate limit error (429) with retry-after
   - Quota exceeded error categorization
   - Invalid API key error (401)
   - Error context logging

4. **Connection Testing** (2 tests)
   - Connection test implementation
   - API key validation

5. **Lifecycle Tests** (2 tests)
   - Confidence calculation
   - Resource cleanup

### Running Tests
```bash
# Run OpenAI Provider tests
npm test -- tests/unit/openai-provider.test.ts

# Run all AI provider tests
npm test -- tests/unit/*provider*.test.ts

# Run with coverage
npm test -- --coverage tests/unit/openai-provider.test.ts
```

## 📈 Performance Considerations

### Token Usage
```typescript
// Track token usage for cost analysis
const response = await provider.sendRequest(request);

console.log('Tokens used:', response.metadata.tokensUsed);
console.log('Approximate cost:', calculateCost(response.metadata.tokensUsed, 'gpt-4'));

function calculateCost(tokens: number, model: string): number {
  const rates = {
    'gpt-4': 0.03 / 1000,         // $0.03 per 1K tokens
    'gpt-3.5-turbo': 0.002 / 1000 // $0.002 per 1K tokens
  };
  return tokens * (rates[model] || rates['gpt-4']);
}
```

### Response Time Monitoring
```typescript
// Monitor response times
const response = await provider.sendRequest(request);

console.log('Response time:', response.metadata.responseTime, 'ms');

if (response.metadata.responseTime > 5000) {
  console.warn('⚠️  Slow response detected');
}
```

### Statistics Tracking
```typescript
// Regular health checks
setInterval(async () => {
  const stats = provider.getStatistics();
  const health = await provider.getHealth();
  
  console.log('Health Check:', {
    status: health.status,
    successRate: stats.successRate,
    avgResponseTime: stats.averageResponseTime,
    totalRequests: stats.totalRequests
  });
}, 60000); // Every minute
```

## 🔒 Security Best Practices

### API Key Management
```bash
# ✅ CORRECT: Use environment variables
export OPENAI_API_KEY=sk-your-key-here

# ✅ CORRECT: Use .env files (never commit!)
echo "OPENAI_API_KEY=sk-your-key-here" >> .env

# ❌ WRONG: Never hardcode in source
const apiKey = 'sk-your-key-here';  // DON'T DO THIS
```

### Configuration Validation
```typescript
// Validate API key before use
const apiKey = process.env['OPENAI_API_KEY'];

if (!apiKey || !apiKey.startsWith('sk-')) {
  throw new Error('Invalid OPENAI_API_KEY environment variable');
}

await provider.initialize({
  name: 'openai',
  version: '1.0.0',
  parameters: { 'apiKey': apiKey },
  services: { 'chat-completion': { enabled: true, configuration: {} } }
});
```

## 📚 Related Documentation

- [AI Provider Abstraction](./AI_PROVIDER_ABSTRACTION.md) - Base abstraction layer
- [HTTP Client](./HTTP_CLIENT.md) - Retry logic and timeout handling
- [Prompt Template System](./PROMPT_TEMPLATE_SYSTEM.md) - Structured prompts for OpenAI
- [AI Test Generator](./AI_TEST_GENERATOR.md) - Using OpenAI for test generation

## 🤝 Contributing

When extending the OpenAI Provider:

1. Follow TypeScript strict mode patterns
2. Use bracket notation for `Record<string, any>` properties
3. Implement conditional assignment for optional properties
4. Write tests BEFORE implementation (TDD)
5. Update documentation with new features
6. Ensure zero regressions in test suite

## 📝 Changelog

### v1.0.0 - October 2, 2025
- ✅ Initial implementation with Chat Completions API
- ✅ Comprehensive error handling (rate limits, quotas, auth)
- ✅ Connection testing via /v1/models endpoint
- ✅ Token usage tracking
- ✅ HTTPClient integration with retry logic
- ✅ 14/14 tests passing (100%)
- ✅ Zero regressions (1046/1046 total tests)

---

**Implementation Date**: October 2, 2025  
**Test Coverage**: 14/14 tests passing (100%)  
**Total Project Tests**: 1046/1046 passing  
**Methodology**: Strict Test-Driven Development (RED-GREEN-REFACTOR)  
**TypeScript Compliance**: Strict mode with exactOptionalPropertyTypes

