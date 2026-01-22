# BackupBox PWA

Progressive Web App for automatic file backup to Fleabox backend. BackupBox monitors selected folders and uploads files to the cloud, maintaining the original directory structure.

## Features

- 📁 **Multiple Folder Backup** - Select and backup multiple folders
- ☁️ **Cloud Storage** - Files stored on Fleabox backend with same structure
- 🔄 **Automatic Sync** - Periodic rescans every 5 minutes to detect changes
- 📱 **Mobile Optimized** - One file at a time with 1s pause to avoid hogging resources
- 💾 **Incremental Backups** - Only uploads new or modified files
- 🏷️ **Custom Names** - Assign remote names to folders (useful for duplicates)
- 📊 **Progress Tracking** - Real-time upload progress and statistics

## Quick start

1. Install deps:

```bash
npm install
```

2. Serve with fleabox:

```bash
fleabox --dev --apps-dir /workspaces/
```

then open http://localhost:3000/backupbox/

## How It Works

1. **Select Folders** - Use the File System Access API to select folders to backup
2. **Set Remote Names** - Each folder gets a remote name (defaults to local name)
3. **Start Backup** - Service Worker scans folders and uploads files to `/api/backupbox/data/backups/{remote-name}/`
4. **Automatic Rescans** - Every 5 minutes, folders are rescanned and changed files are uploaded
5. **Metadata Tracking** - Each folder has a `metadata.json` tracking file sizes, modification times, and upload status

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests with Playwright
```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# View test report
npx playwright show-report
```

The Playwright tests cover:
- UI elements and initial state
- PWA features (service worker, manifest)
- Accessibility (ARIA attributes)
- User interactions
- Button states and styling

## Devcontainer

- Fleabox is installed automatically when the devcontainer is created. The container's `postCreateCommand` downloads the `fleabox` binary into `$HOME/.local/bin` and marks it executable.
- To apply the change locally: rebuild the devcontainer (Command Palette → "Dev Containers: Rebuild Container").

