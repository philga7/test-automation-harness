/**
 * Core module exports
 * 
 * This file exports all core components of the plugin architecture.
 */

// Export interfaces and types
export * from '../types';

// Export core classes
export { TestEngine } from './TestEngine';
export { HealingStrategy } from './HealingStrategy';
export { PluginRegistry } from './PluginRegistry';
export { TestEngineFactory } from './TestEngineFactory';
export { DependencyContainer, container } from './DependencyContainer';

// Export demo components
export { PluginArchitectureDemo, runPluginArchitectureDemo } from '../demo/PluginArchitectureDemo';

// Export engines
export { HelloWorldEngine } from '../engines/HelloWorldEngine';

// Export healing strategies
export { SimpleHealingStrategy } from '../healing/SimpleHealingStrategy';
