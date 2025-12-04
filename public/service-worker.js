const CACHE_NAME = 'dot-hunter-v3';

// Only cache STABLE static assets
const ASSETS_TO_CACHE = [
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
];

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // DO NOT cache Vite's JS/CSS bundles (they change every build)
  if (url.pathname.startsWith('/assets/')) {
    return; // always fetch from network
  }

  // For PWA static assets, use cache-first
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request)
    )
  );
});
