const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectOsuFolder: () => ipcRenderer.invoke('select-osu-folder'),
  scanOsuFolder: (folderPath, forceRescan = false, scanAllMaps = false) => ipcRenderer.invoke('scan-osu-folder', folderPath, forceRescan, scanAllMaps),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  openBeatmapPlayer: (folderPath) => ipcRenderer.invoke('open-beatmap-player', folderPath),
  requestBeatmapData: () => ipcRenderer.invoke('get-beatmap-data'),
  onBeatmapData: (callback) => {
    ipcRenderer.on('beatmap-data', (event, data) => callback(data));
  },
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowSetTitle: (title) => ipcRenderer.invoke('window-set-title', title),
  appMinimizeToTray: () => ipcRenderer.invoke('app-minimize-to-tray'),
  appQuit: () => ipcRenderer.invoke('app-quit'),
  appRestart: () => ipcRenderer.invoke('app-restart'),
  appFullReset: () => ipcRenderer.invoke('app-full-reset'),
  onAppCloseRequested: (callback) => {
    ipcRenderer.on('app-close-requested', () => callback());
  },
  removeAppCloseRequestedListener: () => {
    ipcRenderer.removeAllListeners('app-close-requested');
  },
  onScanProgress: (callback) => {
    ipcRenderer.on('scan-progress', (event, data) => callback(data));
  },
  removeScanProgressListener: () => {
    ipcRenderer.removeAllListeners('scan-progress');
  },
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  saveUserData: (data) => ipcRenderer.invoke('save-user-data', data),
  // Preview-specific persistence (beatmap preview settings, etc.)
  getPreviewData: () => ipcRenderer.invoke('get-preview-data'),
  savePreviewData: (data) => ipcRenderer.invoke('save-preview-data', data),
  setDiscordRichPresence: (enabled, presenceData) => ipcRenderer.invoke('set-rich-presence', enabled, presenceData),
  getSongsCache: () => ipcRenderer.invoke('get-songs-cache'),
  saveSongsCache: (cache) => ipcRenderer.invoke('save-songs-cache', cache),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  
  // Widget Server APIs
  widgetStartServer: (port) => ipcRenderer.invoke('widget-start-server', port),
  widgetStopServer: () => ipcRenderer.invoke('widget-stop-server'),
  widgetIsRunning: () => ipcRenderer.invoke('widget-is-running'),
  widgetGetUrl: () => ipcRenderer.invoke('widget-get-url'),
  widgetUpdateNowPlaying: (data) => ipcRenderer.send('widget-update-now-playing', data),
  widgetSetVersion: (version) => ipcRenderer.invoke('widget-set-version', version),
  clearAllWidgets: () => ipcRenderer.invoke('clear-all-widgets'),

  // Profile Management APIs
  profileSave: (profileName, profileData) => ipcRenderer.invoke('profile-save', profileName, profileData),
  profileLoad: (profileName) => ipcRenderer.invoke('profile-load', profileName),
  profileDelete: (profileName) => ipcRenderer.invoke('profile-delete', profileName),
  profileList: () => ipcRenderer.invoke('profile-list'),

  // Theme sync for beatmap preview
  updateBeatmapPlayerTheme: (themeVars) => ipcRenderer.send('update-beatmap-player-theme', themeVars),
  onThemeUpdate: (callback) => {
    ipcRenderer.on('update-theme', (event, vars) => callback(vars));
  },
  getBeatmapPlayerTheme: () => ipcRenderer.invoke('get-beatmap-player-theme'),

  // Event fired when the beatmap player window is closed
  onBeatmapPlayerClosed: (callback) => {
    ipcRenderer.on('beatmap-player-closed', () => callback());
  },
  removeBeatmapPlayerClosedListener: () => {
    ipcRenderer.removeAllListeners('beatmap-player-closed');
  },

  // Preview difficulty switching
  previewLoadDifficulty: (folderPath, osuFilename) => ipcRenderer.invoke('preview-load-difficulty', folderPath, osuFilename),
  // Get all difficulties from a song folder
  getSongDifficulties: (folderPath, osuFiles) => ipcRenderer.invoke('get-song-difficulties', folderPath, osuFiles),
});

