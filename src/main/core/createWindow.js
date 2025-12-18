import { BrowserWindow } from 'electron';
import path from 'path';
import { is } from '@electron-toolkit/utils';

export default function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#121212',
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: true,
            autoplayPolicy: 'no-user-gesture-required',
            preload: path.join(__dirname, '../preload/preload.js'),
        },
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        show: true,
    });

    win.setMenu(null);

    if (is.dev) {
        // Development: Load Vite dev server or fallback localhost
        win.loadURL(process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173/');
        win.webContents.openDevTools(); // optional
    } else {
        // Production: Load built renderer index.html
        win.loadFile(path.join(__dirname, '../../out/renderer/index.html'));
    }

    return win;
}