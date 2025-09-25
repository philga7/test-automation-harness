/**
 * Mobile Responsive Design Tests
 * Following strict TDD methodology: RED-GREEN-REFACTOR
 * 
 * Testing mobile navigation, touch interactions, responsive layouts,
 * and PWA features for the Self-Healing Test Automation Harness
 */

describe('Mobile Responsive Design', () => {
  let mobileResponsiveMockDocument: any;
  let mobileResponsiveMockWindow: any;
  let mobileResponsiveMockElement: any;
  let mobileResponsiveMockNavToggle: any;
  let mobileResponsiveMockNavMenu: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create comprehensive DOM mocks for mobile testing
    mobileResponsiveMockElement = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      click: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn()
      },
      style: {},
      textContent: '',
      innerHTML: '',
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      })),
      offsetWidth: 0,
      offsetHeight: 0,
      scrollWidth: 0,
      scrollHeight: 0,
      clientWidth: 0,
      clientHeight: 0
    };

    mobileResponsiveMockNavToggle = {
      ...mobileResponsiveMockElement,
      id: 'nav-toggle',
      className: 'nav-toggle'
    };

    mobileResponsiveMockNavMenu = {
      ...mobileResponsiveMockElement,
      id: 'nav-menu',
      className: 'nav-menu'
    };

    mobileResponsiveMockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      createElement: jest.fn(() => ({ ...mobileResponsiveMockElement })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      body: {
        ...mobileResponsiveMockElement,
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        insertAdjacentHTML: jest.fn()
      },
      head: {
        ...mobileResponsiveMockElement,
        appendChild: jest.fn()
      },
      documentElement: {
        ...mobileResponsiveMockElement,
        clientWidth: 1024,
        clientHeight: 768
      }
    };

    mobileResponsiveMockWindow = {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      matchMedia: jest.fn(),
      getComputedStyle: jest.fn(() => ({})),
      requestAnimationFrame: jest.fn((cb) => setTimeout(cb, 16)),
      cancelAnimationFrame: jest.fn(),
      navigator: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        serviceWorker: {
          register: jest.fn(),
          ready: Promise.resolve({
            update: jest.fn(),
            unregister: jest.fn()
          })
        }
      },
      location: {
        href: 'http://localhost:3000',
        protocol: 'http:',
        host: 'localhost:3000'
      }
    };

    // Set up global mocks
    (global as any).document = mobileResponsiveMockDocument;
    (global as any).window = mobileResponsiveMockWindow;
  });

  afterEach(() => {
    // Clean up global mocks
    delete (global as any).document;
    delete (global as any).window;
  });

  describe('Mobile Navigation Menu', () => {
    // GREEN PHASE: Tests should now pass with implementations
    test('should have mobile navigation toggle functionality', () => {
      const { MobileNavigation } = require('../../src/ui/public/js/mobile-navigation.js');
      const mobileNav = new MobileNavigation(mobileResponsiveMockDocument, { autoInit: false });
      expect(typeof mobileNav.toggleMenu).toBe('function');
    });

    test('should toggle navigation visibility when hamburger menu is clicked', () => {
      const { MobileNavigation } = require('../../src/ui/public/js/mobile-navigation.js');
      
      mobileResponsiveMockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'nav-toggle') return mobileResponsiveMockNavToggle;
        if (id === 'nav-menu') return mobileResponsiveMockNavMenu;
        return null;
      });

      const mobileNav = new MobileNavigation(mobileResponsiveMockDocument, { autoInit: false });
      mobileNav.init();

      // Simulate hamburger menu click
      mobileNav.toggleMenu();

      // Should toggle the active class on nav menu
      expect(mobileResponsiveMockNavMenu.classList.toggle).toHaveBeenCalledWith('active');
    });

    test('should close navigation when clicking outside', () => {
      const { MobileNavigation } = require('../../src/ui/public/js/mobile-navigation.js');
      
      mobileResponsiveMockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'nav-toggle') return mobileResponsiveMockNavToggle;
        if (id === 'nav-menu') return mobileResponsiveMockNavMenu;
        return null;
      });

      // Mock contains method to simulate outside click
      mobileResponsiveMockNavMenu.contains = jest.fn(() => false);
      mobileResponsiveMockNavToggle.contains = jest.fn(() => false);

      const mobileNav = new MobileNavigation(mobileResponsiveMockDocument, { autoInit: false });
      mobileNav.init();
      mobileNav.isOpen = true; // Set menu as open

      // Simulate click outside navigation
      const outsideClickEvent = { target: { contains: jest.fn(() => false) } };
      mobileNav.handleOutsideClick(outsideClickEvent);

      expect(mobileResponsiveMockNavMenu.classList.remove).toHaveBeenCalledWith('active');
    });
  });

  describe('Touch-Friendly Interactions', () => {
    test('should have minimum touch target size validation', () => {
      const { TouchOptimizer } = require('../../src/ui/public/js/touch-optimizer.js');
      
      const touchOptimizer = new TouchOptimizer(mobileResponsiveMockDocument, { autoInit: false });
      
      // Should ensure minimum 44px touch targets
      expect(touchOptimizer.validateTouchTargets).toBeDefined();
      expect(typeof touchOptimizer.validateTouchTargets).toBe('function');
    });

    test('should provide visual feedback for touch interactions', () => {
      const { TouchOptimizer } = require('../../src/ui/public/js/touch-optimizer.js');
      
      const mockButton = { ...mobileResponsiveMockElement };
      mobileResponsiveMockDocument.querySelectorAll.mockReturnValue([mockButton]);

      const touchOptimizer = new TouchOptimizer(mobileResponsiveMockDocument, { autoInit: false });
      touchOptimizer.init();

      // Simulate touch start
      const touchEvent = { type: 'touchstart', target: mockButton };
      touchOptimizer.handleTouchStart(touchEvent);

      expect(mockButton.classList.add).toHaveBeenCalledWith('touch-active');
    });
  });

  describe('Responsive Layout Breakpoints', () => {
    test('should adapt layout to mobile breakpoints', () => {
      const { ResponsiveLayoutManager } = require('../../src/ui/public/js/responsive-layout.js');
      
      const layoutManager = new ResponsiveLayoutManager(mobileResponsiveMockWindow, { autoInit: false });

      // Simulate mobile viewport
      mobileResponsiveMockWindow.innerWidth = 375;
      mobileResponsiveMockWindow.innerHeight = 667;

      layoutManager.handleResize();

      expect(layoutManager.getCurrentBreakpoint()).toBe('mobile');
    });

    test('should stack grid layouts on mobile', () => {
      const { ResponsiveLayoutManager } = require('../../src/ui/public/js/responsive-layout.js');
      
      const mockGrid = { ...mobileResponsiveMockElement, className: 'status-grid' };
      mobileResponsiveMockWindow.document = mobileResponsiveMockDocument;
      mobileResponsiveMockDocument.querySelectorAll.mockReturnValue([mockGrid]);

      const layoutManager = new ResponsiveLayoutManager(mobileResponsiveMockWindow, { autoInit: false });
      layoutManager.init();

      // Simulate mobile viewport
      mobileResponsiveMockWindow.innerWidth = 375;
      layoutManager.applyMobileLayout();

      expect(mockGrid.classList.add).toHaveBeenCalledWith('mobile-stack');
    });
  });

  describe('Progressive Web App (PWA) Features', () => {
    test('should register PWA manifest', () => {
      const { PWAManager } = require('../../src/ui/public/js/pwa-manager.js');
      
      const pwaManager = new PWAManager(mobileResponsiveMockWindow, { autoInit: false });

      expect(pwaManager.registerManifest).toBeDefined();
      expect(typeof pwaManager.registerManifest).toBe('function');
    });

    test('should register service worker for offline functionality', async () => {
      const { PWAManager } = require('../../src/ui/public/js/pwa-manager.js');
      
      const pwaManager = new PWAManager(mobileResponsiveMockWindow, { autoInit: false });
      await pwaManager.registerServiceWorker();

      expect(mobileResponsiveMockWindow.navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    test('should handle install prompt', () => {
      const { PWAManager } = require('../../src/ui/public/js/pwa-manager.js');
      
      const pwaManager = new PWAManager(mobileResponsiveMockWindow, { autoInit: false });
      pwaManager.setupInstallPrompt();

      // Simulate beforeinstallprompt event
      const installEvent = { preventDefault: jest.fn(), prompt: jest.fn() };
      const beforeInstallHandler = mobileResponsiveMockWindow.addEventListener.mock.calls
        .find((call: any) => call[0] === 'beforeinstallprompt')[1];
      
      beforeInstallHandler(installEvent);

      expect(installEvent.preventDefault).toHaveBeenCalled();
      expect(pwaManager.deferredPrompt).toBe(installEvent);
    });
  });

  describe('Mobile Performance Optimizations', () => {
    test('should implement lazy loading for mobile', () => {
      const { MobilePerformanceOptimizer } = require('../../src/ui/public/js/mobile-performance.js');
      
      const performanceOptimizer = new MobilePerformanceOptimizer(mobileResponsiveMockDocument, { autoInit: false });

      expect(performanceOptimizer.enableLazyLoading).toBeDefined();
      expect(typeof performanceOptimizer.enableLazyLoading).toBe('function');
    });

    test('should optimize images to reduce data usage on mobile', () => {
      const { MobilePerformanceOptimizer } = require('../../src/ui/public/js/mobile-performance.js');
      
      const mockImage = { 
        ...mobileResponsiveMockElement, 
        src: '', 
        loading: '', 
        sizes: '',
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn(),
          contains: jest.fn()
        }
      };
      mobileResponsiveMockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'img') return [mockImage];
        return [];
      });

      const performanceOptimizer = new MobilePerformanceOptimizer(mobileResponsiveMockDocument, { autoInit: false });
      performanceOptimizer.setupImages();
      performanceOptimizer.optimizeImages();

      expect(mockImage.loading).toBe('lazy');
      expect(mockImage.classList.add).toHaveBeenCalledWith('optimized-image');
    });
  });
});
