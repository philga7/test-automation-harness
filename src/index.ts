#!/usr/bin/env node

/**
 * Self-Healing Test Automation Harness
 * Main application entry point
 */

import { logger } from './utils/logger';
import { startServer } from './api/server';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting Self-Healing Test Automation Harness...');
    
    // Start the API server
    await startServer();
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch((error) => {
    logger.error('Application startup failed:', error);
    process.exit(1);
  });
}

export default main;
