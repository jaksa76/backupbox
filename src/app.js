// --- UI Elements ---
const el = {
  status: document.getElementById('status'),
  folderList: document.getElementById('folderList'),
  pickBtn: document.getElementById('pickFolder'),
  startBtn: document.getElementById('startWorker'),
  stopBtn: document.getElementById('stopWorker'),
  fileCount: document.getElementById('fileCount'),
  lastSync: document.getElementById('lastSync'),
  progressWrapper: document.getElementById('progressWrapper'),
  progressBar: document.getElementById('progressBar')
};

// --- State Management ---
const state = {
  worker: null,
  folderHandles: [], // Array of FileSystemDirectoryHandle
  isWorking: false,
};

// --- Persistence (IndexedDB) ---
const dbPromise = new Promise((resolve, reject) => {
  const req = indexedDB.open('backupbox-store', 2);
  req.onupgradeneeded = (e) => {
    const db = req.result;
    if (!db.objectStoreNames.contains('handles')) {
      db.createObjectStore('handles');
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function saveHandles(handles) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handles, 'folderHandles');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandles() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('folderHandles');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// --- UI Updates ---
function updateUI() {
  el.startBtn.disabled = state.folderHandles.length === 0 || state.isWorking;
  el.stopBtn.disabled = !state.isWorking;
  el.pickBtn.disabled = state.isWorking;

  renderFolderList();

  if (state.isWorking) {
    el.progressWrapper.style.display = 'block';
  } else {
    el.progressWrapper.style.display = 'none';
    el.progressBar.style.width = '0%';
  }
}

let lastRenderId = 0;
async function renderFolderList() {
  const renderId = ++lastRenderId;
  const container = el.folderList;

  if (state.folderHandles.length === 0) {
    if (renderId === lastRenderId) {
      container.innerHTML = '<p id="folderLabel" style="text-align: center;">No folders selected.</p>';
    }
    return;
  }

  const fragment = document.createDocumentFragment();

  // We use for...of to allow awaited permission checks while building the fragment
  for (const [index, handle] of state.folderHandles.entries()) {
    let permission;
    try {
      permission = await handle.queryPermission({ mode: 'readwrite' });
    } catch (e) {
      permission = 'denied';
    }
    const isGranted = permission === 'granted';

    const item = document.createElement('div');
    item.className = 'folder-item';
    item.style.borderLeft = isGranted ? '4px solid var(--success)' : '4px solid var(--danger)';

    item.innerHTML = `
      <div class="folder-info">
        <span class="folder-icon">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
        </span>
        <div style="display: flex; flex-direction: column; overflow: hidden;">
          <span class="folder-name" title="${handle.name}">${handle.name}</span>
          <span style="font-size: 0.7rem; color: ${isGranted ? 'var(--success)' : 'var(--danger)'}">
            ${isGranted ? 'Access Granted' : 'Needs Re-authorization'}
          </span>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
        ${!isGranted ? `
          <button class="btn-reauth" data-index="${index}" style="background: none; border: 1px solid var(--accent); color: var(--accent); border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; cursor: pointer;">
            Authorize
          </button>
        ` : ''}
        <button class="btn-remove" data-index="${index}" title="Remove folder">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    const reauthBtn = item.querySelector('.btn-reauth');
    if (reauthBtn) {
      reauthBtn.addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        await state.folderHandles[idx].requestPermission({ mode: 'readwrite' });
        updateUI();
      });
    }

    item.querySelector('.btn-remove').addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      removeFolder(idx);
    });

    fragment.appendChild(item);
  }

  // Final check to prevent overlapping renders from corrupting the UI
  if (renderId === lastRenderId) {
    container.innerHTML = '';
    container.appendChild(fragment);
  }
}

function setStatus(text, type = 'info') {
  el.status.textContent = text;
  console.log(`[Status] ${text}`);
}

// --- Folder Management ---
async function addFolder() {
  try {
    if (window.showDirectoryPicker) {
      const dir = await window.showDirectoryPicker();
      // Check if already added
      if (state.folderHandles.some(h => h.name === dir.name)) {
        setStatus(`Folder "${dir.name}" is already in the list.`);
        return;
      }
      state.folderHandles.push(dir);
      setStatus(`Added folder: ${dir.name}`);
      updateUI();
      await saveHandles(state.folderHandles);
    } else {
      setStatus('Browser does not support folder selection.');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      setStatus('Error selecting folder.');
      console.error(err);
    }
  }
}

async function removeFolder(index) {
  const removed = state.folderHandles.splice(index, 1)[0];
  setStatus(`Removed: ${removed.name}`);
  updateUI();
  await saveHandles(state.folderHandles);
}

// --- Worker Logic ---

function handleWorkerMessage(ev) {
  const msg = ev.data || {};
  switch (msg.type) {
    case 'progress':
      const percent = (msg.done / (msg.total || 100)) * 100;
      el.progressBar.style.width = `${percent}%`;
      setStatus(`Processing: ${msg.done} files...`);
      break;
    case 'done':
      state.isWorking = false;
      const count = msg.result?.count ?? msg.result?.fileCount ?? 0;
      el.fileCount.textContent = count;
      el.lastSync.textContent = new Date().toLocaleTimeString();
      setStatus('Backup completed successfully.');
      updateUI();
      break;
    case 'error':
      state.isWorking = false;
      setStatus(`Error: ${msg.message}`);
      updateUI();
      break;
    case 'started':
      state.isWorking = true;
      setStatus('Syncing files (via Service Worker)...');
      updateUI();
      break;
    case 'stopped':
      state.isWorking = false;
      setStatus('Worker stopped.');
      updateUI();
      break;
  }
}

async function startBackup() {
  if (state.folderHandles.length === 0) {
    setStatus('No folders selected.');
    return;
  }

  // Check permissions for all folders
  const results = await Promise.all(state.folderHandles.map(h => h.queryPermission({ mode: 'readwrite' })));
  if (results.some(r => r !== 'granted')) {
    setStatus('Please authorize all folders before starting.');
    updateUI();
    return;
  }

  state.isWorking = true;
  updateUI();
  setStatus('Starting backup process...');
  console.log('Sending handles to worker:', state.folderHandles.map(h => h.name));

  // Use Service Worker if available
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      cmd: 'startWatch',
      dirHandles: [...state.folderHandles]
    });
  } else {
    // Fallback to dedicated worker if SW is not controlling the page yet
    setStatus('Service Worker not ready. Falling back to dedicated worker.');
    if (!state.worker) {
      state.worker = new Worker('/src/worker.js');
      state.worker.onmessage = handleWorkerMessage;
    }
    state.worker.postMessage({ cmd: 'count', dirHandles: [...state.folderHandles] });
  }
}

function stopBackup() {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ cmd: 'stopWatch' });
  }

  if (state.worker) {
    state.worker.terminate();
    state.worker = null;
  }
  state.isWorking = false;
  setStatus('Backup process cancelled.');
  updateUI();
}

// --- Event Listeners ---
el.pickBtn.addEventListener('click', addFolder);
el.startBtn.addEventListener('click', startBackup);
el.stopBtn.addEventListener('click', stopBackup);

// --- Initialization ---
(async () => {
  setStatus('System ready.');

  // Load persisted handles
  try {
    const handles = await loadHandles();
    if (handles && Array.isArray(handles)) {
      state.folderHandles = handles;
      setStatus(`Restored ${handles.length} folders.`);
    }
  } catch (err) {
    console.warn('Store restoration failed', err);
  }

  updateUI();
  registerSW();
})();

async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      // Register with type: 'module' to allow imports in sw.js
      const registration = await navigator.serviceWorker.register('/backupbox/sw.js', { type: 'module' });
      console.log('Service Worker registered', registration);

      // Listen for messages from the Service Worker
      navigator.serviceWorker.addEventListener('message', handleWorkerMessage);

    } catch (e) {
      console.error('SW registration failed', e);
    }
  }
}
