/**
 * Minimal Plugin Integration Test - TRUE TDD approach
 * 
 * This demonstrates the core plugin registration pattern using minimal implementations
 */

import { TestEngineFactory } from '../../src/core/TestEngineFactory';
import { PluginRegistry } from '../../src/core/PluginRegistry';
import { TestGenerator } from '../../src/engines/TestGenerator';
import { TestExporter } from '../../src/engines/TestExporter';

describe('Minimal Plugin Integration', () => {
  let factory: TestEngineFactory;
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
    factory = new TestEngineFactory(registry);
  });

  it('should demonstrate that plugin registration pattern works', () => {
    // This shows the core pattern - registering a constructor with the factory
    
    // We can register our minimal TestGenerator
    expect(() => {
      factory.registerEngineConstructor('test-generator', TestGenerator);
    }).not.toThrow();
    
    // We can register our minimal TestExporter  
    expect(() => {
      factory.registerEngineConstructor('test-exporter', TestExporter);
    }).not.toThrow();
    
    // The factory knows about these engines
    expect(factory.isEngineTypeAvailable('test-generator')).toBe(true);
    expect(factory.isEngineTypeAvailable('test-exporter')).toBe(true);
    
    // They appear in the available types
    const availableTypes = factory.getAvailableEngineTypes();
    expect(availableTypes).toContain('test-generator');
    expect(availableTypes).toContain('test-exporter');
  });

  it('should show that the minimal classes have expected properties', () => {
    const generator = new TestGenerator();
    expect(generator.name).toBe('test-generator');
    expect(generator.version).toBe('1.0.0');
    expect(generator.testType).toBe('integration');
    
    const exporter = new TestExporter();
    expect(exporter.name).toBe('test-exporter');
    expect(exporter.version).toBe('1.0.0');
    expect(exporter.testType).toBe('unit');
    expect(exporter.supportedFormats).toEqual(['json']);
  });
});
