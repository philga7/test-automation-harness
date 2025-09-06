/**
 * Configuration management for the Self-Healing Test Automation Harness
 */

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  api: {
    timeout: number;
    retries: number;
  };
  testEngines: {
    playwright: {
      enabled: boolean;
      timeout: number;
    };
    jest: {
      enabled: boolean;
      timeout: number;
    };
    k6: {
      enabled: boolean;
      timeout: number;
    };
    zap: {
      enabled: boolean;
      timeout: number;
    };
  };
  healing: {
    enabled: boolean;
    confidenceThreshold: number;
    maxRetries: number;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  logLevel: process.env['LOG_LEVEL'] || 'info',
  api: {
    timeout: parseInt(process.env['API_TIMEOUT'] || '30000', 10),
    retries: parseInt(process.env['API_RETRIES'] || '3', 10),
  },
  testEngines: {
    playwright: {
      enabled: process.env['PLAYWRIGHT_ENABLED'] !== 'false',
      timeout: parseInt(process.env['PLAYWRIGHT_TIMEOUT'] || '30000', 10),
    },
    jest: {
      enabled: process.env['JEST_ENABLED'] !== 'false',
      timeout: parseInt(process.env['JEST_TIMEOUT'] || '10000', 10),
    },
    k6: {
      enabled: process.env['K6_ENABLED'] !== 'false',
      timeout: parseInt(process.env['K6_TIMEOUT'] || '60000', 10),
    },
    zap: {
      enabled: process.env['ZAP_ENABLED'] !== 'false',
      timeout: parseInt(process.env['ZAP_TIMEOUT'] || '120000', 10),
    },
  },
  healing: {
    enabled: process.env['HEALING_ENABLED'] !== 'false',
    confidenceThreshold: parseFloat(process.env['HEALING_CONFIDENCE_THRESHOLD'] || '0.6'),
    maxRetries: parseInt(process.env['HEALING_MAX_RETRIES'] || '3', 10),
  },
};
