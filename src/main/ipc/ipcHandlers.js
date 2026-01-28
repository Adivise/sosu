import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import { scanOsuFolder } from '../services/osuScanner.js';
import * as discord from '../services/discord.js';
import * as widgetServer from '../services/widgetServer.js';
import { userDataFile, songsCacheFile } from '../config/paths.js';

export async function init({ mainWindow, userDataPath }) {
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
