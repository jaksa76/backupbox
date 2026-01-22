const CACHE_NAME = 'backupbox-v3';
const ASSETS = [
  '/backupbox/',
  '/backupbox/index.html',
  '/backupbox/manifest.json',
  '/backupbox/src/app.js',
  '/backupbox/src/styles.css',
  '/backupbox/src/backup-engine.js',
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

// --- Background Backup Scheduling ---
// Note: Service Workers can't access FileSystemHandles via postMessage
// So we schedule backups and notify the app to run them

let backupTimeout = null;
const BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between rescans

async function broadcast(msg) {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage(msg);
  }
}

async function triggerBackup() {
  console.log('[ServiceWorker] Triggering backup in app...');
  await broadcast({ type: 'triggerBackup' });
}

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  console.log('[ServiceWorker] Received message:', data);
  
  if (!data.cmd) {
    console.warn('[ServiceWorker] Message has no cmd property');
    return;
  }

  // Command: Schedule next backup
  if (data.cmd === 'scheduleNextBackup') {
    const delayMs = data.delayMs || BACKUP_INTERVAL_MS;
    console.log(`[ServiceWorker] Scheduling next backup in ${delayMs}ms`);
    
    if (backupTimeout) {
      clearTimeout(backupTimeout);
    }
    
    backupTimeout = setTimeout(triggerBackup, delayMs);
  }

  // Command: Cancel scheduled backup
  if (data.cmd === 'stopBackup') {
    if (backupTimeout) {
      clearTimeout(backupTimeout);
      backupTimeout = null;
      console.log('[ServiceWorker] Backup schedule cancelled');
      broadcast({ type: 'stopped' });
    }
  }
});
