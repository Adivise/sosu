import { ipcMain } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { userDataFile, songsCacheFile, previewDataFile } from '../config/paths.js';
import parseOsuFile from '../core/parseOsu.js';
import { findAudioFilename } from '../core/beatmap-utils.js';

// Handlers for user settings, preview settings, and songs cache persistence.
export function registerDataHandlers() {
  // User data (main app settings)
  ipcMain.handle('get-user-data', async () => {
    console.log('[UserData] User data file path:', userDataFile);
    try {
      if (fsSync.existsSync(userDataFile)) {
        const str = await fs.readFile(userDataFile, 'utf-8');
        if (!str || str.trim() === '') {
          console.log('User data file is empty, returning null');
          return null;
        }
        try {
          const data = JSON.parse(str);
          console.log('[UserData] Loaded user data keys:', Object.keys(data));
          return data;
        } catch (parseErr) {
          console.error('[UserData] Corrupted user data file, deleting:', parseErr.message);
          try {
            await fs.unlink(userDataFile);
          } catch (unlinkErr) {
            console.error('[UserData] Failed to delete corrupted user data file:', unlinkErr.message);
          }
          return null;
        }
      }
    } catch (e) {
      console.error('Error reading userdata:', e);
    }
    console.log('[UserData] No user data file found');
    return null;
  });

  ipcMain.handle('save-user-data', async (e, data) => {
    try {
      await fs.writeFile(userDataFile, JSON.stringify(data, null, 2), 'utf-8');
      console.log('[UserData] Saved user data keys:', Object.keys(data));
      return { success: true };
    } catch (err) {
      console.error('[UserData] Error saving user data:', err);
      return { success: false, error: err.message };
    }
  });

  // Preview-specific persistent storage (Beatmap Viewer settings, etc.)
  ipcMain.handle('get-preview-data', async () => {
    try {
      if (fsSync.existsSync(previewDataFile)) {
        const str = await fs.readFile(previewDataFile, 'utf-8');
        if (!str || str.trim() === '') return null;
        try {
          return JSON.parse(str);
        } catch (parseErr) {
          console.error('[PreviewData] Corrupted preview data file, deleting:', parseErr.message);
          try { await fs.unlink(previewDataFile); } catch (unlinkErr) { /* ignore */ }
          return null;
        }
      }
    } catch (err) {
      console.error('[PreviewData] Error reading preview data file:', err);
    }
    return null;
  });

  ipcMain.handle('save-preview-data', async (e, data = {}) => {
    try {
      // Merge with existing file content to avoid clobbering unrelated keys
      let current = {};
      if (fsSync.existsSync(previewDataFile)) {
        try {
          const raw = await fs.readFile(previewDataFile, 'utf-8');
          if (raw && raw.trim() !== '') current = JSON.parse(raw);
        } catch (err) {
          console.warn('[PreviewData] Could not parse existing preview data, overwriting');
          current = {};
        }
      }

      const merged = { ...current, ...data };
      await fs.writeFile(previewDataFile, JSON.stringify(merged, null, 2), 'utf-8');
      console.log('[PreviewData] Saved preview data keys:', Object.keys(data));
      return { success: true };
    } catch (err) {
      console.error('[PreviewData] Error saving preview data:', err);
      return { success: false, error: err.message };
    }
  });

  // Songs cache (shared between scanner and renderer)
  ipcMain.handle('get-songs-cache', async () => {
    try {
      if (fsSync.existsSync(songsCacheFile)) {
        const str = await fs.readFile(songsCacheFile, 'utf-8');
        if (!str || str.trim() === '') {
          console.log('Songs cache file is empty, returning null');
          return null;
        }
        try {
          return JSON.parse(str);
        } catch (parseErr) {
          console.error('Songs cache is corrupted, deleting:', parseErr.message);
          try {
            await fs.unlink(songsCacheFile);
          } catch (unlinkErr) {
            console.error('Could not delete corrupted cache:', unlinkErr.message);
          }
          return null;
        }
      }
    } catch (err) {
      console.error('Error loading songs cache:', err);
    }
    return null;
  });

  ipcMain.handle('save-songs-cache', async (e, cache) => {
    try {
      await fs.writeFile(songsCacheFile, JSON.stringify(cache, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get all difficulties from a song folder
  ipcMain.handle('get-song-difficulties', async (e, folderPath, osuFiles) => {
    try {
      if (!folderPath || !Array.isArray(osuFiles) || osuFiles.length === 0) {
        return { success: false, error: 'Invalid parameters' };
      }

      const files = await fs.readdir(folderPath);
      const difficulties = [];
      for (const osuFile of osuFiles) {
        try {
          const osuFilePath = typeof osuFile === 'string' ? path.join(folderPath, osuFile) : osuFile.path;
          const content = await fs.readFile(osuFilePath, 'utf-8');
          const metadata = parseOsuFile(content);
          const audioFilename = findAudioFilename(files, metadata.audioFilename);
          const audioFilePath = audioFilename ? path.join(folderPath, audioFilename) : null;

          difficulties.push({
            filename: typeof osuFile === 'string' ? osuFile : osuFile.name,
            version: metadata.version || metadata.difficulty || path.basename(osuFilePath, '.osu'),
            audioFilename: metadata.audioFilename || null,
            audioFilePath,
            beatmapId: metadata.beatmapId || null,
            beatmapSetId: metadata.beatmapSetId || null,
            mode: metadata.mode || 0
          });
        } catch (err) {
          console.warn('[get-song-difficulties] Failed to parse', osuFile, err.message);
        }
      }

      return { success: true, difficulties };
    } catch (err) {
      console.error('[get-song-difficulties] Error:', err);
      return { success: false, error: err.message };
    }
  });
}

