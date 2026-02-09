import fs from 'fs';
import path from 'path';

/**
 * API route handlers for /json, /status, and /docs
 */

/**
 * Handle /json endpoint - return current now playing data
 * @param {object} currentNowPlaying - Current now playing data
 * @param {object} res - HTTP response object
 */
export function handleJSON(currentNowPlaying, res) {
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  
  if (currentNowPlaying && currentNowPlaying.title) {
    const isPaused = !!currentNowPlaying.paused;
    const responseData = {
      status: isPaused ? 'paused' : 'playing',
      song: {
        title: currentNowPlaying.title || 'Unknown Song',
        titleUnicode: currentNowPlaying.titleUnicode || null,
        artist: currentNowPlaying.artist || 'Unknown Artist',
        artistUnicode: currentNowPlaying.artistUnicode || null,
        creator: currentNowPlaying.creator || null,
        audioFilename: currentNowPlaying.audioFilename || null,
        bpm: currentNowPlaying.bpm || null,
        difficulty: currentNowPlaying.difficulty || null,
        version: currentNowPlaying.version || null,
        mode: (typeof currentNowPlaying.mode === 'number') ? currentNowPlaying.mode : null,
        beatmapSetId: currentNowPlaying.beatmapSetId || null,
        beatmapId: currentNowPlaying.beatmapId || null,
        album: currentNowPlaying.album || '',
        currentTime: currentNowPlaying.currentTime || 0,
        duration: currentNowPlaying.duration || 0,
        paused: isPaused,
        imageFile: currentNowPlaying.imageFile || null
      },
      progress: {
        current: currentNowPlaying.currentTime || 0,
        total: currentNowPlaying.duration || 0,
        percentage: currentNowPlaying.duration > 0 
          ? Math.round((currentNowPlaying.currentTime / currentNowPlaying.duration) * 100) 
          : 0
      },
      timestamp: Date.now()
    };
    res.end(JSON.stringify(responseData, null, 2));
  } else {
    res.end(JSON.stringify({
      status: 'idle',
      song: null,
      progress: null,
      timestamp: Date.now()
    }, null, 2));
  }
}

/**
 * Handle /status endpoint - return server status
 * @param {string} appVersion - Application version
 * @param {number} currentPort - Current server port
 * @param {object} wss - WebSocket server instance
 * @param {object} currentNowPlaying - Current now playing data
 * @param {object} res - HTTP response object
 */
export function handleStatus(appVersion, currentPort, wss, currentNowPlaying, res) {
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    server: 'sosu-widget-server',
    version: appVersion,
    status: 'online',
    port: currentPort,
    uptime: process.uptime(),
    connectedClients: wss ? wss.clients.size : 0,
    hasActiveSong: !!(currentNowPlaying && currentNowPlaying.title),
    timestamp: Date.now()
  }, null, 2));
}

/**
 * Handle /docs endpoint - serve API documentation
 * @param {number} currentPort - Current server port
 * @param {object} res - HTTP response object
 */
export function handleDocs(currentPort, res) {
  const docsPath = path.join(process.cwd(), 'src', 'main', 'services', 'templates', 'docs.html');
  
  if (!fs.existsSync(docsPath)) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Documentation template not found');
    return;
  }

  let html = fs.readFileSync(docsPath, 'utf8');
  html = html.replace(/\{\{PORT\}\}/g, currentPort);
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}
