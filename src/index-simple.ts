#!/usr/bin/env node

/**
 * Simplified entry point for Docker containerization testing
 */

import { logger } from './utils/logger';
import { startSimpleServer } from './api/server-simple';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting Simplified Self-Healing Test Automation Harness...');
    
    // Start the simplified API server
    await startSimpleServer();
    
  } catch (error) {
    logger.error('Failed to start simplified application:', error);
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
