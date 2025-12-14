const { app, BrowserWindow, ipcMain, dialog, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { parseFile } = require('music-metadata');
let RPC;
try {
  RPC = require('discord-rpc');
} catch (e) {
  RPC = undefined;
}

// Register app:// as privileged scheme so localStorage etc. works
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    }
  }
]);

const userDataPath = app.getPath('userData');
const userDataFile = path.join(userDataPath, 'sosu-userdata.json');
const songsCacheFile = path.join(userDataPath, 'sosu-songs-cache.json');
let discordClient = null;
let lastRichPresence = null;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    titleBarStyle: 'hidden'
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // Get the correct path to build files - works in both dev and production
  const appPath = app.getAppPath();
  const buildPath = path.join(appPath, 'build', 'index.html');
  const buildExists = require('fs').existsSync(buildPath);
  
  if (isDev) {
    // Try to load from dev server, fallback to build if available
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      if (buildExists) {
        console.log('Dev server not available, loading from build...');
        // Use app:// protocol for proper asset loading
        mainWindow.loadURL(`app://build/index.html`);
      } else {
        console.error('Dev server not available and no build found. Please run "npm run dev" or "npm run build" first.');
        mainWindow.loadURL('data:text/html,<html><body style="background:#121212;color:#fff;font-family:sans-serif;padding:40px;text-align:center;"><h1>Development Server Not Running</h1><p>Please run <code>npm run dev</code> to start the development server.</p><p>Or run <code>npm run build</code> first, then <code>npm start</code>.</p></body></html>');
      }
    });
    // mainWindow.webContents.openDevTools();
  } else {
    if (buildExists) {
      // Use app:// protocol for proper asset loading in production
      mainWindow.loadURL(`app://build/index.html`);
    } else {
      console.error('Build not found at:', buildPath);
      mainWindow.loadURL('data:text/html,<html><body style="background:#121212;color:#fff;font-family:sans-serif;padding:40px;text-align:center;"><h1>Build Not Found</h1><p>Build files not found in packaged app.</p></body></html>');
    }
  }
}

// Register custom protocol for serving app files
function registerAppProtocol() {
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      let url = request.url.substr(6); // Remove 'app://' prefix
      const appPath = app.getAppPath();
      const buildPath = path.join(appPath, 'build');
      
      // Handle root path or index.html
      if (url === '/' || url === '' || url === 'index.html') {
        url = 'index.html';
      }
      
      // Remove 'build/' prefix if present
      if (url.startsWith('build/')) {
        url = url.substr(6);
      }
      
      // Handle absolute paths from React build (e.g., /static/css/main.xxx.css)
      // These come as app://static/css/main.xxx.css, we need build/static/css/main.xxx.css
      if (url.startsWith('/')) {
        url = url.substr(1); // Remove leading slash
      }
      
      // All files are in the build directory
      const filePath = path.join(buildPath, url);
      
      callback({ path: filePath });
    } catch (error) {
      console.error('Error serving app file:', error, request.url);
      callback({ error: -6 });
    }
  });
}

// Register protocols before app is ready  
app.whenReady().then(() => {
  // Register app protocol for serving build files
  registerAppProtocol();
  
  protocol.registerFileProtocol('osu', (request, callback) => {
    try {
      // Extract path from osu:// URL
      // URL format: osu://E%3A/path/to/file.jpg (URL encoded)
      let filePath = request.url.replace('osu://', '');
      // Decode the URL-encoded path
      filePath = decodeURIComponent(filePath);
      // Normalize path separators - keep as is since Windows handles both / and \
      
      callback({ path: filePath });
    } catch (error) {
      console.error('Error serving file:', error, request.url);
      callback({ error: -6 }); // FILE_NOT_FOUND
    }
  });
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('select-osu-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select osu! Songs Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('scan-osu-folder', async (event, folderPath) => {
  try {
    // Check if we have cached metadata for this folder
    const cacheFile = path.join(userDataPath, 'sosu-songs-cache.json');
    if (fsSync.existsSync(cacheFile)) {
      try {
        const cacheData = await fs.readFile(cacheFile, 'utf-8');
        const cache = JSON.parse(cacheData);
        if (cache[folderPath] && cache[folderPath].songs) {
          // Verify cache is still valid by checking if folder still exists
          // and if any songs still exist (quick check - just first song)
          const cachedSongs = cache[folderPath].songs;
          if (cachedSongs.length > 0) {
            const firstSong = cachedSongs[0];
            if (firstSong.folderPath && fsSync.existsSync(firstSong.folderPath)) {
              // Cache is valid, return it immediately
              return { success: true, songs: cachedSongs, fromCache: true };
            }
          }
        }
      } catch (err) {
        console.error('Error reading cache:', err);
        // Continue to scan if cache read fails
      }
    }
    
    // No valid cache, proceed with scanning
    const songs = [];
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    
    // First, count directories that have both .osu and audio files
    let totalSongs = 0;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const songPath = path.join(folderPath, entry.name);
          const songFiles = await fs.readdir(songPath);
          const osuFiles = songFiles.filter(f => f.endsWith('.osu'));
          const audioFiles = songFiles.filter(f => /\.(mp3|ogg|wav|flac)$/i.test(f));
          if (osuFiles.length > 0 && audioFiles.length > 0) {
            totalSongs++;
          }
        } catch (err) {
          // Skip directories we can't read
        }
      }
    }
    
    let processedCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const songPath = path.join(folderPath, entry.name);
        const songFiles = await fs.readdir(songPath);
        
        // Look for .osu files and audio files
        const osuFiles = songFiles.filter(f => f.endsWith('.osu'));
        const audioFiles = songFiles.filter(f => 
          /\.(mp3|ogg|wav|flac)$/i.test(f)
        );
        const imageFiles = songFiles.filter(f => 
          /\.(jpg|jpeg|png|gif|bmp)$/i.test(f)
        );

        if (osuFiles.length > 0 && audioFiles.length > 0) {
          const audioFilePath = path.join(songPath, audioFiles[0]);
          
          // Read .osu file for metadata (fallback)
          const osuFilePath = path.join(songPath, osuFiles[0]);
          const osuContent = await fs.readFile(osuFilePath, 'utf-8');
          const osuMetadata = parseOsuFile(osuContent);
          
          // Try to read audio metadata
          let audioMetadata = null;
          let embeddedImage = null;
          let duration = null;
          
          try {
            audioMetadata = await parseFile(audioFilePath);
            
            // Extract duration
            if (audioMetadata.format.duration) {
              duration = audioMetadata.format.duration;
            }
            
            // Extract embedded album art
            if (audioMetadata.common.picture && audioMetadata.common.picture.length > 0) {
              const picture = audioMetadata.common.picture[0];
              // Save embedded image to a temp file or use data URI
              // For now, we'll prefer external images but can use embedded if no external image
              embeddedImage = {
                data: picture.data,
                format: picture.format,
                description: picture.description
              };
            }
          } catch (error) {
            console.error(`Error reading audio metadata for ${audioFiles[0]}:`, error.message);
          }
          
          // Determine which image to use (prefer external, fallback to embedded)
          let imageFile = null;
          let imageFileName = null;
          
          if (imageFiles.length > 0) {
            imageFile = path.join(songPath, imageFiles[0]);
            imageFileName = imageFiles[0];
          } else if (embeddedImage) {
            // Save embedded image to temp file
            const imageExt = embeddedImage.format === 'image/jpeg' ? 'jpg' : 
                           embeddedImage.format === 'image/png' ? 'png' : 'jpg';
            const embeddedImagePath = path.join(songPath, `embedded_cover.${imageExt}`);
            try {
              await fs.writeFile(embeddedImagePath, embeddedImage.data);
              imageFile = embeddedImagePath;
              imageFileName = `embedded_cover.${imageExt}`;
            } catch (error) {
              console.error('Error saving embedded image:', error);
            }
          }
          
          // Try to extract beatmap set ID from folder name (format: "123456 Artist - Title")
          let beatmapSetId = osuMetadata.beatmapSetId;
          if (!beatmapSetId && entry.name) {
            const folderMatch = entry.name.match(/^(\d+)\s/);
            if (folderMatch) {
              beatmapSetId = parseInt(folderMatch[1]);
            }
          }
          
          songs.push({
            id: entry.name,
            folderName: entry.name,
            folderPath: songPath,
            title: audioMetadata?.common?.title || osuMetadata.title || entry.name,
            artist: audioMetadata?.common?.artist || 
                   (audioMetadata?.common?.artists && audioMetadata.common.artists.join(', ')) ||
                   osuMetadata.artist || 'Unknown Artist',
            album: audioMetadata?.common?.album || null,
            audioFile: audioFilePath,
            audioFileName: audioFiles[0],
            imageFile: imageFile,
            imageFileName: imageFileName,
            duration: duration,
            bpm: osuMetadata.bpm || null,
            difficulty: osuMetadata.difficulty || null,
            year: audioMetadata?.common?.year || null,
            genre: audioMetadata?.common?.genre?.join(', ') || null,
            beatmapSetId: beatmapSetId,
            beatmapId: osuMetadata.beatmapId
          });
        }
        
        // Send progress update
        processedCount++;
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('scan-progress', {
            current: processedCount,
            total: totalSongs
          });
        }
      }
    }

    return { success: true, songs };
  } catch (error) {
    console.error('Error scanning folder:', error);
    return { success: false, error: error.message };
  }
});

function parseOsuFile(content) {
  const metadata = {
    title: null,
    artist: null,
    bpm: null,
    difficulty: null,
    beatmapSetId: null,
    beatmapId: null
  };

  const lines = content.split('\n');
  let inMetadata = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === '[Metadata]') {
      inMetadata = true;
      continue;
    }
    
    if (trimmed.startsWith('[') && trimmed !== '[Metadata]') {
      inMetadata = false;
      continue;
    }

    if (inMetadata) {
      if (trimmed.startsWith('Title:')) {
        metadata.title = trimmed.substring(6).trim();
      } else if (trimmed.startsWith('TitleUnicode:')) {
        metadata.title = metadata.title || trimmed.substring(13).trim();
      } else if (trimmed.startsWith('Artist:')) {
        metadata.artist = trimmed.substring(7).trim();
      } else if (trimmed.startsWith('ArtistUnicode:')) {
        metadata.artist = metadata.artist || trimmed.substring(14).trim();
      } else if (trimmed.startsWith('Version:')) {
        metadata.difficulty = trimmed.substring(8).trim();
      } else if (trimmed.startsWith('BeatmapSetID:')) {
        metadata.beatmapSetId = parseInt(trimmed.substring(13).trim()) || null;
      } else if (trimmed.startsWith('BeatmapID:')) {
        metadata.beatmapId = parseInt(trimmed.substring(10).trim()) || null;
      }
    }

    if (trimmed.startsWith('ApproachRate:') || trimmed.startsWith('OverallDifficulty:')) {
      metadata.difficulty = metadata.difficulty || trimmed.split(':')[1]?.trim();
    }
  }

  // Try to extract BPM from timing points
  const bpmMatch = content.match(/BPM:\s*(\d+\.?\d*)/i);
  if (bpmMatch) {
    metadata.bpm = parseFloat(bpmMatch[1]);
  }

  return metadata;
}

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return { success: true, data: data.toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Window control handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// IPC handlers for user data file and discord presence
ipcMain.handle('get-user-data', async () => {
  try {
    if (fsSync.existsSync(userDataFile)) {
      const str = await fs.readFile(userDataFile, 'utf-8');
      return JSON.parse(str);
    }
  } catch { }
  return null;
});
ipcMain.handle('save-user-data', async (e, data) => {
  try {
    await fs.writeFile(userDataFile, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Songs cache handlers
ipcMain.handle('get-songs-cache', async () => {
  try {
    if (fsSync.existsSync(songsCacheFile)) {
      const str = await fs.readFile(songsCacheFile, 'utf-8');
      return JSON.parse(str);
    }
  } catch (err) {
    console.error('Error loading songs cache:', err);
  }
  return null;
});

ipcMain.handle('save-songs-cache', async (e, cache) => {
  try {
    await fs.writeFile(songsCacheFile, JSON.stringify(cache, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-external', async (e, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-rich-presence', async (e, enabled, presenceData) => {
  discordEnabled = enabled;
  if (!RPC) return { success: false };
  if (enabled) {
    if (!discordClient) {
      discordClient = new RPC.Client({ transport: 'ipc' });
      discordClient.once('ready', () => {
        if (lastRichPresence) {
          discordClient.setActivity(lastRichPresence).catch(() => {});
        }
      });
      discordClient.on('error', (err) => {
        console.error('Discord RPC error:', err);
        discordClient = null;
      });
      try {
        await discordClient.login({ clientId: '1449446045892481297' }).catch(()=>{});
      } catch (err) {
        discordClient = null;
        return { success: false, error: err.message };
      }
    }
    if (presenceData) {
      // Format song title and artist (Discord has limits: 128 chars for details, 128 for state)
      const songTitle = (presenceData.title || 'Unknown Song').substring(0, 128);
      const songArtist = (presenceData.artist || 'Unknown Artist').substring(0, 128);
      const albumText = (presenceData.album || 'sosu').substring(0, 128);
      
      // Format duration
      let durationText = '';
      if (presenceData.duration) {
        const minutes = Math.floor(presenceData.duration / 60);
        const seconds = Math.floor(presenceData.duration % 60);
        durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      
      // Build presence object with custom rich presence
      lastRichPresence = {
        details: `Song: ${songTitle}`, // Main line - shows song title
        state: `Artist: ${songArtist}`, // Second line - shows artist name
        largeImageKey: 'osu_icon', // Fixed asset key (must be uploaded to Discord Developer Portal)
        largeImageText: albumText || songTitle, // Hover text for large image
        startTimestamp: presenceData.startTime ? Math.floor(presenceData.startTime/1000) : undefined,
        instance: false,
      };
      
      // Set small image based on playing state
      // Use "play" when playing, "pause" when paused
      if (presenceData.startTime) {
        // Song is playing
        lastRichPresence.smallImageKey = 'play';
        lastRichPresence.smallImageText = durationText || 'Playing';
      } else {
        // Song is paused
        lastRichPresence.smallImageKey = 'pause';
        lastRichPresence.smallImageText = 'Paused';
      }
      
      // Add buttons if beatmap URL is available (discord-rpc v4.0+ supports buttons)
      const buttons = [];
      if (presenceData.beatmapSetId) {
        // Generate osu! beatmap URL
        const beatmapUrl = presenceData.beatmapId 
          ? `https://osu.ppy.sh/beatmapsets/${presenceData.beatmapSetId}#osu/${presenceData.beatmapId}`
          : `https://osu.ppy.sh/beatmapsets/${presenceData.beatmapSetId}`;
        
        buttons.push({
          label: 'Beatmap',
          url: beatmapUrl
        });
      }
      
      // Add buttons if any exist (Discord allows up to 2 buttons)
      if (buttons.length > 0) {
        lastRichPresence.buttons = buttons.slice(0, 2); // Discord allows max 2 buttons
      }
      
      if (discordClient && discordClient.transport && discordClient.transport.socket) {
        // Only call if connection is open
        try {
          await discordClient.setActivity(lastRichPresence);
        } catch (err) {
          console.error('Error setting Discord activity:', err);
          // Ignore if communication is closed
        }
      }
    }
  } else {
    if (discordClient) {
      try { 
        await discordClient.clearActivity();
        await discordClient.destroy(); 
      } catch (e) {
        console.error('Error clearing Discord activity:', e);
      }
      discordClient = null;
    }
  }
  return { success: true };
});


app.on('before-quit', () => {
  if (discordClient) try { discordClient.destroy(); } catch(e) {}
});

// Save state on window close
app.on('window-all-closed', () => {
  // The save will be triggered by the React component before this
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

