/**
 * Playwright Engine Demo
 * 
 * This demo script demonstrates the Playwright test engine integration
 * with the plugin architecture and self-healing capabilities.
 */

import { PlaywrightTestEngine } from '../engines/PlaywrightTestEngine';
import { TestConfig, EngineConfig, TestType } from '../types';
import { logger } from '../utils/logger';

/**
 * Run Playwright engine demo
 */
async function runPlaywrightDemo(): Promise<void> {
  try {
    logger.info('🚀 Starting Playwright Engine Demo');
    
    // Create Playwright test engine
    const playwrightEngine = new PlaywrightTestEngine();
    
    // Configure the engine
    const engineConfig: EngineConfig = {
      engine: 'playwright',
      version: '1.0.0',
      settings: {
        playwright: {
          testFile: 'tests/e2e/example.spec.ts',
          browser: {
            type: 'chromium',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          },
          viewport: {
            width: 1280,
            height: 720,
          },
          screenshots: {
            onFailure: true,
            onSuccess: false,
            mode: 'full-page',
            format: 'png',
            animations: 'disabled',
          },
          video: {
            enabled: false,
            mode: 'retain-on-failure',
            size: { width: 1280, height: 720 },
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
          },
          timeouts: {
            global: 30000,
            test: 30000,
            expect: 5000,
            action: 0,
            navigation: 30000,
          },
          retries: {
            maxRetries: 2,
            delay: 1000,
            backoff: 'exponential',
            multiplier: 2,
            maxDelay: 10000,
          },
          reporters: [
            { name: 'list' },
            { name: 'json', outputFile: 'artifacts/reports/playwright-results.json' },
          ],
          testDir: './tests/e2e',
          outputDir: './artifacts',
          fullyParallel: true,
          workers: 2,
          forbidOnly: false,
          forbidFocused: false,
          retryOnFailure: true,
        },
      },
    };
    
    // Initialize the engine
    logger.info('🔧 Initializing Playwright engine...');
    await playwrightEngine.initialize(engineConfig);
    
    // Check engine health
    logger.info('🏥 Checking engine health...');
    const health = await playwrightEngine.getHealth();
    logger.info(`Engine health: ${health.status} - ${health.message}`);
    
    // Create test configuration
    const testConfig: TestConfig = {
      name: 'Example E2E Test',
      type: 'e2e' as TestType,
      filePath: 'tests/e2e/example.spec.ts',
      timeout: 30000,
      environment: 'demo',
      parameters: {
        url: 'https://example.com',
        steps: [
          {
            type: 'navigate',
            url: 'https://example.com',
            name: 'Navigate to Example.com',
          },
          {
            type: 'wait',
            selector: 'h1',
            name: 'Wait for page title',
          },
          {
            type: 'screenshot',
            name: 'homepage-screenshot',
          },
        ],
      },
      engineConfig,
      healingConfig: {
        enabled: true,
        confidenceThreshold: 0.7,
        maxAttempts: 3,
        strategies: ['element-healing', 'timeout-healing', 'retry-healing'],
        timeout: 10000,
      },
      retryConfig: {
        maxRetries: 2,
        delay: 1000,
        backoffMultiplier: 2,
        maxDelay: 5000,
      },
    };
    
    // Execute the test
    logger.info('🧪 Executing E2E test...');
    const startTime = Date.now();
    
    try {
      const result = await playwrightEngine.execute(testConfig);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logger.info(`✅ Test execution completed in ${duration}ms`);
      logger.info(`Test status: ${result.status}`);
      logger.info(`Test duration: ${result.duration}ms`);
      logger.info(`Errors: ${result.errors.length}`);
      logger.info(`Artifacts: ${result.artifacts.length}`);
      
      if (result.errors.length > 0) {
        logger.warn('⚠️ Test completed with errors:');
        result.errors.forEach((error: any, index: number) => {
          logger.warn(`  ${index + 1}. ${error.message}`);
        });
      }
      
      if (result.artifacts.length > 0) {
        logger.info('📁 Test artifacts generated:');
        result.artifacts.forEach((artifact: any, index: number) => {
          logger.info(`  ${index + 1}. ${artifact.type}: ${artifact.path}`);
        });
      }
      
      // Demonstrate healing capabilities if test failed
      if (result.status === 'failed' && result.errors.length > 0) {
        logger.info('🔧 Demonstrating self-healing capabilities...');
        
        const firstError = result.errors[0];
        if (firstError) {
          const failure = {
            id: `failure-${Date.now()}`,
            testId: result.id,
            type: firstError.type,
            message: firstError.message,
            ...(firstError.stack && { stack: firstError.stack }),
            timestamp: new Date(),
            context: {
              testConfig,
              environment: {
                os: process.platform,
                nodeVersion: process.version,
                environment: 'demo',
                availableMemory: 0,
                cpuCount: 0,
              },
              custom: {},
            },
            previousAttempts: [],
          };
        
          const healingResult = await playwrightEngine.heal(failure);
          logger.info(`🔧 Healing attempt completed: ${healingResult.success ? 'SUCCESS' : 'FAILED'}`);
          logger.info(`Healing confidence: ${(healingResult.confidence * 100).toFixed(1)}%`);
          logger.info(`Healing actions: ${healingResult.actions.length}`);
          logger.info(`Healing message: ${healingResult.message}`);
        }
      }
      
    } catch (error) {
      logger.error('❌ Test execution failed:', error);
    }
    
    // Clean up
    logger.info('🧹 Cleaning up Playwright engine...');
    await playwrightEngine.cleanup();
    
    logger.info('✅ Playwright Engine Demo completed successfully!');
    
  } catch (error) {
    logger.error('❌ Playwright Engine Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runPlaywrightDemo().catch((error) => {
    logger.error('Demo execution failed:', error);
    process.exit(1);
  });
}

export { runPlaywrightDemo };
