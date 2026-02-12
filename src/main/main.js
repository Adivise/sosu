import { app, protocol, Tray, Menu } from 'electron';
import createWindow from './core/createWindow.js';
import * as protocols from './core/protocols.js';
import * as ipcHandlers from './ipc/ipcHandlers.js';
import * as updater from './config/updater.js';
import { userDataPath, userDataFile } from './config/paths.js';
import { destroy as destroyDiscord } from './services/discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check hardware acceleration setting before app ready
try {
  if (fs.existsSync(userDataFile)) {
    const userData = JSON.parse(fs.readFileSync(userDataFile, 'utf-8'));
    // Default to true if not set, only disable if explicitly false
    if (userData.hardwareAcceleration === false) {
      console.log('[Main] Hardware acceleration disabled by user setting');
      app.disableHardwareAcceleration();
    }
  }
} catch (err) {
  console.error('[Main] Error reading hardware acceleration setting:', err);
  // Continue with default (enabled)
}

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
let tray = null;
let isQuitting = false;

function createTray() {
  let iconFile = 'icon.png';
  if (process.platform === 'win32') {
    iconFile = 'icon.ico';
  } else if (process.platform === 'darwin') {
    iconFile = 'icon.icns';
  }

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icons', iconFile)
    : path.join(__dirname, `../../resources/icons/${iconFile}`);
  
  console.log('[Main] Tray icon path:', iconPath);
  
  try {
    tray = new Tray(iconPath);
    console.log('[Main] Tray created successfully');
  } catch (err) {
    console.error('[Main] Error creating tray:', err);
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  if (tray) {
    tray.setToolTip('sosu!');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
}

app.whenReady().then(async () => {
  console.log('[Main] App is ready');
  
  // Register custom protocols
  protocols.registerAppProtocol();
  protocols.registerOsuProtocol();

  // Create tray
  createTray();

  // Create main window
  mainWindow = createWindow();
  console.log('[Main] Main window created, visible:', mainWindow.isVisible());
  
  const setIsQuitting = () => { isQuitting = true; };
  await ipcHandlers.init({ mainWindow, userDataPath, setIsQuitting });

  // Handle close event (minimize to tray if enabled)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.webContents.send('app-close-requested');
    }
  });

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
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  try {
    destroyDiscord();
  } catch (e) {
    console.error('Error destroying Discord RPC:', e);
  }
});