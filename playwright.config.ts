import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Self-Healing Test Automation Harness
 * 
 * This configuration file defines how Playwright should run our E2E tests,
 * including browser settings, test directories, and reporting options.
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Output directory for test results
  outputDir: './artifacts/test-results',
  
  // Global test timeout
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: './artifacts/reports/html' }],
    ['json', { outputFile: './artifacts/reports/results.json' }],
    ['junit', { outputFile: './artifacts/reports/results.xml' }],
  ],
  
  // Global setup and teardown
  // globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    // baseURL: 'http://127.0.0.1:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Record HAR on failure
    // recordHar: {
    //   mode: 'retain-on-failure',
    //   urlFilter: '**/api/**',
    // },
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Test against branded browsers
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  
  // Run your local dev server before starting the tests
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
