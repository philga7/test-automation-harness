/**
 * Analysis Error Types
 * GREEN PHASE: Minimal error classes to make tests pass
 */

/**
 * Base error class for all analysis operations
 */
export class AnalysisError extends Error {
  public override readonly cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'AnalysisError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Error thrown when analysis operation times out
 */
export class AnalysisTimeoutError extends AnalysisError {
  public readonly timeout: number;
  
  constructor(message: string, timeout: number, cause?: Error) {
    super(message, cause);
    this.name = 'AnalysisTimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Error thrown when invalid configuration is provided
 */
export class AnalysisConfigurationError extends AnalysisError {
  public readonly configField?: string;
  
  constructor(message: string, configField?: string, cause?: Error) {
    super(message, cause);
    this.name = 'AnalysisConfigurationError';
    if (configField !== undefined) {
      this.configField = configField;
    }
  }
}

/**
 * Error thrown during analysis execution
 */
export class AnalysisExecutionError extends AnalysisError {
  public readonly operation?: string;
  
  constructor(message: string, operation?: string, cause?: Error) {
    super(message, cause);
    this.name = 'AnalysisExecutionError';
    if (operation !== undefined) {
      this.operation = operation;
    }
  }
}

/**
 * Error thrown when validation fails for analysis data
 */
export class AnalysisValidationError extends AnalysisError {
  public readonly validationRule?: string;
  
  constructor(message: string, validationRule?: string, cause?: Error) {
    super(message, cause);
    this.name = 'AnalysisValidationError';
    if (validationRule !== undefined) {
      this.validationRule = validationRule;
    }
  }
}

/**
 * Error thrown when UI element could not be located
 */
export class ElementNotFoundError extends AnalysisError {
  public readonly selector?: string;
  
  constructor(message: string, selector?: string, cause?: Error) {
    super(message, cause);
    this.name = 'ElementNotFoundError';
    if (selector !== undefined) {
      this.selector = selector;
    }
  }
}

/**
 * Error thrown when user flow detection fails
 */
export class FlowDetectionError extends AnalysisError {
  public readonly flowType?: string;
  
  constructor(message: string, flowType?: string, cause?: Error) {
    super(message, cause);
    this.name = 'FlowDetectionError';
    if (flowType !== undefined) {
      this.flowType = flowType;
    }
  }
}

/**
 * Error thrown when AI service is unavailable or fails
 */
export class AIServiceError extends AnalysisError {
  public readonly provider?: string;
  
  constructor(message: string, provider?: string, cause?: Error) {
    super(message, cause);
    this.name = 'AIServiceError';
    if (provider !== undefined) {
      this.provider = provider;
    }
  }
}
