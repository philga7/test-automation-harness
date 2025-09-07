/**
 * Playwright-specific configuration types
 * 
 * This file contains configuration interfaces and types specific to the Playwright test engine,
 * extending the base engine configuration with Playwright-specific options.
 */

import { BrowserConfig, NetworkConfig } from '../types/types';

/**
 * Playwright test configuration
 * 
 * Extends the base test configuration with Playwright-specific options
 */
export interface PlaywrightTestConfig {
  /** Test file pattern or specific file path */
  testFile: string;
  
  /** Test name pattern for filtering */
  testNamePattern?: string;
  
  /** Browser configuration */
  browser: PlaywrightBrowserConfig;
  
  /** Viewport configuration */
  viewport: PlaywrightViewportConfig;
  
  /** Screenshot configuration */
  screenshots: PlaywrightScreenshotConfig;
  
  /** Video recording configuration */
  video: PlaywrightVideoConfig;
  
  /** Trace configuration for debugging */
  trace: PlaywrightTraceConfig;
  
  /** Network configuration */
  network: PlaywrightNetworkConfig;
  
  /** Timeout configuration */
  timeouts: PlaywrightTimeoutConfig;
  
  /** Retry configuration */
  retries: PlaywrightRetryConfig;
  
  /** Reporter configuration */
  reporters: PlaywrightReporterConfig[];
  
  /** Global setup/teardown */
  globalSetup?: string;
  globalTeardown?: string;
  
  /** Test directory */
  testDir: string;
  
  /** Output directory */
  outputDir: string;
  
  /** Whether to run tests in parallel */
  fullyParallel: boolean;
  
  /** Maximum number of workers */
  workers: number;
  
  /** Whether to forbid only tests */
  forbidOnly: boolean;
  
  /** Whether to forbid focused tests */
  forbidFocused: boolean;
  
  /** Whether to retry on failure */
  retryOnFailure: boolean;
}

/**
 * Playwright browser configuration
 */
export interface PlaywrightBrowserConfig extends BrowserConfig {
  /** Browser type */
  type: 'chromium' | 'firefox' | 'webkit';
  
  /** Browser channel (for Chromium) */
  channel?: 'chrome' | 'chrome-beta' | 'chrome-dev' | 'chrome-canary' | 'msedge' | 'msedge-beta' | 'msedge-dev' | 'msedge-canary';
  
  /** Browser arguments */
  args?: string[];
  
  /** Whether to ignore HTTPS errors */
  ignoreHTTPSErrors?: boolean;
  
  /** Whether to accept downloads */
  acceptDownloads?: boolean;
  
  /** Download path */
  downloadPath?: string;
  
  /** Whether to bypass CSP */
  bypassCSP?: boolean;
  
  /** User data directory */
  userDataDir?: string;
  
  /** Whether to use persistent context */
  persistentContext?: boolean;
}

/**
 * Playwright viewport configuration
 */
export interface PlaywrightViewportConfig {
  /** Viewport width */
  width: number;
  
  /** Viewport height */
  height: number;
  
  /** Device scale factor */
  deviceScaleFactor?: number;
  
  /** Whether to respect reduced motion */
  reducedMotion?: 'reduce' | 'no-preference';
  
  /** Color scheme */
  colorScheme?: 'light' | 'dark' | 'no-preference';
  
  /** Forced colors */
  forcedColors?: 'active' | 'none';
  
  /** Locale */
  locale?: string;
  
  /** Timezone */
  timezoneId?: string;
  
  /** Geolocation */
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  
  /** Permissions */
  permissions?: string[];
}

/**
 * Playwright screenshot configuration
 */
export interface PlaywrightScreenshotConfig {
  /** Whether to take screenshots on failure */
  onFailure: boolean;
  
  /** Whether to take screenshots on success */
  onSuccess: boolean;
  
  /** Screenshot mode */
  mode: 'full-page' | 'viewport';
  
  /** Screenshot quality (0-100) */
  quality?: number;
  
  /** Screenshot format */
  format: 'png' | 'jpeg';
  
  /** Screenshot path */
  path?: string;
  
  /** Whether to omit background */
  omitBackground?: boolean;
  
  /** Screenshot animations */
  animations: 'disabled' | 'allow';
}

/**
 * Playwright video configuration
 */
export interface PlaywrightVideoConfig {
  /** Whether to record video */
  enabled: boolean;
  
  /** Video mode */
  mode: 'retain-on-failure' | 'retain-on-first-failure' | 'retain-on-last-failure' | 'retain-all';
  
  /** Video size */
  size: {
    width: number;
    height: number;
  };
  
  /** Video path */
  path?: string;
  
  /** Video quality */
  quality?: number;
}

/**
 * Playwright trace configuration
 */
export interface PlaywrightTraceConfig {
  /** Whether to record trace */
  enabled: boolean;
  
  /** Trace mode */
  mode: 'retain-on-failure' | 'retain-on-first-failure' | 'retain-on-last-failure' | 'retain-all';
  
  /** Trace path */
  path?: string;
  
  /** Trace screenshots */
  screenshots: boolean;
  
  /** Trace snapshots */
  snapshots: boolean;
  
  /** Trace sources */
  sources: boolean;
}

/**
 * Playwright network configuration
 */
export interface PlaywrightNetworkConfig extends NetworkConfig {
  /** Whether to record network activity */
  recordHar?: boolean;
  
  /** HAR file path */
  harPath?: string;
  
  /** Whether to record network activity on failure only */
  recordHarOnFailure?: boolean;
  
  /** Network conditions */
  conditions?: {
    offline: boolean;
    latency: number;
    downloadThroughput: number;
    uploadThroughput: number;
  };
  
  /** Extra HTTP headers */
  extraHTTPHeaders?: Record<string, string>;
  
  /** HTTP credentials */
  httpCredentials?: {
    username: string;
    password: string;
    origin?: string;
  };
}

/**
 * Playwright timeout configuration
 */
export interface PlaywrightTimeoutConfig {
  /** Global timeout */
  global: number;
  
  /** Test timeout */
  test: number;
  
  /** Expect timeout */
  expect: number;
  
  /** Action timeout */
  action: number;
  
  /** Navigation timeout */
  navigation: number;
}

/**
 * Playwright retry configuration
 */
export interface PlaywrightRetryConfig {
  /** Maximum retries */
  maxRetries: number;
  
  /** Retry delay */
  delay: number;
  
  /** Retry backoff */
  backoff: 'linear' | 'exponential';
  
  /** Retry multiplier */
  multiplier: number;
  
  /** Maximum retry delay */
  maxDelay: number;
}

/**
 * Playwright reporter configuration
 */
export interface PlaywrightReporterConfig {
  /** Reporter name */
  name: string;
  
  /** Reporter options */
  options?: Record<string, any>;
  
  /** Reporter output file */
  outputFile?: string;
}

/**
 * Playwright test result
 * 
 * Extends the base test result with Playwright-specific information
 */
export interface PlaywrightTestResult {
  /** Test file path */
  file: string;
  
  /** Test title */
  title: string;
  
  /** Test status */
  status: 'passed' | 'failed' | 'skipped' | 'timedout';
  
  /** Test duration */
  duration: number;
  
  /** Test start time */
  startTime: Date;
  
  /** Test end time */
  endTime: Date;
  
  /** Test error */
  error?: {
    message: string;
    stack?: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
  };
  
  /** Test steps */
  steps: PlaywrightTestStep[];
  
  /** Test attachments */
  attachments: PlaywrightAttachment[];
  
  /** Test retry count */
  retryCount: number;
  
  /** Test annotations */
  annotations: PlaywrightAnnotation[];
}

/**
 * Playwright test step
 */
export interface PlaywrightTestStep {
  /** Step title */
  title: string;
  
  /** Step category */
  category: 'test.step' | 'test.beforeAll' | 'test.afterAll' | 'test.beforeEach' | 'test.afterEach';
  
  /** Step duration */
  duration: number;
  
  /** Step start time */
  startTime: Date;
  
  /** Step end time */
  endTime: Date;
  
  /** Step error */
  error?: {
    message: string;
    stack?: string;
  };
  
  /** Step location */
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Playwright attachment
 */
export interface PlaywrightAttachment {
  /** Attachment name */
  name: string;
  
  /** Attachment content type */
  contentType: string;
  
  /** Attachment path */
  path?: string;
  
  /** Attachment body */
  body?: Buffer;
  
  /** Attachment size */
  size: number;
}

/**
 * Playwright annotation
 */
export interface PlaywrightAnnotation {
  /** Annotation type */
  type: 'skip' | 'fail' | 'slow' | 'fixme' | 'timeout';
  
  /** Annotation description */
  description?: string;
}

/**
 * Default Playwright configuration
 */
export const DEFAULT_PLAYWRIGHT_CONFIG: PlaywrightTestConfig = {
  testFile: '**/*.spec.ts',
  browser: {
    type: 'chromium',
    headless: true,
    args: [],
    ignoreHTTPSErrors: false,
    acceptDownloads: true,
    bypassCSP: false,
    persistentContext: false,
    viewport: {
      width: 1280,
      height: 720,
    },
  },
  viewport: {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    colorScheme: 'no-preference',
    forcedColors: 'none',
  },
  screenshots: {
    onFailure: true,
    onSuccess: false,
    mode: 'full-page',
    quality: 90,
    format: 'png',
    animations: 'disabled',
  },
  video: {
    enabled: false,
    mode: 'retain-on-failure',
    size: {
      width: 1280,
      height: 720,
    },
    quality: 90,
  },
  trace: {
    enabled: false,
    mode: 'retain-on-failure',
    screenshots: true,
    snapshots: true,
    sources: true,
  },
  network: {
    timeout: 30000,
    retries: 3,
    recordHar: false,
    recordHarOnFailure: true,
    conditions: {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
  },
  timeouts: {
    global: 30000,
    test: 30000,
    expect: 5000,
    action: 0,
    navigation: 30000,
  },
  retries: {
    maxRetries: 0,
    delay: 1000,
    backoff: 'exponential',
    multiplier: 2,
    maxDelay: 10000,
  },
  reporters: [
    {
      name: 'list',
    },
  ],
  testDir: './tests/e2e',
  outputDir: './artifacts',
  fullyParallel: true,
  workers: 4,
  forbidOnly: false,
  forbidFocused: false,
  retryOnFailure: false,
};
