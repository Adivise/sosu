import { BrowserWindow } from 'electron';
import path from 'path';
import { is } from '@electron-toolkit/utils';

export default function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1200,
        minHeight: 800,
        backgroundColor: '#121212',
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: true,
            autoplayPolicy: 'no-user-gesture-required',
            preload: path.join(__dirname, '../preload/preload.js'),
        },
        autoHideMenuBar: true,
        show: true,
    });

    win.setMenu(null);

    if (is.dev) {
        // Development: Load Vite dev server or fallback localhost
        const url = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173/';
        console.log('[createWindow] Loading URL:', url);
        win.loadURL(url).catch(err => {
            console.error('[createWindow] Error loading URL:', err);
        });
        win.webContents.openDevTools(); // optional
    } else {
        // Production: Load built renderer index.html
        const filePath = path.join(__dirname, '../../out/renderer/index.html');
        console.log('[createWindow] Loading file:', filePath);
        win.loadFile(filePath).catch(err => {
            console.error('[createWindow] Error loading file:', err);
        });
    }

    console.log('[createWindow] Window created, position:', win.getPosition(), 'size:', win.getSize());

    return win;
}