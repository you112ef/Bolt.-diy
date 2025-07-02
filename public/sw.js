const CACHE_NAME = 'bolt-pwa-cache-v1';
// Add URLs of assets to cache. This list should be expanded.
// For a Remix app, these would typically be the paths to your built JS/CSS bundles.
// These paths are often hashed, so a more dynamic approach might be needed for production,
// e.g., injecting these paths during the build process or using Workbox.
// For now, using common paths and root.
const PRECACHE_ASSETS = [
  '/', // Cache the root page
  // CSS files (example paths, actual paths depend on build output)
  // '/build/assets/global-[hash].css',
  // '/build/assets/xterm-[hash].css',
  // JS files (example paths)
  // '/build/entry.client-[hash].js',
  // '/build/root-[hash].js',
  // '/build/index-[hash].js',
  // Icons and manifest
  '/manifest.json',
  '/logo.svg',
  '/icons/icon.png', // Assuming this path is correct after build
  '/apple-touch-icon.png'
  // Add other important static assets like fonts if any
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page and assets');
        return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, {cache: 'reload'}))); // Force reload from network for precache
      })
      .then(() => {
        console.log('[ServiceWorker] Assets pre-cached successfully');
        return self.skipWaiting(); // Activate worker immediately
      })
      .catch(error => {
        console.error('[ServiceWorker] Pre-caching failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Activated and old caches cleared');
      return self.clients.claim(); // Take control of all clients
    })
  );
});

self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache-first strategy for navigation and assets defined in PRECACHE_ASSETS or similar pattern
  // For other requests (e.g., API calls), you might want network-first or other strategies.
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // console.log('[ServiceWorker] Returning from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[ServiceWorker] Fetching from network:', event.request.url);
        return fetch(event.request).then((networkResponse) => {
          // Optionally, cache new requests dynamically if they are important for offline use
          // Be careful not to cache everything, especially API responses that change often,
          // unless a specific strategy (like stale-while-revalidate) is used.
          // Example: Caching successful GET requests for assets
          if (networkResponse && networkResponse.status === 200 && PRECACHE_ASSETS.includes(new URL(event.request.url).pathname)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return networkResponse;
        }).catch(error => {
          console.error('[ServiceWorker] Fetch failed; returning offline page if available, or error', error);
          // Optionally, return a generic offline fallback page if the request is for navigation
          // if (event.request.mode === 'navigate') {
          //   return caches.match('/offline.html'); // You would need an offline.html page
          // }
          // For other requests, rethrow the error or return a custom error response
          throw error;
        });
      })
  );
});
