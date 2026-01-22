import { countAllDirs } from '/backupbox/src/file-counter.js';

const CACHE_NAME = 'backupbox-v2';
const ASSETS = [
  '/backupbox/',
  '/backupbox/index.html',
  '/backupbox/manifest.json',
  '/backupbox/src/app.js',
  '/backupbox/src/styles.css',
  '/backupbox/src/worker.js',
  '/backupbox/icons/icon-192.svg',
  '/backupbox/icons/icon-512.svg',
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
  self.clients.claim();
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
        return caches.match('/backupbox/index.html');
      }
    })
  );
});

// --- Background Logic (formerly SharedWorker) ---

let currentDirHandles = [];
let watchInterval = null;
const WATCH_MS = 30_000; // 30s interval

async function broadcast(msg) {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage(msg);
  }
}

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  if (!data.cmd) return;

  // Command: Count files immediately
  if (data.cmd === 'count') {
    try {
      const handles = data.dirHandles || (data.dirHandle ? [data.dirHandle] : []);
      console.log(`[ServiceWorker] Received count command for ${handles.length} folders`);

      if (handles.length > 0) {
        // Report progress via side-channel if needed, but here we just wait
        const counted = await countAllDirs(handles);
        console.log(`[ServiceWorker] Count finished: ${counted} files`);

        // Reply to the specific client that asked
        event.source.postMessage({ type: 'done', result: { count: counted } });
        // Or broadcast completion? Usually better to just reply or broadcast.
        // Let's broadcast to keep UI in sync across tabs
        broadcast({ type: 'done', result: { count: counted } });
      } else {
        event.source.postMessage({ type: 'error', message: 'No directory handles provided for count.' });
      }
    } catch (err) {
      event.source.postMessage({ type: 'error', message: String(err) });
    }
  }

  // Command: Start periodic watch
  if (data.cmd === 'startWatch') {
    if (data.dirHandles && Array.isArray(data.dirHandles)) {
      currentDirHandles = data.dirHandles;
    }

    console.log(`[ServiceWorker] startWatch for ${currentDirHandles.length} folders`);

    if (currentDirHandles.length === 0) {
      event.source.postMessage({ type: 'error', message: 'No directory handles provided for watch.' });
      return;
    }

    if (!watchInterval) {
      broadcast({ type: 'started' }); // Notify all tabs we started

      const runScan = async () => {
        try {
          console.log(`[ServiceWorker] Periodic scan running...`);
          const c = await countAllDirs(currentDirHandles);
          broadcast({ type: 'done', result: { count: c } });
        } catch (err) {
          broadcast({ type: 'error', message: String(err) });
        }
      };

      runScan();
      watchInterval = setInterval(runScan, WATCH_MS);
    } else {
      // Already running, just notify this new client
      event.source.postMessage({ type: 'started' });
    }
  }

  // Command: Stop periodic watch
  if (data.cmd === 'stopWatch') {
    if (watchInterval) {
      clearInterval(watchInterval);
      watchInterval = null;
      broadcast({ type: 'stopped' });
    }
  }
});
