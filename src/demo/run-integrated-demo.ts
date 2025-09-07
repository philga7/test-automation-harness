#!/usr/bin/env ts-node

/**
 * Integrated Demo Runner
 * 
 * This script runs the integrated demo showing how configuration
 * and plugin architecture work together.
 */

import { runIntegratedDemo } from './IntegratedDemo';
import { logger } from '../utils/logger';

async function main() {
  try {
    console.log('🎯 Self-Healing Test Automation Harness');
    console.log('🔗 Integrated Demo: Configuration + Plugin Architecture\n');
    
    await runIntegratedDemo();
    
    console.log('\n🎉 Integrated demo completed successfully!');
    console.log('\n💡 This demonstrates how:');
    console.log('  ✅ Configuration system powers the plugin architecture');
    console.log('  ✅ YAML settings control test execution behavior');
    console.log('  ✅ Environment-specific configs adapt the system');
    console.log('  ✅ Self-healing uses configuration-driven thresholds');
    
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
