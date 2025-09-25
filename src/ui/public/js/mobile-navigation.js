/**
 * Mobile Navigation Manager
 * Handles mobile navigation menu toggle and interactions
 * 
 * GREEN PHASE: Minimal implementation to pass tests
 */

class MobileNavigation {
  constructor(document, options = {}) {
    this.document = document;
    this.options = {
      autoInit: true,
      ...options
    };
    
    this.navToggle = null;
    this.navMenu = null;
    this.isOpen = false;
    
    if (this.options.autoInit) {
      this.init();
    }
  }

  init() {
    try {
      this.navToggle = this.document.getElementById('nav-toggle');
      this.navMenu = this.document.getElementById('nav-menu');
      
      if (this.navToggle) {
        this.navToggle.addEventListener('click', () => this.toggleMenu());
      }
      
      // Add click outside listener
      this.document.addEventListener('click', (event) => this.handleOutsideClick(event));
      
    } catch (error) {
      console.error('Failed to initialize mobile navigation:', error);
    }
  }

  toggleMenu() {
    if (!this.navMenu) return;
    
    this.isOpen = !this.isOpen;
    this.navMenu.classList.toggle('active');
    
    if (this.navToggle) {
      this.navToggle.setAttribute('aria-expanded', this.isOpen.toString());
    }
  }

  handleOutsideClick(event) {
    if (!this.isOpen || !this.navMenu || !this.navToggle) return;
    
    // Check if click is outside nav menu and toggle button
    if (!this.navMenu.contains(event.target) && !this.navToggle.contains(event.target)) {
      this.closeMenu();
    }
  }

  closeMenu() {
    if (!this.navMenu) return;
    
    this.isOpen = false;
    this.navMenu.classList.remove('active');
    
    if (this.navToggle) {
      this.navToggle.setAttribute('aria-expanded', 'false');
    }
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MobileNavigation };
} else if (typeof window !== 'undefined') {
  window.MobileNavigation = MobileNavigation;
}
