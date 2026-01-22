/**
 * Backup Engine for BackupBox
 * Handles uploading files to Fleabox backend with proper directory structure
 * Designed for mobile - uploads one file at a time with 1s pause
 */

const APP_ID = 'backupbox';
const UPLOAD_DELAY_MS = 1000; // 1 second pause between uploads
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit per Fleabox

/**
 * Get metadata for a backed-up folder
 * @param {string} remoteName - Remote folder name
 * @returns {Promise<object>} Metadata object with files map
 */
async function getBackupMetadata(remoteName) {
  try {
    const url = `/api/${APP_ID}/data/backups/${encodeURIComponent(remoteName)}/metadata.json`;
    console.log(`[BackupEngine] Fetching metadata from: ${url}`);
    const response = await fetch(url);
    console.log(`[BackupEngine] Metadata fetch response:`, response.status, response.statusText);
    
    if (response.ok) {
      return await response.json();
    }
    // No metadata yet - return empty structure
    console.log(`[BackupEngine] No existing metadata for ${remoteName}, creating new`);
    return { files: {}, lastBackup: null, totalFiles: 0, totalBytes: 0 };
  } catch (err) {
    console.warn(`[BackupEngine] Could not fetch metadata for ${remoteName}:`, err);
    return { files: {}, lastBackup: null, totalFiles: 0, totalBytes: 0 };
  }
}

/**
 * Save metadata for a backed-up folder
 * @param {string} remoteName - Remote folder name
 * @param {object} metadata - Metadata to save
 */
async function saveBackupMetadata(remoteName, metadata) {
  const response = await fetch(`/api/${APP_ID}/data/backups/${encodeURIComponent(remoteName)}/metadata.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to save metadata: ${response.statusText}`);
  }
}

/**
 * Upload a single file to Fleabox backend
 * @param {string} remoteName - Remote folder name
 * @param {string} relativePath - File path relative to folder root
 * @param {File} file - File object to upload
 */
async function uploadFile(remoteName, relativePath, file) {
  const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
  const url = `/api/${APP_ID}/data/backups/${encodeURIComponent(remoteName)}/${encodedPath}`;
  
  // For non-JSON files, we need to handle them as binary
  const isText = file.type.startsWith('text/') || 
                 file.type === 'application/json' ||
                 file.type === 'application/javascript';
  
  let body;
  if (isText) {
    body = await file.text();
  } else {
    // For binary files, read as ArrayBuffer and send as base64-encoded JSON
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      base64 += String.fromCharCode.apply(null, chunk);
    }
    base64 = btoa(base64);
    
    body = JSON.stringify({ 
      _binary: true, 
      data: base64, 
      type: file.type,
      name: file.name 
    });
  }
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': isText ? 'text/plain' : 'application/json' },
    body: body
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
}

/**
 * Collect all files from a directory handle recursively
 * @param {FileSystemDirectoryHandle} dirHandle - Directory to scan
 * @param {string} basePath - Base path for building relative paths
 * @returns {Promise<Array>} Array of {path, file, handle} objects
 */
async function collectFiles(dirHandle, basePath = '') {
  const files = [];
  
  try {
    for await (const entry of dirHandle.values()) {
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        const fileHandle = entry;
        const file = await fileHandle.getFile();
        files.push({ path: relativePath, file, handle: fileHandle });
      } else if (entry.kind === 'directory') {
        const subFiles = await collectFiles(entry, relativePath);
        files.push(...subFiles);
      }
    }
  } catch (err) {
    console.warn(`[BackupEngine] Error scanning directory at ${basePath}:`, err);
  }
  
  return files;
}

/**
 * Determine which files need to be backed up (new or modified)
 * @param {Array} localFiles - Array of local file objects
 * @param {object} metadata - Current backup metadata
 * @returns {Array} Files that need backup
 */
function filterFilesNeedingBackup(localFiles, metadata) {
  const needsBackup = [];
  const skipped = [];
  
  for (const { path, file } of localFiles) {
    // Skip files that are too large
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`[BackupEngine] Skipping ${path} - exceeds 10MB limit (${file.size} bytes)`);
      continue;
    }
    
    const existing = metadata.files[path];
    if (!existing) {
      // New file
      console.log(`[BackupEngine] ${path} - NEW file`);
      needsBackup.push({ path, file });
    } else {
      // Check if modified (comparing timestamps)
      const localMtime = file.lastModified;
      const remoteMtime = existing.mtime;
      
      if (localMtime > remoteMtime) {
        console.log(`[BackupEngine] ${path} - MODIFIED (local: ${localMtime}, remote: ${remoteMtime})`);
        needsBackup.push({ path, file });
      } else {
        console.log(`[BackupEngine] ${path} - SKIP (unchanged)`);
        skipped.push(path);
      }
    }
  }
  
  console.log(`[BackupEngine] Filtering complete: ${needsBackup.length} need backup, ${skipped.length} unchanged`);
  return needsBackup;
}

/**
 * Backup a folder to Fleabox backend
 * @param {FileSystemDirectoryHandle} dirHandle - Local directory to backup
 * @param {string} remoteName - Remote folder name for storage
 * @param {Function} onProgress - Progress callback (current, total, currentFile)
 * @returns {Promise<object>} Backup results
 */
export async function backupFolder(dirHandle, remoteName, onProgress = () => {}) {
  console.log(`[BackupEngine] Starting backup of ${dirHandle.name} -> ${remoteName}`);
  console.log(`[BackupEngine] dirHandle type:`, dirHandle?.kind, 'remoteName:', remoteName);
  
  // Load existing metadata
  const metadata = await getBackupMetadata(remoteName);
  console.log(`[BackupEngine] Loaded metadata:`, metadata);
  
  // Collect all files from local directory
  console.log(`[BackupEngine] Collecting files from directory...`);
  const allFiles = await collectFiles(dirHandle);
  console.log(`[BackupEngine] Found ${allFiles.length} local files`);
  
  // Determine which files need backup
  const filesToBackup = filterFilesNeedingBackup(allFiles, metadata);
  console.log(`[BackupEngine] ${filesToBackup.length} files need backup`);
  
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytes = 0;
  
  // Upload files one by one with delay
  for (const { path, file } of filesToBackup) {
    try {
      onProgress(uploaded, filesToBackup.length, path);
      
      await uploadFile(remoteName, path, file);
      
      // Update metadata for this file
      metadata.files[path] = {
        size: file.size,
        mtime: file.lastModified,
        type: file.type,
        uploadedAt: Date.now()
      };
      
      uploaded++;
      totalBytes += file.size;
      
      console.log(`[BackupEngine] Uploaded ${path} (${file.size} bytes)`);
      
      // Pause before next upload (mobile-friendly)
      if (uploaded < filesToBackup.length) {
        await new Promise(resolve => setTimeout(resolve, UPLOAD_DELAY_MS));
      }
    } catch (err) {
      console.error(`[BackupEngine] Failed to upload ${path}:`, err);
      failed++;
    }
  }
  
  // Update overall metadata
  metadata.lastBackup = Date.now();
  metadata.totalFiles = Object.keys(metadata.files).length;
  metadata.totalBytes = Object.values(metadata.files).reduce((sum, f) => sum + f.size, 0);
  
  // Save updated metadata
  try {
    await saveBackupMetadata(remoteName, metadata);
  } catch (err) {
    console.error(`[BackupEngine] Failed to save metadata:`, err);
  }
  
  return {
    uploaded,
    skipped: allFiles.length - filesToBackup.length,
    failed,
    totalBytes,
    totalFiles: metadata.totalFiles
  };
}

/**
 * Backup multiple folders
 * @param {Array} folderConfigs - Array of {handle, remoteName}
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<object>} Combined results
 */
export async function backupMultipleFolders(folderConfigs, onProgress = () => {}) {
  const results = {
    uploaded: 0,
    skipped: 0,
    failed: 0,
    totalBytes: 0,
    totalFiles: 0
  };
  
  for (const { handle, remoteName } of folderConfigs) {
    try {
      const result = await backupFolder(handle, remoteName, onProgress);
      results.uploaded += result.uploaded;
      results.skipped += result.skipped;
      results.failed += result.failed;
      results.totalBytes += result.totalBytes;
      results.totalFiles = result.totalFiles; // This will be cumulative via metadata
    } catch (err) {
      console.error(`[BackupEngine] Failed to backup ${remoteName}:`, err);
      results.failed++;
    }
  }
  
  return results;
}
