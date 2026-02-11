import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { scanOsuFolder } from '../services/osuScanner.js';
import * as discord from '../services/discord.js';
import * as widgetServer from '../services/widgetServer.js';
import { userDataFile, songsCacheFile, profilesPath } from '../config/paths.js';

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

    // App control - minimize to tray or quit
    ipcMain.handle('app-minimize-to-tray', () => {
        mainWindow?.hide();
        return { success: true };
    });

    ipcMain.handle('app-quit', () => {
        const { app } = require('electron');
        app.quit();
        return { success: true };
    });

    ipcMain.handle('app-restart', () => {
        const { app } = require('electron');
        app.relaunch();
        app.quit();
        return { success: true };
    });

    ipcMain.handle('get-user-data', async () => {
        console.log('[UserData] User data file path:', userDataFile);
        try {
            if (fsSync.existsSync(userDataFile)) {
                const str = await fs.readFile(userDataFile, 'utf-8');
                // Handle empty files
                if (!str || str.trim() === '') {
                    console.log('User data file is empty, returning null');
                    return null;
                }
                const data = JSON.parse(str);
                console.log('[UserData] Loaded user data keys:', Object.keys(data));
                return data;
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

    // Open a file system path in the OS (folder or file)
    ipcMain.handle('open-path', async (e, targetPath) => {
        try {
            // Use shell.openPath to open folder or file in the default file manager
            const res = await shell.openPath(targetPath);
            // openPath returns an empty string on success on some platforms
            if (res && res.length > 0) {
                console.error('shell.openPath returned:', res);
                return { success: false, error: res };
            }
            return { success: true };
        } catch (error) {
            console.error('Error opening path:', error);
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

    ipcMain.handle('clear-all-widgets', async () => {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const { widgetThemesPath } = await import('../config/paths.js');
            
            if (fs.existsSync(widgetThemesPath)) {
                // Get all widget directories except 'default'
                const themes = fs.readdirSync(widgetThemesPath);
                for (const theme of themes) {
                    if (theme !== 'default') {
                        const themeDir = path.join(widgetThemesPath, theme);
                        fs.rmSync(themeDir, { recursive: true, force: true });
                    }
                }
            }
            return { success: true, message: 'All custom widgets deleted' };
        } catch (err) {
            console.error('[IPC] Error clearing widgets:', err);
            return { success: false, error: err.message };
        }
    });

    // Profile Management Handlers
    
    // Ensure profiles directory exists
    const ensureProfilesDir = async () => {
        try {
            await fs.mkdir(profilesPath, { recursive: true });
        } catch (err) {
            console.error('[Profiles] Error creating profiles directory:', err);
        }
    };

    ipcMain.handle('profile-save', async (event, profileName, profileData) => {
        try {
            await ensureProfilesDir();
            const profileFile = path.join(profilesPath, `${profileName}.json`);
            await fs.writeFile(profileFile, JSON.stringify(profileData, null, 2), 'utf-8');
            console.log(`[Profile] Saved profile: ${profileName}`);
            return { success: true };
        } catch (error) {
            console.error('[Profile] Error saving profile:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('profile-load', async (event, profileName) => {
        try {
            const profileFile = path.join(profilesPath, `${profileName}.json`);
            const data = await fs.readFile(profileFile, 'utf-8');
            const profileData = JSON.parse(data);
            console.log(`[Profile] Loaded profile: ${profileName}`);
            return { success: true, data: profileData };
        } catch (error) {
            console.error('[Profile] Error loading profile:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('profile-delete', async (event, profileName) => {
        try {
            const profileFile = path.join(profilesPath, `${profileName}.json`);
            await fs.unlink(profileFile);
            console.log(`[Profile] Deleted profile: ${profileName}`);
            return { success: true };
        } catch (error) {
            console.error('[Profile] Error deleting profile:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('profile-list', async () => {
        try {
            await ensureProfilesDir();
            const files = await fs.readdir(profilesPath);
            const profiles = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const profileFile = path.join(profilesPath, file);
                        const data = await fs.readFile(profileFile, 'utf-8');
                        const profileData = JSON.parse(data);
                        const profileName = file.replace('.json', '');
                        
                        profiles.push({
                            name: profileName,
                            savedDate: profileData.savedDate || 'Unknown',
                            version: profileData.version || 'Unknown'
                        });
                    } catch (err) {
                        console.error(`[Profile] Error reading profile ${file}:`, err);
                    }
                }
            }
            
            // Sort by most recent first
            profiles.sort((a, b) => {
                const dateA = new Date(a.savedDate);
                const dateB = new Date(b.savedDate);
                return dateB - dateA;
            });
            
            console.log(`[Profile] Listed ${profiles.length} profiles`);
            return { success: true, profiles };
        } catch (error) {
            console.error('[Profile] Error listing profiles:', error);
            return { success: false, error: error.message, profiles: [] };
        }
    });
}
