import { ipcMain } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { userDataFile, songsCacheFile, profilesPath, widgetThemesPath } from '../config/paths.js';

// Handlers for main application window controls and full-reset logic.
export function registerWindowAppHandlers({ mainWindow, setIsQuitting }) {
  ipcMain.handle('window-minimize', () => mainWindow?.minimize());

  ipcMain.handle('window-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });

  ipcMain.handle('window-close', () => mainWindow?.close());

  ipcMain.handle('window-set-title', (e, title) => {
    if (mainWindow) {
      mainWindow.setTitle(title || 'sosu');
    }
    return { success: true };
  });

  // App control - minimize to tray or quit
  ipcMain.handle('app-minimize-to-tray', () => {
    mainWindow?.hide();
    return { success: true };
  });

  ipcMain.handle('app-quit', () => {
    const { app } = require('electron');
    setIsQuitting();
    console.log('[IPC] app-quit handler: setting isQuitting and calling app.quit()');
    app.quit();
    return { success: true };
  });

  ipcMain.handle('app-restart', () => {
    const { app } = require('electron');
    app.relaunch();
    app.quit();
    return { success: true };
  });

  ipcMain.handle('app-full-reset', async () => {
    const { app } = require('electron');
    try {
      if (fsSync.existsSync(userDataFile)) {
        await fs.unlink(userDataFile);
      }
      if (fsSync.existsSync(songsCacheFile)) {
        await fs.unlink(songsCacheFile);
      }
      if (fsSync.existsSync(profilesPath)) {
        await fs.rm(profilesPath, { recursive: true, force: true });
      }
      if (fsSync.existsSync(widgetThemesPath)) {
        await fs.rm(widgetThemesPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('[Reset] Full reset failed:', err);
      return { success: false, error: err.message };
    }

    setTimeout(() => {
      try {
        app.relaunch();
        app.exit(0);
      } catch (e) {
        app.quit();
      }
    }, 100);

    return { success: true };
  });

  // Open a file system path in the OS (folder or file)
  ipcMain.handle('open-path', async (e, targetPath) => {
    try {
      const { shell } = require('electron');
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
}

