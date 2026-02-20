import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import { scanOsuFolder } from '../services/osuScanner.js';
import { songsCacheFile } from '../config/paths.js';

// Handlers responsible for scanning the osu! Songs folder and managing the scan cache.
export function registerScanHandlers({ mainWindow }) {
  ipcMain.handle('scan-osu-folder', async (event, folderPath, forceRescan = false, scanAllMaps = false) => {
    try {
      // Quick validation: check if folder exists and is accessible
      if (!fsSync.existsSync(folderPath)) {
        console.log('[Scan] Folder does not exist:', folderPath);
        return { success: false, error: 'Folder does not exist' };
      }

      // Try to load cache with error handling for corrupted cache
      let cacheData = null;
      if (!forceRescan && fsSync.existsSync(songsCacheFile)) {
        try {
          const cacheContent = await fs.readFile(songsCacheFile, 'utf-8');
          cacheData = JSON.parse(cacheContent);
          console.log('[Cache] Successfully loaded cache file');
        } catch (err) {
          console.error('[Cache] Corrupted cache file detected:', err.message);
          console.log('[Cache] Deleting corrupted cache and performing full rescan...');
          try {
            await fs.unlink(songsCacheFile);
            console.log('[Cache] Deleted corrupted cache file');
          } catch (unlinkErr) {
            console.error('[Cache] Could not delete corrupted cache:', unlinkErr.message);
          }
          cacheData = null;
          // Force full rescan since cache is corrupted
          forceRescan = true;
        }
      }

      // Load existing cache for incremental scanning
      let existingCache = null;
      let shouldUseCache = false;

      if (!forceRescan && cacheData && cacheData[folderPath]) {
        const cachedFolder = cacheData[folderPath];
        // Check if cache is valid: has songs and first song's folder still exists
        if (cachedFolder.songs && cachedFolder.songs.length > 0) {
          const firstSong = cachedFolder.songs[0];
          if (firstSong.folderPath && fsSync.existsSync(firstSong.folderPath)) {
            existingCache = cachedFolder;
            shouldUseCache = true;
          }
        }
      }

      const scanType = (shouldUseCache && !forceRescan) ? 'incremental' : 'full';
      console.log(`[Scan] Performing ${scanType} scan (forceRescan: ${forceRescan}, scanAllMaps: ${scanAllMaps})`);
      const result = await scanOsuFolder(folderPath, event.sender, existingCache, scanAllMaps);

      // Save cache only if scan was successful and has songs
      if (result.success && result.songs && result.songs.length > 0) {
        let cache = cacheData || {};
        if (!cacheData && fsSync.existsSync(songsCacheFile)) {
          try {
            const content = await fs.readFile(songsCacheFile, 'utf-8');
            cache = JSON.parse(content);
          } catch (err) {
            console.log('[Cache] Could not load existing cache for update, creating new:', err.message);
            cache = {};
          }
        }
        cache[folderPath] = { songs: result.songs, date: new Date().toISOString() };
        try {
          const cacheJson = JSON.stringify(cache, null, 2);
          // Validate JSON before writing
          JSON.parse(cacheJson); // This will throw if JSON is invalid
          await fs.writeFile(songsCacheFile, cacheJson, 'utf-8');
          console.log('[Cache] Successfully saved cache file');
        } catch (err) {
          console.error('[Cache] Failed to save cache:', err.message);
          // If save fails, try to delete corrupted file
          try {
            if (fsSync.existsSync(songsCacheFile)) {
              await fs.unlink(songsCacheFile);
              console.log('[Cache] Removed potentially corrupted cache file');
            }
          } catch (unlinkErr) {
            console.error('[Cache] Could not clean up cache file:', unlinkErr.message);
          }
        }
      } else if (result.success && result.songs && result.songs.length === 0) {
        // If scan found no songs, remove from cache
        if (cacheData && cacheData[folderPath]) {
          delete cacheData[folderPath];
          try {
            await fs.writeFile(songsCacheFile, JSON.stringify(cacheData, null, 2), 'utf-8');
            console.log('[Cache] Removed empty folder from cache');
          } catch (err) {
            console.error('[Cache] Failed to update cache:', err.message);
          }
        }
      }

      return result;
    } catch (err) {
      console.error('[Scan] Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('select-osu-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select osu! Songs Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      console.log('[IPC] Selected osu! folder:', result.filePaths[0]);
      return result.filePaths[0];
    }

    return null;
  });
}

