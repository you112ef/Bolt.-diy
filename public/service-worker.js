self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('pwa-cache').then(cache =>
      cache.addAll([
        '/',
        '/index.html'
        // Add other important assets here for precaching
        // e.g., '/styles/global.css', '/scripts/main.js'
        // '/icons/icon-192x192.png', '/icons/icon-512x512.png'
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      return r || fetch(e.request).then(response => {
        // Optional: Cache new requests dynamically
        // return caches.open('pwa-cache-dynamic').then(cache => {
        //   cache.put(e.request, response.clone());
        //   return response;
        // });
        return response;
      });
    })
  );
});
