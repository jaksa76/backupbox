import { countAllDirs } from './file-counter.js';

const ports = new Set();
let currentDirHandles = [];
let watchInterval = null;
const WATCH_MS = 30_000; // 30s interval

function broadcast(msg) {
  for (const p of ports) p.postMessage(msg);
}

self.onconnect = function (e) {
  const port = e.ports[0];
  ports.add(port);

  port.onmessage = async (evt) => {
    const data = evt.data || {};
    if (!data.cmd) return;

    // Command: Count files immediately
    if (data.cmd === 'count') {
      try {
        const handles = data.dirHandles || (data.dirHandle ? [data.dirHandle] : []);
        console.log(`[SharedWorker] Received count command for ${handles.length} folders`);

        if (handles.length > 0) {
          const counted = await countAllDirs(handles);
          console.log(`[SharedWorker] Count finished: ${counted} files`);
          port.postMessage({ type: 'done', result: { count: counted } });
        } else {
          port.postMessage({ type: 'error', message: 'No directory handles provided for count.' });
        }
      } catch (err) {
        port.postMessage({ type: 'error', message: String(err) });
      }
    }

    // Command: Start periodic watch
    if (data.cmd === 'startWatch') {
      // Update global handles if provided, otherwise use existing
      if (data.dirHandles && Array.isArray(data.dirHandles)) {
        currentDirHandles = data.dirHandles;
      } else if (data.dirHandle) {
        currentDirHandles = [data.dirHandle];
      }

      console.log(`[SharedWorker] startWatch for ${currentDirHandles.length} folders`);

      if (currentDirHandles.length === 0) {
        const receivedKeys = Object.keys(data).join(',');
        const isArray = Array.isArray(data.dirHandles);
        const len = data.dirHandles ? data.dirHandles.length : 'N/A';
        port.postMessage({
          type: 'error',
          message: `No directory handle provided for watch. Keys: ${receivedKeys}, IsArray: ${isArray}, Length: ${len}`
        });
        return;
      }

      // Start the interval if not already running
      if (!watchInterval) {
        broadcast({ type: 'watchStarted' });

        const runScan = async () => {
          try {
            console.log(`[SharedWorker] Periodic scan running for ${currentDirHandles.length} folders...`);
            const c = await countAllDirs(currentDirHandles);
            console.log(`[SharedWorker] Scan result: ${c} files`);
            broadcast({ type: 'done', result: { count: c } });
          } catch (err) {
            broadcast({ type: 'error', message: String(err) });
          }
        };

        runScan(); // Run once immediately
        watchInterval = setInterval(runScan, WATCH_MS);
      }
      port.postMessage({ type: 'started' });
    }

    // Command: Stop periodic watch
    if (data.cmd === 'stopWatch') {
      if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
        broadcast({ type: 'watchStopped' });
      }
      port.postMessage({ type: 'stopped' });
    }
  };

  port.onmessageerror = (err) => {
    console.error('[SharedWorker] Message error:', err);
  };

  port.start && port.start();

  // Basic cleanup (though onclose isn't always reliable in all browsers)
  port.onclose = () => ports.delete(port);
};
