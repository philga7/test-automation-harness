#!/usr/bin/env ts-node

/**
 * Comprehensive Demo Runner
 * 
 * This script runs all available demos to showcase the system capabilities
 */

import { runPluginArchitectureDemo } from './PluginArchitectureDemo';
import { runConfigurationDemo } from './ConfigurationDemo';
import { runIntegratedDemo } from './IntegratedDemo';
import { logger } from '../utils/logger';

/**
 * Main function to run all demos
 */
async function main(): Promise<void> {
  try {
    console.log('🎯 Self-Healing Test Automation Harness');
    console.log('🚀 Comprehensive System Demo');
    console.log('=' .repeat(60));
    
    // Demo 1: Configuration Management System
    console.log('\n📋 DEMO 1: Configuration Management System');
    console.log('=' .repeat(60));
    await runConfigurationDemo();
    
    // Demo 2: Plugin Architecture
    console.log('\n🔌 DEMO 2: Plugin Architecture Foundation');
    console.log('=' .repeat(60));
    await runPluginArchitectureDemo();
    
    // Demo 3: Integrated System (Configuration + Plugin Architecture)
    console.log('\n🔗 DEMO 3: Integrated System Demo');
    console.log('=' .repeat(60));
    await runIntegratedDemo();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All demos completed successfully!');
    console.log('\n💡 System Status:');
    console.log('  ✅ Configuration Management: Ready');
    console.log('  ✅ Plugin Architecture: Ready');
    console.log('  ✅ Self-Healing Foundation: Ready');
    console.log('  ✅ Integrated System: Ready');
    console.log('\n🚀 The complete system is ready for development!');
    
  } catch (error) {
    logger.error('💥 Demo failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Demo failed:', errorMessage);
    process.exit(1);
  }
}

// Run all demos if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error in demo:', error);
    process.exit(1);
  });
}
