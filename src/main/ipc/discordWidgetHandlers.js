import { ipcMain } from 'electron';
import * as discord from '../services/discord.js';
import * as widgetServer from '../services/widgetServer.js';
import fsSync from 'fs';
import path from 'path';
import { widgetThemesPath } from '../config/paths.js';

// Handlers for Discord Rich Presence and the HTTP widget server.
export function registerDiscordWidgetHandlers() {
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
      if (fsSync.existsSync(widgetThemesPath)) {
        const themes = fsSync.readdirSync(widgetThemesPath);
        for (const theme of themes) {
          if (theme !== 'default') {
            const themeDir = path.join(widgetThemesPath, theme);
            fsSync.rmSync(themeDir, { recursive: true, force: true });
          }
        }
      }
      return { success: true, message: 'All custom widgets deleted' };
    } catch (err) {
      console.error('[IPC] Error clearing widgets:', err);
      return { success: false, error: err.message };
    }
  });
}

