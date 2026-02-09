import http from 'http';
import { WebSocketServer } from 'ws';
import { shell } from 'electron';
import { handleWidgets } from './widgetsHandler.js';
import { ensureDefaultTheme, loadTheme } from './widgets/index.js';
import { handlePreview } from './handlers/previewHandler.js';
import { serveWidgetsJS, serveWidgetsCSS, serveDocsCSS, serveThemeAsset, serveImage, serveFavicon } from './handlers/staticHandler.js';
import { handleJSON, handleStatus, handleDocs } from './handlers/apiHandler.js';
import { clearThemeCache } from './widgets/fetchGitHubThemes.js';
import { clearAllPreviews } from './helpers/previewCache.js';

let APP_VERSION;

let server = null;
let wss = null;
let currentPort = 3737;
let currentNowPlaying = null;

export function startServer(port = 3737) {
  return new Promise(async (resolve, reject) => {
    if (server) {
      reject(new Error('Server is already running'));
      return;
    }

    currentPort = port;
    
    // Ensure default theme exists before starting server
    await ensureDefaultTheme();

    server = http.createServer(async (req, res) => {
      // Parse URL to handle query parameters
      const url = new URL(req.url, `http://localhost:${port}`);
      
      // Widget HTML for OBS overlay (requires theme param)
      if (url.pathname === '/widget') {
        const themeParam = url.searchParams.get('theme');
        if (!themeParam) {
          res.writeHead(302, { Location: '/widgets' });
          res.end('Redirecting to /widgets');
          return;
        }
        const themeHTML = loadTheme(themeParam);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(themeHTML);
      }
      // Preview theme from GitHub (for non-installed themes)
      else if (url.pathname === '/preview') {
        const themeParam = url.searchParams.get('theme');
        await handlePreview(themeParam, req, res, currentPort);

      }
      // Serve widgets client JS
      else if (url.pathname === '/widgets.js') {
        serveWidgetsJS(res);
        return;
      }
      // Serve widgets CSS
      else if (url.pathname === '/widgets.css') {
        serveWidgetsCSS(res);
        return;
      }
      // Serve docs CSS
      else if (url.pathname === '/docs.css') {
        serveDocsCSS(res);
        return;
      }
      // Serve favicon
      else if (url.pathname === '/icon.ico' || url.pathname === '/favicon.ico') {
        serveFavicon(res);
        return;
      }
      // Serve theme asset files (e.g., /theme/default/style.css)
      else if (url.pathname.startsWith('/theme/')) {
        serveThemeAsset(url, res);
        return;
      }

      // Themes preview and actions
      else if (url.pathname === '/widgets') {
        try {
          await handleWidgets(req, res, url, currentPort);
          return;
        } catch (err) {
          console.error('[Widget] handleWidgets error', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Widgets handler error');
          return;
        }
      }

      // JSON API - Now Playing Data
      else if (url.pathname === '/json') {
        handleJSON(currentNowPlaying, res);
      } 
      // Server Status
      else if (url.pathname === '/status') {
        handleStatus(APP_VERSION, currentPort, wss, currentNowPlaying, res);
      } 
      // Documentation
      else if (url.pathname === '/docs') {
        handleDocs(currentPort, res);
      } 
      // Image serving - current playing song's album art
      else if (url.pathname === '/api/refresh') {
        try {
          clearThemeCache();
          clearAllPreviews();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Cache cleared successfully' }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      }
      else if (url.pathname === '/image') {
        serveImage(currentNowPlaying, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Create WebSocket server
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      console.log('[Widget] Client connected');
      
      // Send current now playing data immediately
      if (currentNowPlaying) {
        ws.send(JSON.stringify(currentNowPlaying));
      }

      ws.on('close', () => {
        console.log('[Widget] Client disconnected');
      });
    });

    server.on('error', (err) => {
      console.error('[Widget] Server error:', err);
      reject(err);
    });

    server.listen(port, () => {
      console.log(`[Widget] Server started on http://localhost:${port}`);
      resolve({ port, url: `http://localhost:${port}` });
      // Auto-open themes page on start
      try {
        shell.openExternal(`http://localhost:${port}/widgets`);
      } catch (e) {
        console.error('[Widget] Failed to open themes page:', e);
      }
    });
  });
}

export function stopServer() {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }

    // Close all WebSocket connections
    if (wss) {
      wss.clients.forEach(client => {
        client.close();
      });
      wss.close();
      wss = null;
    }

    server.close(() => {
      console.log('[Widget] Server stopped');
      server = null;
      resolve();
    });
  });
}

export function updateNowPlaying(data) {
  // Merge partial updates into the current state so widgets can receive lightweight updates
  if (data === null) {
    currentNowPlaying = null;
  } else {
    currentNowPlaying = Object.assign({}, currentNowPlaying || {}, data);
  }

  // Broadcast to all connected WebSocket clients the merged state
  if (wss) {
    const message = JSON.stringify(currentNowPlaying);
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

export function isServerRunning() {
  return server !== null;
}

export function getServerUrl() {
  if (!server) return null;
  return `http://localhost:${currentPort}`;
}

export function setAppVersion(version) {
  APP_VERSION = version;
  console.log('[Widget] App version set to:', version);
}

