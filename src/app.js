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
  folderConfigs: [], // Array of {handle: FileSystemDirectoryHandle, remoteName: string}
  isWorking: false,
};

// --- Persistence (IndexedDB) ---
const dbPromise = new Promise((resolve, reject) => {
  const req = indexedDB.open('backupbox-store', 3);
  req.onupgradeneeded = (e) => {
    const db = req.result;
    if (!db.objectStoreNames.contains('handles')) {
      db.createObjectStore('handles');
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function saveConfigs(configs) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(configs, 'folderConfigs');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadConfigs() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('folderConfigs');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// --- UI Updates ---
function updateUI() {
  el.startBtn.disabled = state.folderConfigs.length === 0 || state.isWorking;
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

  if (state.folderConfigs.length === 0) {
    if (renderId === lastRenderId) {
      container.innerHTML = '<p id="folderLabel" style="text-align: center;">No folders selected.</p>';
    }
    return;
  }

  const fragment = document.createDocumentFragment();

  // We use for...of to allow awaited permission checks while building the fragment
  for (const [index, config] of state.folderConfigs.entries()) {
    const handle = config.handle;
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
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
            → ${config.remoteName}
          </span>
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
        await state.folderConfigs[idx].handle.requestPermission({ mode: 'readwrite' });
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
      
      // Check if already added (by local name)
      if (state.folderConfigs.some(c => c.handle.name === dir.name)) {
        setStatus(`Folder "${dir.name}" is already in the list.`);
        return;
      }
      
      // Prompt for remote name
      let remoteName = prompt(
        `Enter a name for this backup folder on the server:`,
        dir.name
      );
      
      if (!remoteName) {
        setStatus('Folder addition cancelled.');
        return;
      }
      
      // Sanitize remote name (remove invalid characters)
      remoteName = remoteName.trim().replace(/[/\\:*?"<>|]/g, '_');
      
      // Check for duplicate remote names
      if (state.folderConfigs.some(c => c.remoteName === remoteName)) {
        setStatus(`Remote name "${remoteName}" is already in use. Please choose a different name.`);
        return;
      }
      
      state.folderConfigs.push({ handle: dir, remoteName });
      setStatus(`Added folder: ${dir.name} → ${remoteName}`);
      updateUI();
      await saveConfigs(state.folderConfigs);
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
  const removed = state.folderConfigs.splice(index, 1)[0];
  setStatus(`Removed: ${removed.handle.name} (${removed.remoteName})`);
  updateUI();
  await saveConfigs(state.folderConfigs);
}

// --- Worker Logic ---

function handleWorkerMessage(ev) {
  const msg = ev.data || {};
  switch (msg.type) {
    case 'triggerBackup':
      console.log('[App] Received triggerBackup from SW');
      if (state.folderConfigs.length > 0 && !state.isWorking) {
        startBackup();
      }
      break;
    case 'progress':
      const percent = msg.total > 0 ? (msg.done / msg.total * 100) : 0;
      el.progressBar.style.width = `${percent}%`;
      const fileName = msg.currentFile ? ` (${msg.currentFile})` : '';
      setStatus(`Uploading: ${msg.done}/${msg.total}${fileName}`);
      break;
    case 'done':
      state.isWorking = false;
      const result = msg.result || {};
      const uploaded = result.uploaded || 0;
      const totalFiles = result.totalFiles || 0;
      const bytes = result.totalBytes || 0;
      const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
      el.fileCount.textContent = `${totalFiles} (${sizeMB} MB)`;
      el.lastSync.textContent = new Date().toLocaleTimeString();
      setStatus(`Backup complete: ${uploaded} uploaded, ${result.skipped || 0} unchanged`);
      updateUI();
      break;
    case 'error':
      state.isWorking = false;
      setStatus(`Error: ${msg.message}`);
      updateUI();
      break;
    case 'started':
      state.isWorking = true;
      setStatus('Starting backup...');
      updateUI();
      break;
    case 'stopped':
      state.isWorking = false;
      setStatus('Backup stopped.');
      updateUI();
      break;
  }
}

async function startBackup() {
  if (state.folderConfigs.length === 0) {
    setStatus('No folders selected.');
    return;
  }

  // Check permissions for all folders
  const results = await Promise.all(state.folderConfigs.map(c => c.handle.queryPermission({ mode: 'readwrite' })));
  if (results.some(r => r !== 'granted')) {
    setStatus('Please authorize all folders before starting.');
    updateUI();
    return;
  }

  state.isWorking = true;
  updateUI();
  setStatus('Starting backup process...');
  console.log('[App] Starting backup for:', state.folderConfigs.map(c => `${c.handle.name} -> ${c.remoteName}`));

  // Import backup engine dynamically
  const { backupMultipleFolders } = await import('/backupbox/src/backup-engine.js');
  
  try {
    const result = await backupMultipleFolders(
      state.folderConfigs,
      (done, total, currentFile) => {
        const percent = total > 0 ? (done / total * 100) : 0;
        el.progressBar.style.width = `${percent}%`;
        const fileName = currentFile ? ` (${currentFile})` : '';
        setStatus(`Uploading: ${done}/${total}${fileName}`);
      }
    );
    
    // Update UI with results
    const bytes = result.totalBytes || 0;
    const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
    el.fileCount.textContent = `${result.totalFiles} (${sizeMB} MB)`;
    el.lastSync.textContent = new Date().toLocaleTimeString();
    setStatus(`Backup complete: ${result.uploaded} uploaded, ${result.skipped} unchanged`);
    
    // Schedule next backup in 5 minutes
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      console.log('[App] Scheduling next backup in 5 minutes');
      navigator.serviceWorker.controller.postMessage({ 
        cmd: 'scheduleNextBackup',
        delayMs: 5 * 60 * 1000 
      });
    }
  } catch (err) {
    console.error('[App] Backup failed:', err);
    setStatus(`Error: ${err.message}`);
  } finally {
    state.isWorking = false;
    updateUI();
  }
}

function stopBackup() {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ cmd: 'stopBackup' });
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

  // Load persisted configs
  try {
    const configs = await loadConfigs();
    if (configs && Array.isArray(configs)) {
      state.folderConfigs = configs;
      setStatus(`Restored ${configs.length} folders.`);
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
      console.log('[App] Service Worker registered:', registration);
      
      // Wait for SW to be active
      await navigator.serviceWorker.ready;
      console.log('[App] Service Worker is ready and controlling');

      // Listen for messages from the Service Worker
      navigator.serviceWorker.addEventListener('message', handleWorkerMessage);

    } catch (e) {
      console.error('[App] SW registration failed:', e);
    }
  } else {
    console.error('[App] Service Workers not supported');
  }
}
