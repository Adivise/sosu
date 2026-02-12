const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectOsuFolder: () => ipcRenderer.invoke('select-osu-folder'),
  scanOsuFolder: (folderPath, forceRescan = false, scanAllMaps = false) => ipcRenderer.invoke('scan-osu-folder', folderPath, forceRescan, scanAllMaps),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
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
});

