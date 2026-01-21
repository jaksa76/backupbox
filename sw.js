const CACHE_NAME = 'backupbox-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/app.js',
  '/src/styles.css',
  '/src/worker.js',
  '/src/shared-worker.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Return cached asset or fetch from network
      return cached || fetch(event.request).then(response => {
        // Don't cache if not a success response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      // Fallback for offline access if asset not in cache
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
