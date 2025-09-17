/**
 * Service Worker for Self-Healing Test Automation Harness
 * Provides offline functionality and caching for PWA features
 * 
 * REFACTOR PHASE: Enhanced service worker with comprehensive caching strategy
 */

const CACHE_NAME = 'test-harness-v1';
const STATIC_CACHE_NAME = 'test-harness-static-v1';
const DYNAMIC_CACHE_NAME = 'test-harness-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/css/dashboard.css',
  '/static/css/overview.css',
  '/static/css/test-execution.css',
  '/static/css/test-results.css',
  '/static/css/healing-stats.css',
  '/static/js/api-service.js',
  '/static/js/dashboard.js',
  '/static/js/dashboard-overview.js',
  '/static/js/test-execution.js',
  '/static/js/test-results.js',
  '/static/js/healing-stats.js',
  '/static/js/mobile-navigation.js',
  '/static/js/touch-optimizer.js',
  '/static/js/responsive-layout.js',
  '/static/js/pwa-manager.js',
  '/static/js/mobile-performance.js',
  '/manifest.json'
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
  '/health',
  '/api/engines',
  '/api/system/status',
  '/api/results',
  '/api/healing/statistics'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(DYNAMIC_CACHE_NAME)
    ]).then(() => {
      console.log('Service Worker installed successfully');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('Service Worker installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith('test-harness-')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (isApiRequest(request)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests with network-first, fallback to cache
  if (isNavigationRequest(request)) {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default strategy for other requests
  event.respondWith(networkFirstStrategy(request));
});

// Network-first strategy for API calls and dynamic content
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page or error response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fallback to network
    const networkResponse = await fetch(request);
    
    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url);
    return new Response('Asset not available', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// Navigation strategy for page requests
async function navigationStrategy(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    
    // Cache successful navigation responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to cached index page
    const indexResponse = await caches.match('/');
    if (indexResponse) {
      return indexResponse;
    }
    
    // Final fallback
    return new Response('Application offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Helper functions
function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         url.pathname === '/health' ||
         API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') ||
         url.pathname === '/manifest.json' ||
         STATIC_ASSETS.includes(url.pathname);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'test-execution-sync') {
    event.waitUntil(syncTestExecution());
  }
  
  if (event.tag === 'healing-stats-sync') {
    event.waitUntil(syncHealingStats());
  }
});

async function syncTestExecution() {
  try {
    // Sync any pending test executions
    console.log('Syncing test execution data...');
    // Implementation would sync offline test execution requests
  } catch (error) {
    console.error('Failed to sync test execution:', error);
  }
}

async function syncHealingStats() {
  try {
    // Sync healing statistics
    console.log('Syncing healing statistics...');
    // Implementation would sync offline healing data
  } catch (error) {
    console.error('Failed to sync healing stats:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Test execution completed',
    icon: '/static/icon-192x192.png',
    badge: '/static/badge-72x72.png',
    tag: 'test-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Results',
        icon: '/static/view-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/static/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Test Automation Harness', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/#results')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    event.waitUntil(updateCache());
  }
});

async function updateCache() {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    await cache.addAll(STATIC_ASSETS);
    console.log('Cache updated successfully');
  } catch (error) {
    console.error('Failed to update cache:', error);
  }
}
