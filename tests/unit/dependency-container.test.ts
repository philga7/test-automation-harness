/**
 * Unit tests for DependencyContainer
 */

import { DependencyContainer } from '../../src/core/DependencyContainer';

describe('DependencyContainer', () => {
  let container: DependencyContainer;

  beforeEach(() => {
    container = new DependencyContainer();
  });

  afterEach(() => {
    container.clear();
  });

  describe('Dependency Registration', () => {
    it('should register a dependency', () => {
      class TestService {
        constructor() {}
      }

      container.register('testService', TestService);
      
      expect(container.isRegistered('testService')).toBe(true);
    });

    it('should register a singleton dependency', () => {
      class TestService {
        constructor() {}
      }

      container.registerSingleton('testService', TestService);
      
      expect(container.isRegistered('testService')).toBe(true);
    });

    it('should register an instance', () => {
      const instance = { name: 'test' };
      
      container.registerInstance('testInstance', instance);
      
      expect(container.isRegistered('testInstance')).toBe(true);
    });

    it('should register a factory function', () => {
      const factory = () => ({ name: 'factory-created' });
      
      container.register('testFactory', factory);
      
      expect(container.isRegistered('testFactory')).toBe(true);
    });
  });

  describe('Dependency Resolution', () => {
    it('should resolve a registered dependency', () => {
      class TestService {
        public name = 'test-service';
      }

      container.register('testService', TestService);
      
      const instance = container.resolve<TestService>('testService');
      
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.name).toBe('test-service');
    });

    it('should resolve a singleton dependency', () => {
      class TestService {
        public id = Math.random();
      }

      container.registerSingleton('testService', TestService);
      
      const instance1 = container.resolve<TestService>('testService');
      const instance2 = container.resolve<TestService>('testService');
      
      expect(instance1).toBe(instance2); // Same instance
      expect(instance1.id).toBe(instance2.id);
    });

    it('should resolve a registered instance', () => {
      const instance = { name: 'test-instance' };
      
      container.registerInstance('testInstance', instance);
      
      const resolved = container.resolve('testInstance');
      
      expect(resolved).toBe(instance);
    });

    it('should resolve a factory function', () => {
      const factory = () => ({ name: 'factory-created', id: Math.random() });
      
      container.register('testFactory', factory);
      
      const instance = container.resolve<any>('testFactory');
      
      expect(instance.name).toBe('factory-created');
      expect(instance.id).toBeDefined();
    });

    it('should throw error for non-existent dependency', () => {
      expect(() => {
        container.resolve('non-existent');
      }).toThrow('Dependency not found: non-existent');
    });
  });

  describe('Dependency Dependencies', () => {
    it('should resolve dependencies with constructor dependencies', () => {
      class Dependency {
        public name = 'dependency';
      }

      class Service {
        constructor(public dependency: Dependency) {}
      }

      container.register('dependency', Dependency);
      container.register('service', Service, { dependencies: ['dependency'] });
      
      const service = container.resolve<Service>('service');
      
      expect(service).toBeInstanceOf(Service);
      expect(service.dependency).toBeInstanceOf(Dependency);
      expect(service.dependency.name).toBe('dependency');
    });

    it('should resolve dependencies with factory dependencies', () => {
      const dependencyFactory = () => ({ name: 'dependency' });
      
      class Service {
        constructor(public dependency: any) {}
      }

      container.register('dependency', dependencyFactory);
      container.register('service', Service, { dependencies: ['dependency'] });
      
      const service = container.resolve<Service>('service');
      
      expect(service).toBeInstanceOf(Service);
      expect(service.dependency.name).toBe('dependency');
    });

    it('should handle circular dependencies', () => {
      class ServiceA {
        constructor(public serviceB: ServiceB) {}
      }

      class ServiceB {
        constructor(public serviceA: ServiceA) {}
      }

      container.register('serviceA', ServiceA, { dependencies: ['serviceB'] });
      container.register('serviceB', ServiceB, { dependencies: ['serviceA'] });
      
      expect(() => {
        container.resolve('serviceA');
      }).toThrow('Circular dependency detected: serviceA');
    });
  });

  describe('Eager Initialization', () => {
    it('should initialize eager dependencies', async () => {
      class EagerService {
        public initialized = false;
        constructor() {
          this.initialized = true;
        }
      }

      container.register('eagerService', EagerService, { eager: true });
      
      await container.initializeEagerDependencies();
      
      const service = container.resolve<EagerService>('eagerService');
      expect(service.initialized).toBe(true);
    });

    it('should initialize eager dependencies in correct order', async () => {
      const initOrder: string[] = [];

      class Dependency {
        constructor() {
          initOrder.push('dependency');
        }
      }

      class Service {
        constructor(public dependency: Dependency) {
          initOrder.push('service');
        }
      }

      container.register('dependency', Dependency, { eager: true, singleton: true });
      container.register('service', Service, { 
        eager: true, 
        dependencies: ['dependency'],
        singleton: true
      });
      
      await container.initializeEagerDependencies();
      
      expect(initOrder).toEqual(['dependency', 'service']);
    });

    it('should handle eager initialization errors', async () => {
      class FailingService {
        constructor() {
          throw new Error('Initialization failed');
        }
      }

      container.register('failingService', FailingService, { eager: true });
      
      await expect(container.initializeEagerDependencies()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Utility Methods', () => {
    it('should check if dependency is registered', () => {
      class TestService {
        constructor() {}
      }

      expect(container.isRegistered('testService')).toBe(false);
      
      container.register('testService', TestService);
      
      expect(container.isRegistered('testService')).toBe(true);
    });

    it('should get all registered dependencies', () => {
      class TestService1 {
        constructor() {}
      }

      class TestService2 {
        constructor() {}
      }

      container.register('testService1', TestService1);
      container.register('testService2', TestService2);
      container.registerInstance('testInstance', {});
      
      const registered = container.getRegisteredDependencies();
      
      expect(registered).toContain('testService1');
      expect(registered).toContain('testService2');
      expect(registered).toContain('testInstance');
    });

    it('should clear all dependencies', () => {
      class TestService {
        constructor() {}
      }

      container.register('testService', TestService);
      container.registerInstance('testInstance', {});
      
      expect(container.isRegistered('testService')).toBe(true);
      expect(container.isRegistered('testInstance')).toBe(true);
      
      container.clear();
      
      expect(container.isRegistered('testService')).toBe(false);
      expect(container.isRegistered('testInstance')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle constructor errors gracefully', () => {
      class FailingService {
        constructor() {
          throw new Error('Constructor failed');
        }
      }

      container.register('failingService', FailingService);
      
      expect(() => {
        container.resolve('failingService');
      }).toThrow('Failed to create dependency instance: Error: Constructor failed');
    });

    it('should handle factory errors gracefully', () => {
      const failingFactory = () => {
        throw new Error('Factory failed');
      };

      container.register('failingFactory', failingFactory);
      
      expect(() => {
        container.resolve('failingFactory');
      }).toThrow('Factory failed');
    });
  });
});
