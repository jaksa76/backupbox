# BackupBox PWA

Minimal Progressive Web App scaffold with service worker, manifest, and basic notification demo.

Quick start

1. Install deps:

```bash
npm install
```

2. Serve locally:

```bash
npm run serve
# then open http://localhost:8080
```

Notes

- The service worker is in `sw.js` and caches essential files for offline use.
- Manifest is `manifest.json`. Update icons and metadata for production.

Background worker

- **Worker file**: `src/worker.js` — converted to a Service Worker that provides caching and a minimal message API. For file counting and long-running tasks while a page is open, the app uses `src/shared-worker.js`.
- **Controls**: The UI adds `Start Background Worker` and `Stop Background Worker` buttons. Click `Start` to begin and `Stop` to terminate early.
- **Integration**: `src/app.js` creates and communicates with the worker using `postMessage` and listens for `{type: 'progress'}` and `{type: 'done'}` messages.

Always-running worker

- The app attempts to use a `SharedWorker` (`src/shared-worker.js`) so the worker remains active while at least one tab is open and connected. This gives an "always-running" experience as long as the browser tab is open.
- The selected directory handle is persisted in IndexedDB so reopening the app restores the last selection (when the browser allows it).
- Note: Service Workers cannot access arbitrary filesystem handles; the SharedWorker approach requires the page to be open. For real background processing when the page is closed, a native app or platform-specific background service is required.

Try it

1. Open the app in a browser that supports Web Workers.
2. Click `Start Background Worker` and watch progress update in the status area.
3. (Optional) Click `Select Folder` to choose a folder (requires a browser with the File System Access API).
4. Click `Start Counting Files` to have the background worker count files in the selected folder. If the browser doesn't support directory handles, the app will prompt you to select files instead.
