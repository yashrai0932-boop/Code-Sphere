// OneSignal SDK - Must be at the very top for initial evaluation
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Explicit message handler to satisfy 'initial evaluation' requirement
self.addEventListener('message', (event) => {
  // OneSignal's SDK will also add its own listener via importScripts
});

const CACHE_NAME = 'mechatronian-v6';

// Install: skip waiting to activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: clear old caches and take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(names =>
        Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
      ),
      self.clients.claim() // Take control of all pages immediately
    ])
  );
});

// Fetch: network-first strategy — never serve stale JS/CSS
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Never cache-intercept JS, CSS, or asset files
  if (url.pathname.startsWith('/assets/')) return;

  // For navigation requests (HTML pages), use network-first with fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
});
