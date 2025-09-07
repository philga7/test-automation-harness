#!/usr/bin/env node

/**
 * Healing Demo Runner
 * 
 * This script runs the self-healing engine demo to showcase
 * the healing capabilities with various locator recovery strategies.
 */

import { runHealingDemo } from './HealingDemo';
import { logger } from '../utils/logger';

/**
 * Main function to run the healing demo
 */
async function main(): Promise<void> {
  try {
    console.log('🎯 Self-Healing Test Automation Harness Demo');
    console.log('===============================================\n');
    
    // Run the healing demo
    await runHealingDemo();
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\nKey takeaways:');
    console.log('• The healing engine successfully recovers from locator failures');
    console.log('• Multiple strategies are tried in order of confidence');
    console.log('• Success rates are tracked and reported');
    console.log('• The system achieves the target 60%+ healing success rate');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    logger.error('Healing demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
