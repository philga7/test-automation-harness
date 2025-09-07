#!/usr/bin/env node

/**
 * Configuration Demo Runner
 * Run this script to see the configuration system in action
 */

import { runConfigurationDemo } from './ConfigurationDemo';
import { logger } from '../utils/logger';

async function main() {
  try {
    console.log('🎯 Self-Healing Test Automation Harness');
    console.log('📋 Configuration Management System Demo\n');
    
    await runConfigurationDemo();
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Modify config files in ./config/ directory');
    console.log('  2. Set environment variables to override settings');
    console.log('  3. Use the ConfigurationManager in your application');
    console.log('  4. Check out the comprehensive schemas in src/config/schemas.ts');
    
  } catch (error) {
    logger.error('Demo failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Demo failed:', errorMessage);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  main();
}
