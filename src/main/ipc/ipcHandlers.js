import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import { scanOsuFolder } from '../services/osuScanner.js';
import * as discord from '../services/discord.js';
import * as widgetServer from '../services/widgetServer.js';
import { userDataFile, songsCacheFile } from '../config/paths.js';

export async function init({ mainWindow, userDataPath }) {
    ipcMain.handle('scan-osu-folder', async (event, folderPath, forceRescan = false) => {
        try {
            // Try to load cache with error handling for corrupted cache
            let cacheData = null;
            if (!forceRescan && fsSync.existsSync(songsCacheFile)) {
                try {
                    const cacheContent = await fs.readFile(songsCacheFile, 'utf-8');
                    cacheData = JSON.parse(cacheContent);
                } catch (err) {
                    console.error('[Cache] Corrupted cache file detected:', err.message);
                    console.log('[Cache] Deleting corrupted cache and will rescan...');
                    try {
                        await fs.unlink(songsCacheFile);
                    } catch (unlinkErr) {
                        console.error('[Cache] Could not delete corrupted cache:', unlinkErr.message);
                    }
                    cacheData = null;
                }
            }

            // If cache is valid and exists for this folder, check if we should use it
            if (cacheData && cacheData[folderPath]?.songs?.length > 0) {
                const firstSong = cacheData[folderPath].songs[0];
                if (firstSong.folderPath && fsSync.existsSync(firstSong.folderPath)) {
                    console.log('[Cache] Using cached songs for', folderPath);
                    // Still load cache for incremental scan
                    const existingCache = cacheData[folderPath];
                    const scanType = 'incremental';
                    console.log(`[Scan] Performing ${scanType} scan to sync changes`);
                    const result = await scanOsuFolder(folderPath, event.sender, existingCache);
                    
                    // Save updated cache
                    if (result.success && result.songs.length > 0) {
                        cacheData[folderPath] = { songs: result.songs, date: new Date().toISOString() };
                        await fs.writeFile(songsCacheFile, JSON.stringify(cacheData, null, 2), 'utf-8');
                    }
                    
                    return result;
                }
            }

            // Load existing cache for incremental scanning
            let existingCache = null;
            if (!forceRescan && cacheData && cacheData[folderPath]) {
                existingCache = cacheData[folderPath];
            }
            
            const scanType = (existingCache && !forceRescan) ? 'incremental' : 'full';
            console.log(`[Scan] Performing ${scanType} scan (forceRescan: ${forceRescan})`);
            const result = await scanOsuFolder(folderPath, event.sender, existingCache);

            if (result.success && result.songs.length > 0) {
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
                    await fs.writeFile(songsCacheFile, JSON.stringify(cache, null, 2), 'utf-8');
                } catch (err) {
                    console.error('[Cache] Failed to save cache:', err.message);
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
      

    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            const data = await fs.readFile(filePath);
            return { success: true, data: data.toString('base64') };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('window-minimize', () => mainWindow?.minimize());
    ipcMain.handle('window-maximize', () => {
        if (!mainWindow) return;
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    });
    ipcMain.handle('window-close', () => mainWindow?.close());

    ipcMain.handle('get-user-data', async () => {
        try {
            if (fsSync.existsSync(userDataFile)) {
                const str = await fs.readFile(userDataFile, 'utf-8');
                // Handle empty files
                if (!str || str.trim() === '') {
                    console.log('User data file is empty, returning null');
                    return null;
                }
                return JSON.parse(str);
            }
        } catch (e) {
            console.error('Error reading userdata:', e);
            // Return null for malformed JSON or other errors
        }
        return null;
    });

    ipcMain.handle('save-user-data', async (e, data) => {
        try {
            await fs.writeFile(userDataFile, JSON.stringify(data, null, 2), 'utf-8');
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('get-songs-cache', async () => {
        try {
            if (fsSync.existsSync(songsCacheFile)) {
                const str = await fs.readFile(songsCacheFile, 'utf-8');
                // Handle empty files
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

    ipcMain.handle('open-external', async (e, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('set-rich-presence', async (e, enabled, presenceData) => {
        return discord.setRichPresence(enabled, presenceData);
    });

    ipcMain.on('update-rich-presence', async (e, presenceData) => {
        await discord.setRichPresence(true, presenceData);
    });

    // Widget Server handlers
    ipcMain.handle('widget-start-server', async (e, port = 3737) => {
        try {
            const result = await widgetServer.startServer(port);
            return { success: true, ...result };
        } catch (error) {
            console.error('Error starting widget server:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('widget-stop-server', async () => {
        try {
            await widgetServer.stopServer();
            return { success: true };
        } catch (error) {
            console.error('Error stopping widget server:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('widget-is-running', () => {
        return widgetServer.isServerRunning();
    });

    ipcMain.handle('widget-get-url', () => {
        return widgetServer.getServerUrl();
    });

    ipcMain.on('widget-update-now-playing', (e, data) => {
        widgetServer.updateNowPlaying(data);
    });

    ipcMain.handle('widget-set-version', (e, version) => {
        widgetServer.setAppVersion(version);
        return { success: true };
    });
}
