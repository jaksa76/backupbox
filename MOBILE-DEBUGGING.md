# Mobile Debugging Guide for BackupBox

## The Problem
Your backup completes instantly without actually backing up any files on mobile. This is likely because:
1. The File System Access API may be behaving differently on mobile
2. The `collectFiles()` function might not be finding any files
3. Permissions might be silently failing
4. The directory iteration might be throwing errors that are caught silently

## The Solution: Built-in Debug Panel

I've added a comprehensive debug panel to BackupBox that captures all console logs and displays them directly in the app UI. This is perfect for mobile debugging where you can't easily access the browser console.

### How to Use the Debug Panel

1. **Open the Debug Panel**
   - Look for the "🐛 Debug" button in the bottom-right corner of the app
   - Tap it to open the debug log panel

2. **Start a Backup**
   - With the debug panel open, try starting a backup
   - Watch the logs appear in real-time

3. **What to Look For**
   - **"=== BACKUP STARTED ==="** - Confirms backup started
   - **"Checking permissions for X folders..."** - Shows permission check
   - **"Permission results: granted, granted"** - Confirms permissions are OK
   - **"Collecting files from: (root)"** - Shows directory scanning started
   - **"Found entry: [filename], kind: file"** - Shows each file/folder found
   - **"Processed X entries at (root), collected Y files"** - Shows scan results
   - **"Found X local files"** - Total files discovered
   - **"Y files need backup"** - Files that are new/modified
   - **"Uploaded [filename] (X bytes)"** - Each successful upload

### Common Issues and What the Debug Log Will Show

#### Issue 1: No Files Found
If you see:
```
Collecting files from: (root)
Processed 0 entries at (root), collected 0 files
Found 0 local files
```
**Diagnosis**: The directory handle isn't providing access to its contents.
**Solutions**: 
- Try selecting a different folder
- Check if the folder actually contains files
- The File System Access API might not be fully supported on your mobile browser

#### Issue 2: Permission Denied
If you see:
```
Permission denied for some folders
```
**Diagnosis**: Permissions weren't properly granted.
**Solution**: Tap the folder in the list and click "Authorize Access"

#### Issue 3: Errors During File Collection
If you see error messages like:
```
Error scanning directory at [...]: NotAllowedError
```
**Diagnosis**: Permission error during scanning.
**Solution**: Remove and re-add the folder, ensuring you grant all permissions

#### Issue 4: Files Found But Not Uploaded
If you see files being found but no uploads:
```
Found 50 local files
0 files need backup
```
**Diagnosis**: All files already backed up (timestamps match).
**Solution**: This is normal - try modifying a file or adding a new one

### Advanced Debugging

#### Export Debug Log
1. Open the debug panel
2. Long-press on the log area
3. Select all text
4. Copy and paste into a text editor or send via email

#### Clear the Log
- Tap the "Clear" button in the debug panel to start fresh
- The log automatically keeps the last 200 entries

### Testing the Fix

1. **Open BackupBox on your mobile device**
2. **Tap "🐛 Debug" to open the debug panel**
3. **Add a test folder** with a few small files
4. **Grant permissions** when prompted
5. **Start backup** and watch the debug log
6. **Look for**:
   - How many entries are found
   - How many files are collected
   - Any error messages
   - Upload progress

### What the Logs Will Tell You

The debug logs now include:
- ✅ Every file and directory discovered during scanning
- ✅ File details (name, size, type)
- ✅ Permission check results
- ✅ Metadata loading and saving
- ✅ Upload progress for each file
- ✅ Error messages with full details (name, message, stack trace)

### Next Steps Based on Debug Output

**If you see "0 entries" during directory scan:**
- The File System Access API might not be working properly on your mobile browser
- Try a different browser (Chrome, Edge, Safari)
- Some mobile browsers have limited File System Access API support

**If you see files but errors during upload:**
- Check your network connection
- Verify the Fleabox server is accessible
- Check if you're authenticated (X-Remote-User header)

**If everything looks good but uploads fail:**
- Share the debug log output with me and I can help diagnose further

## Browser Compatibility

The File System Access API has limited mobile support:
- ✅ **Chrome/Edge on Android**: Best support
- ⚠️ **Safari on iOS 15.2+**: Limited support, may have issues
- ❌ **Firefox Mobile**: Not supported yet

If your browser doesn't support the API properly, the debug log will make this clear by showing permission errors or empty directory scans.
