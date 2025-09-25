/**
 * Mobile Performance Optimizer
 * Handles performance optimizations specific to mobile devices
 * 
 * GREEN PHASE: Minimal implementation to pass tests
 */

class MobilePerformanceOptimizer {
  constructor(document, options = {}) {
    this.document = document;
    this.options = {
      autoInit: true,
      enableLazyLoading: true,
      enableImageOptimization: true,
      ...options
    };
    
    this.images = [];
    this.lazyElements = [];
    
    if (this.options.autoInit) {
      this.init();
    }
  }

  init() {
    try {
      this.setupImages();
      if (this.options.enableLazyLoading) {
        this.enableLazyLoading();
      }
      if (this.options.enableImageOptimization) {
        this.optimizeImages();
      }
    } catch (error) {
      console.error('Failed to initialize mobile performance optimizer:', error);
    }
  }

  setupImages() {
    this.images = this.document.querySelectorAll('img');
  }

  enableLazyLoading() {
    // Enable lazy loading for images and other elements
    this.lazyElements = this.document.querySelectorAll('[data-lazy]');
    
    this.lazyElements.forEach(element => {
      element.loading = 'lazy';
    });
  }

  optimizeImages() {
    this.images.forEach(image => {
      // Set lazy loading
      image.loading = 'lazy';
      
      // Add responsive image attributes if not present
      if (!image.sizes) {
        image.sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
      }
      
      // Add optimization class
      image.classList.add('optimized-image');
    });
  }

  preloadCriticalResources() {
    const criticalResources = [
      '/static/css/dashboard.css',
      '/static/js/api-service.js'
    ];

    criticalResources.forEach(resource => {
      const link = this.document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'script';
      this.document.head.appendChild(link);
    });
  }

  enableResourceHints() {
    // Add DNS prefetch for external resources
    const externalDomains = [
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net'
    ];

    externalDomains.forEach(domain => {
      const link = this.document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      this.document.head.appendChild(link);
    });
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MobilePerformanceOptimizer };
} else if (typeof window !== 'undefined') {
  window.MobilePerformanceOptimizer = MobilePerformanceOptimizer;
}
