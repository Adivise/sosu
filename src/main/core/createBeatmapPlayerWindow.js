import { BrowserWindow } from 'electron';
import path from 'path';
import { is } from '@electron-toolkit/utils';

let beatmapPlayerWindow = null;
let beatmapData = null;

export function createBeatmapPlayerWindow(data) {
    // Close existing window if open
    if (beatmapPlayerWindow && !beatmapPlayerWindow.isDestroyed()) {
        beatmapPlayerWindow.close();
    }

    // Store beatmap data
    beatmapData = data;

    beatmapPlayerWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#1a1a2e',
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    });

    beatmapPlayerWindow.setMenu(null);

    beatmapPlayerWindow.on('ready-to-show', () => {
        console.log('[BeatmapPlayerWindow] Window is ready to show');
        beatmapPlayerWindow.show();
        beatmapPlayerWindow.focus();
        
        // Open DevTools for development
        if (is.dev) {
            beatmapPlayerWindow.webContents.openDevTools();
        }
        
        // Send beatmap data after window is ready
        if (beatmapData) {
            console.log('[BeatmapPlayerWindow] Sending beatmap data, size:', beatmapData.base64?.length);
            beatmapPlayerWindow.webContents.send('beatmap-data', beatmapData);
        } else {
            console.error('[BeatmapPlayerWindow] No beatmap data to send!');
        }
    });

    beatmapPlayerWindow.on('closed', () => {
        beatmapPlayerWindow = null;
        beatmapData = null;
    });

    // Log any load errors
    beatmapPlayerWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('[BeatmapPlayerWindow] Failed to load:', errorCode, errorDescription, validatedURL);
    });

    beatmapPlayerWindow.webContents.on('did-finish-load', () => {
        console.log('[BeatmapPlayerWindow] Page loaded successfully');
    });

    // Load the beatmap player HTML
    const url = is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/beatmap-player.html`
        : path.join(__dirname, '../renderer/beatmap-player.html');
    
    console.log('[BeatmapPlayerWindow] Loading URL:', url);
    
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        beatmapPlayerWindow.loadURL(url);
    } else {
        beatmapPlayerWindow.loadFile(url);
    }

    return beatmapPlayerWindow;
}

export function getBeatmapPlayerWindow() {
    return beatmapPlayerWindow;
}

export function getBeatmapData() {
    return beatmapData;
}

// Update stored beatmap data and forward to the player window (used for difficulty switching)
export function updateBeatmapData(data) {
    beatmapData = data;
    try {
        if (beatmapPlayerWindow && !beatmapPlayerWindow.isDestroyed()) {
            beatmapPlayerWindow.webContents.send('beatmap-data', beatmapData);
        }
    } catch (err) {
        console.error('[BeatmapPlayerWindow] Failed to forward updated beatmap data:', err);
    }
}

export function closeBeatmapPlayerWindow() {
    if (beatmapPlayerWindow && !beatmapPlayerWindow.isDestroyed()) {
        beatmapPlayerWindow.close();
    }
}
