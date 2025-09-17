/**
 * PWA Manager
 * Handles Progressive Web App features including manifest and service worker
 * 
 * GREEN PHASE: Minimal implementation to pass tests
 */

class PWAManager {
  constructor(window, options = {}) {
    this.window = window;
    this.options = {
      autoInit: true,
      manifestPath: '/manifest.json',
      serviceWorkerPath: '/sw.js',
      ...options
    };
    
    this.deferredPrompt = null;
    this.isInstalled = false;
    
    if (this.options.autoInit) {
      this.init();
    }
  }

  init() {
    try {
      this.registerManifest();
      this.registerServiceWorker();
      this.setupInstallPrompt();
    } catch (error) {
      console.error('Failed to initialize PWA manager:', error);
    }
  }

  registerManifest() {
    const document = this.window.document;
    if (!document) return;

    // Check if manifest link already exists
    let manifestLink = document.querySelector('link[rel="manifest"]');
    
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = this.options.manifestPath;
      document.head.appendChild(manifestLink);
    }
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in this.window.navigator)) {
      console.warn('Service workers not supported');
      return;
    }

    try {
      const registration = await this.window.navigator.serviceWorker.register(this.options.serviceWorkerPath);
      console.log('Service worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }

  setupInstallPrompt() {
    this.window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.showInstallButton();
    });

    this.window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallButton();
    });
  }

  showInstallButton() {
    // Minimal implementation - just set a flag
    this.canInstall = true;
  }

  hideInstallButton() {
    // Minimal implementation - just set a flag
    this.canInstall = false;
  }

  async promptInstall() {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    
    return result.outcome === 'accepted';
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PWAManager };
} else if (typeof window !== 'undefined') {
  window.PWAManager = PWAManager;
}
