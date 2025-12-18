import { app, protocol } from 'electron';
import createWindow from './core/createWindow.js';
import * as protocols from './core/protocols.js';
import * as ipcHandlers from './ipc/ipcHandlers.js';
import * as updater from './config/updater.js';
import { userDataPath } from './config/paths.js';
import { destroy as destroyDiscord } from './services/discord.js';

// Register privileged scheme for app:// URLs
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

let mainWindow = null;

app.whenReady().then(async () => {
  // Register custom protocols
  protocols.registerAppProtocol();
  protocols.registerOsuProtocol();

  // Create main window
  mainWindow = createWindow();
  await ipcHandlers.init({ mainWindow, userDataPath });

  // Initialize auto updater
  updater.init();
  setTimeout(() => updater.checkForUpdates(), 3000);

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try {
    destroyDiscord();
  } catch (e) {
    console.error('Error destroying Discord RPC:', e);
  }
});