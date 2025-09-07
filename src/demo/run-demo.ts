#!/usr/bin/env ts-node

/**
 * Plugin Architecture Demo Runner
 * 
 * This script runs the plugin architecture demo to prove that the
 * foundation is working correctly.
 */

import { runPluginArchitectureDemo } from './PluginArchitectureDemo';
import { logger } from '../utils/logger';

/**
 * Main function to run the demo
 */
async function main(): Promise<void> {
  try {
    logger.info('🎯 Starting Plugin Architecture Foundation Demo');
    logger.info('================================================');
    
    await runPluginArchitectureDemo();
    
    logger.info('================================================');
    logger.info('🎉 Plugin Architecture Foundation Demo completed successfully!');
    logger.info('The plugin architecture is working correctly and ready for development.');
  } catch (error) {
    logger.error('💥 Plugin Architecture Foundation Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error in demo:', error);
    process.exit(1);
  });
}
