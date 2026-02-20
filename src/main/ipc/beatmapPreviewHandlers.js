import { ipcMain, shell } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createBeatmapPlayerWindow, getBeatmapData, getBeatmapPlayerWindow, updateBeatmapData } from '../core/createBeatmapPlayerWindow.js';
import { parseBeatmap, parseBeatmapContent } from '../core/beatmapParse.js';
import parseOsuFile from '../core/parseOsu.js';
import { findAudioFilename } from '../core/beatmap-utils.js';

// Handlers for beatmap preview/player window and related utilities.
// We keep track of the last theme payload so that newly opened preview
// windows can actively pull the current theme even if they missed earlier
// "update-theme" broadcasts.
let lastBeatmapPlayerTheme = null;
// store mainWindow reference for sending events back
let _mainWindow = null;

export function registerBeatmapPreviewHandlers({ mainWindow } = {}) {
  _mainWindow = mainWindow;

  // Open beatmap player in new window
  ipcMain.handle('open-beatmap-player', async (event, folderPath) => {
    try {
      console.log('[BeatmapPlayer] Opening beatmap from:', folderPath);
      if (!folderPath) return { success: false, error: 'Missing folder path' };
      if (!fsSync.existsSync(folderPath)) return { success: false, error: 'Folder does not exist' };

      const entries = await fs.readdir(folderPath);
      if (!entries.length) return { success: false, error: 'Folder is empty' };

      console.log('[BeatmapPlayer] Parsing beatmap...');
      // Parse beatmap directly from folder
      const parsedData = await parseBeatmap(folderPath);
      console.log('[BeatmapPlayer] Beatmap parsed:', parsedData.metadata.title);

      const beatmapData = {
        metadata: parsedData.metadata,
        audioBase64: parsedData.audioBase64,
        audioFilename: parsedData.audioFilename,
        backgroundBase64: parsedData.backgroundBase64,
        backgroundFilename: parsedData.backgroundFilename,
        availableDifficulties: parsedData.availableDifficulties || [],
        folderPath
      };

      console.log('[BeatmapPlayer] Creating player window...');
      const win = createBeatmapPlayerWindow(beatmapData);
      if (win) {
        win.on('closed', () => {
          try {
            if (_mainWindow && !_mainWindow.isDestroyed()) {
              _mainWindow.webContents.send('beatmap-player-closed');
            }
          } catch (err) {
            console.error('[BeatmapPlayer] failed to notify main window of close', err);
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[BeatmapPlayer] Error opening window:', error);
      return { success: false, error: error.message };
    }
  });

  // Get beatmap data for the player window
  ipcMain.handle('get-beatmap-data', () => {
    return getBeatmapData();
  });

  // Forward theme updates from main renderer to the beatmap player window
  ipcMain.on('update-beatmap-player-theme', (event, themeVars) => {
    try {
      lastBeatmapPlayerTheme = themeVars || null;
      const bpw = getBeatmapPlayerWindow();
      if (bpw && !bpw.isDestroyed()) {
        bpw.webContents.send('update-theme', themeVars);
      }
    } catch (err) {
      console.error('[IPC] failed to forward theme to beatmap player', err);
    }
  });

  // Allow preview windows to query the latest theme explicitly on startup.
  ipcMain.handle('get-beatmap-player-theme', () => {
    return lastBeatmapPlayerTheme || null;
  });

  // Preview: load a specific .osu difficulty from the same folder and update the open preview window
  ipcMain.handle('preview-load-difficulty', async (event, folderPath, osuFilename) => {
    try {
      if (!folderPath || !osuFilename) return { success: false, error: 'missing args' };
      const osuPath = path.join(folderPath, osuFilename);
      const content = await fs.readFile(osuPath, 'utf-8');

      // parse only the .osu content for metadata (reuse existing audio/background from current preview)
      const parsedMeta = parseBeatmapContent(content);
      const parsedOsu = parseOsuFile(content); // lightweight parser to extract AudioFilename from .osu

      // base the new preview payload on the currently loaded beatmap's audio/background
      const current = getBeatmapData() || {};

      // determine audio to send: prefer audio referenced by the selected .osu (if present in folder)
      // if that is missing or unchanged, attempt a lightweight heuristic match in the folder
      let audioBase64 = current.audioBase64 || null;
      let audioFilename = current.audioFilename || null;

      try {
        const files = await fs.readdir(folderPath);

        // 1) explicit AudioFilename from .osu (exact or case-insensitive)
        if (parsedOsu?.audioFilename) {
          const found = findAudioFilename(files, parsedOsu.audioFilename);
          if (found) {
            const audioBuf = await fs.readFile(path.join(folderPath, found));
            audioBase64 = audioBuf.toString('base64');
            audioFilename = found;
            console.log('[IPC] preview-load-difficulty: using audio referenced by .osu ->', found);
          } else {
            console.log('[IPC] preview-load-difficulty: referenced audio not present, will try heuristic lookup');
          }
        }

        // 2) heuristic fallback: only if no explicit audio found or it equals the current audio
        if (
          !audioFilename ||
          (parsedOsu && parsedOsu.audioFilename && audioFilename &&
            audioFilename.toLowerCase() === (current.audioFilename || '').toLowerCase())
        ) {
          const supportedExts = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac'];
          const audioFiles = files.filter(f => supportedExts.some(ext => f.toLowerCase().endsWith(ext)));

          const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
          const osuBase = normalize(path.basename(osuFilename, path.extname(osuFilename)));
          const versionToken = normalize(parsedMeta?.version || parsedOsu?.version || '');
          const titleToken = normalize(parsedMeta?.title || '');
          const artistToken = normalize(parsedMeta?.artist || '');

          let candidate = null;
          if (versionToken) candidate = audioFiles.find(f => normalize(f).includes(versionToken));
          if (!candidate) candidate = audioFiles.find(f => path.basename(f, path.extname(f)).toLowerCase() === osuBase);
          if (!candidate) candidate = audioFiles.find(f => normalize(f).includes(osuBase));
          if (!candidate && titleToken) candidate = audioFiles.find(f => normalize(f).includes(titleToken));
          if (!candidate && artistToken) candidate = audioFiles.find(f => normalize(f).includes(artistToken));

          if (candidate) {
            if (!audioFilename || candidate.toLowerCase() !== (audioFilename || '').toLowerCase()) {
              try {
                const audioBuf = await fs.readFile(path.join(folderPath, candidate));
                audioBase64 = audioBuf.toString('base64');
                audioFilename = candidate;
                console.log('[IPC] preview-load-difficulty: heuristic matched audio ->', candidate);
              } catch (err) {
                console.warn(
                  '[IPC] preview-load-difficulty: failed to read heuristic candidate',
                  candidate,
                  err?.message || err
                );
              }
            } else {
              console.log('[IPC] preview-load-difficulty: heuristic candidate equals current audio, no change');
            }
          } else {
            console.log('[IPC] preview-load-difficulty: no heuristic audio candidate found; keeping current audio');
          }
        }
      } catch (err) {
        console.warn('[IPC] preview-load-difficulty: audio lookup error, keeping current audio', err?.message || err);
      }

      const newBeatmap = {
        metadata: parsedMeta,
        audioBase64,
        audioFilename,
        backgroundBase64: current.backgroundBase64 || null,
        backgroundFilename: current.backgroundFilename || null,
        folderPath,
        osuContent: content,
        availableDifficulties: current.availableDifficulties || []
      };

      console.log(
        '[IPC] preview-load-difficulty: dispatching new beatmap — audioFilename=',
        audioFilename,
        'audioBase64?',
        !!audioBase64
      );
      updateBeatmapData(newBeatmap);
      return { success: true, audioFilename };
    } catch (err) {
      console.error('[IPC] preview-load-difficulty failed:', err);
      return { success: false, error: err.message };
    }
  });

  // Generic file reader (used by renderer)
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const data = await fs.readFile(filePath);
      return { success: true, data: data.toString('base64') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Open an external URL (kept here so preview-related flows that open URLs can reuse it)
  ipcMain.handle('open-external', async (e, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });
}

