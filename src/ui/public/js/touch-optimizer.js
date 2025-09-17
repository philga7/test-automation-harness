/**
 * Touch Optimizer
 * Handles touch-friendly interactions and button sizing
 * 
 * GREEN PHASE: Minimal implementation to pass tests
 */

class TouchOptimizer {
  constructor(document, options = {}) {
    this.document = document;
    this.options = {
      autoInit: true,
      minTouchSize: 44, // 44px minimum touch target size
      ...options
    };
    
    this.touchElements = [];
    
    if (this.options.autoInit) {
      this.init();
    }
  }

  init() {
    try {
      this.setupTouchElements();
      this.validateTouchTargets();
      this.addTouchFeedback();
    } catch (error) {
      console.error('Failed to initialize touch optimizer:', error);
    }
  }

  setupTouchElements() {
    // Find all interactive elements
    const selectors = [
      'button',
      'a',
      '[role="button"]',
      'input[type="button"]',
      'input[type="submit"]',
      '.btn'
    ];
    
    this.touchElements = this.document.querySelectorAll(selectors.join(', '));
  }

  validateTouchTargets() {
    this.touchElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const minSize = this.options.minTouchSize;
      
      if (rect.width < minSize || rect.height < minSize) {
        element.style.minWidth = `${minSize}px`;
        element.style.minHeight = `${minSize}px`;
        element.classList.add('touch-optimized');
      }
    });
  }

  addTouchFeedback() {
    this.touchElements.forEach(element => {
      element.addEventListener('touchstart', (event) => this.handleTouchStart(event));
      element.addEventListener('touchend', (event) => this.handleTouchEnd(event));
      element.addEventListener('touchcancel', (event) => this.handleTouchEnd(event));
    });
  }

  handleTouchStart(event) {
    const element = event.target;
    if (element) {
      element.classList.add('touch-active');
    }
  }

  handleTouchEnd(event) {
    const element = event.target;
    if (element) {
      element.classList.remove('touch-active');
    }
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TouchOptimizer };
} else if (typeof window !== 'undefined') {
  window.TouchOptimizer = TouchOptimizer;
}
