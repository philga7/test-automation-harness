# AI Provider Abstraction Layer

## Overview

The **AI Provider Abstraction Layer** provides a flexible, swappable architecture for integrating multiple AI service providers (OpenAI, Claude, Local models) into the Self-Healing Test Automation Harness. This abstraction enables consistent error handling, provider selection, and performance monitoring across different AI services.

## 🎯 Key Features

### 🔌 Swappable Provider Architecture
- **Strategy Pattern Implementation**: Abstract base class following established HealingStrategy patterns
- **Multiple Provider Support**: OpenAI, Claude (Anthropic), Local LLM models
- **Consistent Interface**: Unified API across all provider implementations
- **Easy Integration**: Simple provider registration and discovery

### 🛡️ Comprehensive Error Handling
- **Specialized Error Classes**: AIProviderError, RateLimitError, QuotaExceededError, TimeoutError
- **TypeScript Strict Mode Compliance**: Conditional assignment for optional properties
- **Detailed Error Context**: Field-specific error information and error chaining
- **Graceful Degradation**: Fallback mechanisms for provider unavailability

### 📊 Provider Management
- **Statistics Tracking**: Request counts, success rates, average response times
- **Health Monitoring**: Provider status, connection health, performance metrics
- **Confidence Scoring**: Provider selection based on confidence calculations
- **Resource Management**: Proper initialization and cleanup lifecycle

### ⚡ Performance Optimization
- **Request Tracking**: Unique request IDs and attempt counting
- **Performance Metrics**: Response time monitoring and success rate analysis
- **Resource Cleanup**: Automatic memory management and connection handling
- **Load-Based Adjustments**: Confidence scoring based on system load

## 🏗️ Architecture

### Component Structure

```
src/ai/
├── providers/
│   └── AIProviderStrategy.ts    # Abstract base class for AI providers
└── types.ts                      # AI provider interfaces and type definitions
```

### Core Interfaces

#### IAIProvider
Core interface that all AI providers must implement:
```typescript
export interface IAIProvider {
  readonly name: string;
  readonly version: string;
  readonly supportedServiceTypes: string[];
  
  sendRequest(request: AIRequest): Promise<AIResponse>;
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;
  getProviderName(): string;
  initialize(config: ProviderConfig): Promise<void>;
  cleanup(): Promise<void>;
  getHealth(): Promise<ProviderHealth>;
}
```

#### IAIProviderStrategy
Extends IAIProvider with strategy-specific capabilities:
```typescript
export interface IAIProviderStrategy extends IAIProvider {
  readonly supportedFailureTypes: string[];
  
  calculateConfidence(request: AIRequest, context: ProviderContext): Promise<number>;
  canHandle(request: AIRequest): boolean;
}
```

### Type Definitions

#### AIRequest
Request structure for AI service calls:
```typescript
export interface AIRequest {
  id: string;
  serviceType: string;
  prompt: string;
  parameters: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    timestamp?: Date;
    [key: string]: any;
  };
}
```

#### AIResponse
Response structure from AI services:
```typescript
export interface AIResponse {
  id: string;
  content: string;
  metadata: {
    model: string;
    provider: string;
    tokensUsed?: number;
    responseTime: number;
    confidence?: number;
    timestamp: Date;
  };
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

#### ProviderConfig
Configuration structure for AI providers:
```typescript
export interface ProviderConfig {
  name: string;
  version: string;
  parameters: Record<string, any>;
  services: {
    [serviceType: string]: {
      enabled: boolean;
      configuration: Record<string, any>;
    };
  };
  timeout?: number;
  retries?: {
    maxAttempts: number;
    backoffMs: number;
  };
}
```

## 📝 Implementation Guide

### Creating a New AI Provider

#### Step 1: Extend AIProviderStrategy
```typescript
import { AIProviderStrategy, AIRequest, AIResponse, ProviderConfig, ProviderContext, ConnectionTestResult } from '@/ai';

export class OpenAIProvider extends AIProviderStrategy {
  constructor() {
    super(
      'openai',
      '1.0.0',
      ['text-generation', 'embeddings', 'chat-completion'],
      ['timeout', 'rate-limit', 'quota-exceeded']
    );
  }
  
  protected async doSendRequest(request: AIRequest): Promise<AIResponse> {
    // OpenAI-specific implementation
    const apiKey = this.config.parameters['apiKey'] as string;
    const model = this.config.parameters['model'] as string || 'gpt-4';
    
    // Make API call to OpenAI
    const response = await this.callOpenAI(request.prompt, model, apiKey);
    
    return {
      id: request.id,
      content: response.choices[0].message.content,
      metadata: {
        model: response.model,
        provider: 'openai',
        tokensUsed: response.usage.total_tokens,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      },
      status: 'success'
    };
  }
  
  protected async doTestConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    // Test OpenAI connection
    try {
      const apiKey = config.parameters['apiKey'] as string;
      await this.verifyAPIKey(apiKey);
      
      return {
        success: true,
        duration: Date.now() - startTime,
        message: 'OpenAI connection successful',
        provider: {
          name: this.name,
          version: this.version,
          capabilities: this.supportedServiceTypes
        }
      };
    } catch (error) {
      throw new AIProviderError('OpenAI connection failed', 'apiKey', error as Error);
    }
  }
  
  protected async doCalculateConfidence(request: AIRequest, context: ProviderContext): Promise<number> {
    // Calculate confidence based on request type and provider capabilities
    let confidence = 0.8; // Base confidence
    
    // Adjust based on request complexity
    if (request.parameters['temperature'] > 0.9) {
      confidence *= 0.9; // Reduce for high temperature
    }
    
    // Adjust based on provider statistics
    const stats = this.getStatistics();
    if (stats.successRate > 0.95) {
      confidence *= 1.1; // Boost for high success rate
    }
    
    return confidence;
  }
  
  protected async doInitialize(config: ProviderConfig): Promise<void> {
    // Initialize OpenAI client
    this.config = config;
    const apiKey = config.parameters['apiKey'] as string;
    this.client = new OpenAI({ apiKey });
  }
  
  protected async doCleanup(): Promise<void> {
    // Cleanup OpenAI resources
    this.client = null;
  }
}
```

#### Step 2: Register Provider
```typescript
import { AIProviderRegistry } from '@/ai';
import { OpenAIProvider } from './OpenAIProvider';

const registry = new AIProviderRegistry();
const openAIProvider = new OpenAIProvider();

await openAIProvider.initialize({
  name: 'openai',
  version: '1.0.0',
  parameters: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    temperature: 0.7
  },
  services: {
    'text-generation': {
      enabled: true,
      configuration: { maxTokens: 2000 }
    }
  }
});

registry.register(openAIProvider);
```

#### Step 3: Use Provider
```typescript
const provider = registry.getProvider('openai');

const request: AIRequest = {
  id: 'req-123',
  serviceType: 'text-generation',
  prompt: 'Generate test scenarios for user login',
  parameters: {
    temperature: 0.7,
    maxTokens: 1500
  }
};

const response = await provider.sendRequest(request);
console.log(response.content);
```

## 🔧 Error Handling

### Error Class Hierarchy

```typescript
// Base error class
export class AIProviderError extends Error {
  public override readonly cause?: Error;
  public readonly field?: string;
  
  constructor(message: string, field?: string, cause?: Error) {
    super(message);
    this.name = 'AIProviderError';
    
    // Conditional assignment for TypeScript strict mode compliance
    if (field !== undefined) {
      this.field = field;
    }
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

// Rate limit error
export class RateLimitError extends AIProviderError {
  public readonly retryAfter?: number;
  
  constructor(message: string, retryAfter?: number, cause?: Error) {
    super(message, 'rateLimit', cause);
    this.name = 'RateLimitError';
    
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

// Quota exceeded error
export class QuotaExceededError extends AIProviderError {
  public readonly quotaLimit?: number;
  public readonly quotaUsed?: number;
  
  constructor(message: string, quotaLimit?: number, quotaUsed?: number, cause?: Error) {
    super(message, 'quota', cause);
    this.name = 'QuotaExceededError';
    
    if (quotaLimit !== undefined) {
      this.quotaLimit = quotaLimit;
    }
    if (quotaUsed !== undefined) {
      this.quotaUsed = quotaUsed;
    }
  }
}

// Timeout error
export class TimeoutError extends AIProviderError {
  public readonly timeoutMs?: number;
  
  constructor(message: string, timeoutMs?: number, cause?: Error) {
    super(message, 'timeout', cause);
    this.name = 'TimeoutError';
    
    if (timeoutMs !== undefined) {
      this.timeoutMs = timeoutMs;
    }
  }
}
```

### Error Handling Patterns

```typescript
try {
  const response = await provider.sendRequest(request);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Handle rate limiting
    const retryAfter = error.retryAfter || 60000;
    console.log(`Rate limited, retry after ${retryAfter}ms`);
    await sleep(retryAfter);
  } else if (error instanceof QuotaExceededError) {
    // Handle quota exceeded
    console.error(`Quota exceeded: ${error.quotaUsed}/${error.quotaLimit}`);
  } else if (error instanceof TimeoutError) {
    // Handle timeout
    console.error(`Request timed out after ${error.timeoutMs}ms`);
  } else if (error instanceof AIProviderError) {
    // Handle generic AI provider error
    console.error(`AI Provider Error in field ${error.field}: ${error.message}`);
  }
}
```

## 📊 Statistics and Health Monitoring

### Provider Statistics
```typescript
const stats = provider.getStatistics();
console.log({
  name: stats.name,
  version: stats.version,
  totalRequests: stats.totalRequests,
  successRate: stats.successRate,
  averageResponseTime: stats.averageResponseTime
});
```

### Health Monitoring
```typescript
const health = await provider.getHealth();
console.log({
  status: health.status,           // 'healthy' | 'degraded' | 'unhealthy'
  score: health.score,              // 0-1
  connectionStatus: health.details.connectionStatus,
  responseTime: health.details.responseTime,
  errorRate: health.details.errorRate
});
```

## 🎓 TypeScript Strict Mode Compliance

### Conditional Assignment Pattern
```typescript
// ✅ CORRECT: Conditional assignment for optional properties
constructor(message: string, field?: string, cause?: Error) {
  super(message);
  
  if (field !== undefined) {
    this.field = field;
  }
  if (cause !== undefined) {
    this.cause = cause;
  }
}

// ❌ WRONG: Direct assignment fails with exactOptionalPropertyTypes
constructor(message: string, field?: string, cause?: Error) {
  super(message);
  this.field = field;   // TypeScript error
  this.cause = cause;   // TypeScript error
}
```

### Bracket Notation Pattern
```typescript
// ✅ CORRECT: Use bracket notation for Record<string, any> properties
const config: ProviderConfig = {
  parameters: { 'apiKey': 'sk-...', 'model': 'gpt-4' }
};
const apiKey = config.parameters['apiKey'] as string;

// ❌ WRONG: Dot notation fails in TypeScript strict mode
const apiKey = config.parameters.apiKey;  // TypeScript error
```

## 🚀 Future Enhancements

### Planned Features
- [ ] **Claude Provider Implementation**: Anthropic Claude integration
- [ ] **Local Model Support**: Integration with local LLM deployments
- [ ] **Provider Switching**: Automatic failover between providers
- [ ] **Cost Tracking**: Track API usage costs across providers
- [ ] **Caching Layer**: Request/response caching for performance
- [ ] **Batch Requests**: Support for batch request processing
- [ ] **Streaming Responses**: Support for streaming AI responses
- [ ] **Provider Metrics Dashboard**: Real-time provider performance monitoring

## 📚 Related Documentation

- [AI Test Generator](./AI_TEST_GENERATOR.md) - AI-powered test generation using provider abstraction
- [Plugin Architecture](./PLUGIN_ARCHITECTURE.md) - Overall plugin system architecture
- [API Documentation](./API_COMPLETE.md) - REST API for AI provider management
- [Healing Strategies](./HEALING_STRATEGIES.md) - Self-healing patterns similar to provider strategies

## 🧪 Testing

### TDD Implementation
The AI Provider Abstraction Layer was implemented using strict Test-Driven Development methodology:
- **16 comprehensive tests** defining expected behavior
- **100% test success rate** with zero regressions
- **TypeScript strict mode compliance** validated through testing
- **All 974 project tests** continue passing

### Test Coverage
- Abstract base class functionality
- Error class hierarchy with conditional assignment
- Interface definitions and type safety
- Directory structure verification
- Plugin architecture integration
- Provider lifecycle management

## 🤝 Contributing

When implementing new AI providers:
1. Extend `AIProviderStrategy` abstract base class
2. Implement all abstract methods (`doSendRequest`, `doTestConnection`, etc.)
3. Use conditional assignment for optional properties
4. Follow TypeScript strict mode compliance patterns
5. Write comprehensive tests using TDD methodology
6. Update provider registry and documentation

---

**Implementation Date**: October 1, 2025  
**Test Coverage**: 16/16 tests passing (100%)  
**Zero Regressions**: 974/974 total tests passing  
**Methodology**: Strict Test-Driven Development (RED-GREEN-REFACTOR)
