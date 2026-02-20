import { app } from 'electron';
import path from 'path';

// Get user data folder
const userDataPath = app.getPath('userData');

// Define file paths within user data
const userDataFile = path.join(userDataPath, 'sosu-player-datas.json');
const songsCacheFile = path.join(userDataPath, 'sosu-caches.json');
const widgetThemesPath = path.join(userDataPath, 'sosu-widgets');
const profilesPath = path.join(userDataPath, 'sosu-profiles');
const previewDataFile = path.join(userDataPath, 'sosu-preview-datas.json');

export { userDataPath, userDataFile, songsCacheFile, widgetThemesPath, profilesPath, previewDataFile };