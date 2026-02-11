import { app } from 'electron';
import path from 'path';

// Get user data folder
const userDataPath = app.getPath('userData');

// Define file paths within user data
const userDataFile = path.join(userDataPath, 'userdata.json');
const songsCacheFile = path.join(userDataPath, 'songs-cache.json');
const widgetThemesPath = path.join(userDataPath, 'widgets');
const profilesPath = path.join(userDataPath, 'profiles');

export { userDataPath, userDataFile, songsCacheFile, widgetThemesPath, profilesPath };