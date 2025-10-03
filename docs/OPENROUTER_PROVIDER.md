# OpenRouter Provider Documentation

## Overview

The OpenRouter Provider is a production-ready AI provider implementation that integrates with the OpenRouter API, supporting 200+ models from various providers through an OpenAI-compatible Chat Completions API interface.

## Features

- **200+ Model Support**: Access to models from OpenAI, Anthropic, Google, Meta, and other providers
- **OpenAI-Compatible API**: Uses the same Chat Completions API format as OpenAI
- **Comprehensive Error Handling**: Handles rate limits, billing errors, authentication, and model availability
- **HTTPClient Integration**: Built-in retry logic with exponential backoff
- **TypeScript Strict Mode**: Full compliance with strict TypeScript requirements
- **Environment Configuration**: Secure API key management via environment variables

## Implementation

### Class Structure

```typescript
export class OpenRouterProvider extends AIProviderStrategy {
  private apiKey?: string | undefined;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private defaultModel: string = 'openai/gpt-4o-mini';
  private httpClient: HTTPClient;
}
```

### Supported Service Types

- `chat-completion`: Primary service for text generation
- `text-generation`: Alternative service type for text generation

### Supported Failure Types

- `rate-limit`: Rate limit exceeded (429)
- `model-unavailable`: Model not available (400)
- `billing-error`: Billing/credit issues (402)
- `authentication`: Authentication failures (401)
- `invalid-request`: Invalid request format (400)

## Configuration

### Environment Variables

```bash
# Required: OpenRouter API key
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

### Provider Configuration

```typescript
const config: ProviderConfig = {
  name: 'openrouter',
  version: '1.0.0',
  parameters: {
    'apiKey': 'your-openrouter-api-key', // Optional if OPENROUTER_API_KEY is set
    'model': 'openai/gpt-4o-mini'        // Default model
  },
  services: {
    'chat-completion': {
      enabled: true,
      configuration: {}
    }
  },
  timeout: 30000,
  retries: {
    maxAttempts: 3,
    backoffMs: 1000
  }
};
```

## API Integration

### Request Format

The OpenRouter Provider uses the OpenAI-compatible Chat Completions API format:

```typescript
const requestBody = {
  model: 'openai/gpt-4o-mini',
  messages: [
    {
      role: 'user',
      content: 'Your prompt here'
    }
  ],
  temperature: 0.7,
  max_tokens: 2000
};
```

### Response Format

Responses follow the OpenAI Chat Completions format:

```typescript
{
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1234567890,
  model: 'openai/gpt-4o-mini',
  choices: [{
    index: 0,
    message: {
      role: 'assistant',
      content: 'Generated response content'
    },
    finish_reason: 'stop'
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  }
}
```

## Error Handling

### Rate Limit Errors (429)

```typescript
if (error.status === 429) {
  const retryAfter = error.headers?.get?.('retry-after');
  throw new RateLimitError(
    'OpenRouter rate limit exceeded',
    retryAfter ? parseInt(retryAfter) : undefined,
    error
  );
}
```

### Model Unavailable (400)

```typescript
if (error.status === 400) {
  throw new AIProviderError(
    `OpenRouter request error: ${error.body?.error?.message || error.message}`,
    'request',
    error
  );
}
```

### Billing Errors (402)

```typescript
if (error.status === 402) {
  throw new AIProviderError(
    'OpenRouter billing error. Check your account credits.',
    'billing',
    error
  );
}
```

### Authentication Errors (401)

```typescript
if (error.status === 401) {
  throw new AIProviderError(
    'OpenRouter authentication failed. Check your API key.',
    'authentication',
    error
  );
}
```

### Model Not Found (404)

```typescript
if (error.status === 404) {
  throw new AIProviderError(
    'OpenRouter model not found. Check model availability.',
    'model',
    error
  );
}
```

## Usage Examples

### Basic Usage

```typescript
import { OpenRouterProvider } from '@/ai/providers/OpenRouterProvider';

const provider = new OpenRouterProvider();
await provider.initialize(config);

const response = await provider.sendRequest({
  id: 'test-001',
  serviceType: 'chat-completion',
  prompt: 'Generate a test scenario for login flow',
  parameters: {
    'temperature': 0.7,
    'maxTokens': 2000
  }
});

console.log(response.content);
```

### Model Selection

```typescript
// Use different models from the OpenRouter catalog
const models = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
  'google/gemini-pro',
  'meta-llama/llama-3.1-8b-instruct'
];

for (const model of models) {
  const response = await provider.sendRequest({
    id: `test-${model}`,
    serviceType: 'chat-completion',
    prompt: 'Test prompt',
    parameters: { 'model': model }
  });
}
```

### Connection Testing

```typescript
const connectionResult = await provider.testConnection(config);

if (connectionResult.success) {
  console.log('OpenRouter connection successful');
} else {
  console.error('Connection failed:', connectionResult.error);
}
```

### Confidence Calculation

```typescript
const confidence = await provider.calculateConfidence(request, context);
console.log(`Provider confidence: ${confidence}`);
```

## Testing

The OpenRouter Provider includes comprehensive test coverage with 21 tests covering:

- **Initialization**: API key validation and configuration
- **API Integration**: Request/response formatting and parsing
- **Error Handling**: All OpenRouter-specific error scenarios
- **Connection Testing**: API connectivity validation
- **Confidence Calculation**: Provider selection scoring
- **Cleanup**: Resource management and security

### Running Tests

```bash
# Run OpenRouter Provider tests
npm test -- tests/unit/openrouter-provider.test.ts

# Run all tests
npm test
```

## Performance

- **Response Time**: Optimized with HTTPClient retry logic
- **Timeout**: 30-second default timeout with configurable retry attempts
- **Rate Limiting**: Automatic retry with exponential backoff
- **Token Tracking**: Accurate token usage monitoring

## Security

- **API Key Management**: Secure environment variable configuration
- **Request Headers**: Optional referer and title headers for rate limit optimization
- **Error Sanitization**: Sensitive information filtered from error messages
- **Resource Cleanup**: API keys cleared during cleanup

## Integration

The OpenRouter Provider seamlessly integrates with the existing AI provider infrastructure:

- **AIProviderStrategy**: Extends the abstract base class
- **HTTPClient**: Uses shared HTTP client with retry logic
- **Error Handling**: Follows established error class hierarchy
- **Configuration**: Compatible with existing configuration system
- **Plugin System**: Ready for plugin registry integration

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure `OPENROUTER_API_KEY` environment variable is set
   - Verify API key is valid and has sufficient credits

2. **Model Not Available**
   - Check model name format (e.g., `openai/gpt-4o-mini`)
   - Verify model is available in OpenRouter catalog

3. **Rate Limit Exceeded**
   - Implement exponential backoff
   - Consider using different models or reducing request frequency

4. **Billing Errors**
   - Check OpenRouter account credits
   - Verify billing information is up to date

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
// Debug logs are automatically included for:
// - Request/response details
// - Error context
// - Performance metrics
// - Connection test results
```

## Future Enhancements

- **Streaming Support**: Real-time response streaming
- **Function Calling**: Tool/function calling capabilities
- **Image Support**: Vision model integration
- **Custom Models**: Support for custom fine-tuned models
- **Advanced Caching**: Response caching for improved performance
