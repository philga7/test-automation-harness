/**
 * Configuration schema definitions for the Self-Healing Test Automation Harness
 * Provides type safety and validation for YAML configuration files
 */

export interface TestEngineConfig {
  enabled: boolean;
  timeout: number;
  retries?: number;
  options?: Record<string, any>;
}

export interface PlaywrightConfig extends TestEngineConfig {
  headless?: boolean;
  browser?: 'chromium' | 'firefox' | 'webkit';
  viewport?: {
    width: number;
    height: number;
  };
  baseUrl?: string;
}

export interface JestConfig extends TestEngineConfig {
  testMatch?: string[];
  coverage?: boolean;
  watch?: boolean;
}

export interface K6Config extends TestEngineConfig {
  vus?: number; // virtual users
  duration?: string;
  stages?: Array<{
    duration: string;
    target: number;
  }>;
}

export interface ZapConfig extends TestEngineConfig {
  apiKey?: string;
  context?: string;
  policy?: string;
  target?: string;
}

export interface HealingConfig {
  enabled: boolean;
  confidenceThreshold: number;
  maxRetries: number;
  strategies: {
    selectorHealing: boolean;
    waitHealing: boolean;
    assertionHealing: boolean;
    navigationHealing: boolean;
  };
  fallbackStrategies: {
    id: boolean;
    css: boolean;
    xpath: boolean;
    neighbor: boolean;
  };
}

export interface ObservabilityConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    endpoint?: string;
    interval: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    file?: string;
  };
  tracing: {
    enabled: boolean;
    endpoint?: string;
  };
}

export interface ApiConfig {
  enabled: boolean;
  port: number;
  timeout: number;
  retries: number;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
}

export interface DatabaseConfig {
  enabled: boolean;
  type: 'sqlite' | 'postgresql' | 'mysql';
  connection: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    filename?: string; // for SQLite
  };
  migrations: {
    enabled: boolean;
    path: string;
  };
}

export interface SecurityConfig {
  enabled: boolean;
  authentication: {
    enabled: boolean;
    type: 'none' | 'jwt' | 'api-key';
    secret?: string;
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    key?: string;
  };
}

export interface TestOrchestrationConfig {
  parallel: boolean;
  maxConcurrency: number;
  timeout: number;
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    backoffMultiplier: number;
  };
  reporting: {
    enabled: boolean;
    formats: ('json' | 'html' | 'junit')[];
    outputDir: string;
  };
}

export interface EnvironmentConfig {
  name: string;
  description?: string;
  variables: Record<string, string>;
  overrides: Partial<AppConfig>;
}

export interface AppConfig {
  // Application settings
  app: {
    name: string;
    version: string;
    environment: string;
    debug: boolean;
  };

  // API configuration
  api: ApiConfig;

  // Test engines configuration
  engines: {
    playwright: PlaywrightConfig;
    jest: JestConfig;
    k6: K6Config;
    zap: ZapConfig;
  };

  // Self-healing configuration
  healing: HealingConfig;

  // Observability configuration
  observability: ObservabilityConfig;

  // Database configuration
  database: DatabaseConfig;

  // Security configuration
  security: SecurityConfig;

  // Test orchestration configuration
  orchestration: TestOrchestrationConfig;

  // Environment-specific settings
  environments: {
    [key: string]: EnvironmentConfig;
  };
}

// Default configuration values
export const DEFAULT_CONFIG: Partial<AppConfig> = {
  app: {
    name: 'test-automation-harness',
    version: '0.1.0',
    environment: 'development',
    debug: false,
  },
  api: {
    enabled: true,
    port: 3000,
    timeout: 30000,
    retries: 3,
    cors: {
      enabled: true,
      origins: ['http://localhost:3000'],
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
  },
  engines: {
    playwright: {
      enabled: true,
      timeout: 30000,
      retries: 3,
      headless: true,
      browser: 'chromium',
      viewport: {
        width: 1280,
        height: 720,
      },
    },
    jest: {
      enabled: true,
      timeout: 10000,
      retries: 2,
      testMatch: ['**/*.test.ts', '**/*.spec.ts'],
      coverage: true,
      watch: false,
    },
    k6: {
      enabled: true,
      timeout: 60000,
      retries: 1,
      vus: 10,
      duration: '30s',
    },
    zap: {
      enabled: true,
      timeout: 120000,
      retries: 1,
    },
  },
  healing: {
    enabled: true,
    confidenceThreshold: 0.6,
    maxRetries: 3,
    strategies: {
      selectorHealing: true,
      waitHealing: true,
      assertionHealing: true,
      navigationHealing: true,
    },
    fallbackStrategies: {
      id: true,
      css: true,
      xpath: true,
      neighbor: true,
    },
  },
  observability: {
    enabled: true,
    metrics: {
      enabled: true,
      interval: 5000,
    },
    logging: {
      level: 'info',
      format: 'text',
    },
    tracing: {
      enabled: false,
    },
  },
  database: {
    enabled: false,
    type: 'sqlite',
    connection: {
      filename: './data/test-harness.db',
    },
    migrations: {
      enabled: true,
      path: './migrations',
    },
  },
  security: {
    enabled: false,
    authentication: {
      enabled: false,
      type: 'none',
    },
    encryption: {
      enabled: false,
      algorithm: 'aes-256-gcm',
    },
  },
  orchestration: {
    parallel: true,
    maxConcurrency: 5,
    timeout: 300000, // 5 minutes
    retryPolicy: {
      enabled: true,
      maxRetries: 2,
      backoffMultiplier: 2,
    },
    reporting: {
      enabled: true,
      formats: ['json', 'html'],
      outputDir: './reports',
    },
  },
  environments: {},
};

// Configuration validation rules
export interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export const CONFIG_VALIDATION_RULES: ValidationRule[] = [
  // App validation
  { field: 'app.name', required: true, type: 'string' },
  { field: 'app.version', required: true, type: 'string' },
  { field: 'app.environment', required: true, type: 'string', enum: ['development', 'staging', 'production'] },
  { field: 'app.debug', required: true, type: 'boolean' },

  // API validation
  { field: 'api.port', required: true, type: 'number', min: 1, max: 65535 },
  { field: 'api.timeout', required: true, type: 'number', min: 1000 },
  { field: 'api.retries', required: true, type: 'number', min: 0, max: 10 },

  // Healing validation
  { field: 'healing.confidenceThreshold', required: true, type: 'number', min: 0, max: 1 },
  { field: 'healing.maxRetries', required: true, type: 'number', min: 0, max: 10 },

  // Engine validation
  { field: 'engines.playwright.timeout', required: true, type: 'number', min: 1000 },
  { field: 'engines.jest.timeout', required: true, type: 'number', min: 1000 },
  { field: 'engines.k6.timeout', required: true, type: 'number', min: 1000 },
  { field: 'engines.zap.timeout', required: true, type: 'number', min: 1000 },
];
