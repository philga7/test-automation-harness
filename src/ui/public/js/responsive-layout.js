/**
 * Responsive Layout Manager
 * Handles responsive breakpoints and layout adaptations
 * 
 * GREEN PHASE: Minimal implementation to pass tests
 */

class ResponsiveLayoutManager {
  constructor(window, options = {}) {
    this.window = window;
    this.options = {
      autoInit: true,
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
      },
      ...options
    };
    
    this.currentBreakpoint = 'desktop';
    this.gridElements = [];
    
    if (this.options.autoInit) {
      this.init();
    }
  }

  init() {
    try {
      this.setupGridElements();
      this.updateBreakpoint();
      this.window.addEventListener('resize', () => this.handleResize());
    } catch (error) {
      console.error('Failed to initialize responsive layout manager:', error);
    }
  }

  setupGridElements() {
    const document = this.window.document;
    if (document) {
      this.gridElements = document.querySelectorAll('.status-grid, .execution-grid, .results-grid, .healing-grid, .settings-grid');
    }
  }

  handleResize() {
    this.updateBreakpoint();
    this.applyResponsiveLayout();
  }

  updateBreakpoint() {
    const width = this.window.innerWidth;
    const breakpoints = this.options.breakpoints;
    
    if (width <= breakpoints.mobile) {
      this.currentBreakpoint = 'mobile';
    } else if (width <= breakpoints.tablet) {
      this.currentBreakpoint = 'tablet';
    } else {
      this.currentBreakpoint = 'desktop';
    }
  }

  getCurrentBreakpoint() {
    return this.currentBreakpoint;
  }

  applyResponsiveLayout() {
    if (this.currentBreakpoint === 'mobile') {
      this.applyMobileLayout();
    } else if (this.currentBreakpoint === 'tablet') {
      this.applyTabletLayout();
    } else {
      this.applyDesktopLayout();
    }
  }

  applyMobileLayout() {
    this.gridElements.forEach(element => {
      element.classList.add('mobile-stack');
      element.classList.remove('tablet-grid', 'desktop-grid');
    });
  }

  applyTabletLayout() {
    this.gridElements.forEach(element => {
      element.classList.add('tablet-grid');
      element.classList.remove('mobile-stack', 'desktop-grid');
    });
  }

  applyDesktopLayout() {
    this.gridElements.forEach(element => {
      element.classList.add('desktop-grid');
      element.classList.remove('mobile-stack', 'tablet-grid');
    });
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ResponsiveLayoutManager };
} else if (typeof window !== 'undefined') {
  window.ResponsiveLayoutManager = ResponsiveLayoutManager;
}
