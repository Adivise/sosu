import { protocol, app } from 'electron';
import path from 'path';

export function registerAppProtocol() {
    protocol.registerFileProtocol('app', (request, callback) => {
        try {
            let url = request.url.substring(6); // remove 'app://'
            const appPath = app.getAppPath();
            const buildPath = path.join(appPath, 'out', 'renderer');

            if (url === '/' || url === '' || url === 'index.html') url = 'index.html';
            if (url.startsWith('out/')) url = url.substring(4);
            if (url.startsWith('/')) url = url.substring(1);

            const filePath = path.join(buildPath, url);
            callback({ path: filePath });
        } catch (err) {
            console.error('[Protocol] app:// error:', err);
            callback({ error: -6 }); // FILE_NOT_FOUND
        }
    });
}

export function registerOsuProtocol() {
    protocol.registerFileProtocol('osu', (request, callback) => {
        try {
            const filePath = decodeURIComponent(request.url.replace('osu://', ''));
            callback({ path: filePath });
        } catch (err) {
            console.error('[Protocol] osu:// error:', err);
            callback({ error: -6 });
        }
    });
}