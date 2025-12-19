import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import { scanOsuFolder } from '../services/osuScanner.js';
import * as discord from '../services/discord.js';
import { userDataFile, songsCacheFile } from '../config/paths.js';

export async function init({ mainWindow, userDataPath }) {
    ipcMain.handle('scan-osu-folder', async (event, folderPath, forceRescan = false) => {
        try {
            if (!forceRescan && fsSync.existsSync(songsCacheFile)) {
                const cacheData = JSON.parse(await fs.readFile(songsCacheFile, 'utf-8'));

                // If cache exists for this folder
                if (cacheData[folderPath]?.songs?.length > 0) {
                    const firstSong = cacheData[folderPath].songs[0];
                    if (firstSong.folderPath && fsSync.existsSync(firstSong.folderPath)) {
                        console.log('[Cache] Using cached songs for', folderPath);
                        return { success: true, songs: cacheData[folderPath].songs, fromCache: true };
                    }
                }
            }

            console.log('[Scan] Performing full scan (forceRescan:', forceRescan, ')');
            const result = await scanOsuFolder(folderPath, event.sender);

            if (result.success && result.songs.length > 0) {
                let cache = {};
                if (fsSync.existsSync(songsCacheFile)) {
                    try {
                        cache = JSON.parse(await fs.readFile(songsCacheFile, 'utf-8'));
                    } catch { }
                }
                cache[folderPath] = { songs: result.songs, date: new Date().toISOString() };
                await fs.writeFile(songsCacheFile, JSON.stringify(cache, null, 2), 'utf-8');
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
                return JSON.parse(str);
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
}
