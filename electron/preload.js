const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectOsuFolder: () => ipcRenderer.invoke('select-osu-folder'),
  scanOsuFolder: (folderPath) => ipcRenderer.invoke('scan-osu-folder', folderPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
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
});

