import { ipcMain } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { profilesPath } from '../config/paths.js';

// Handlers for saving/loading/deleting/listing user profiles.
export function registerProfileHandlers() {
  const ensureProfilesDir = async () => {
    try {
      await fs.mkdir(profilesPath, { recursive: true });
    } catch (err) {
      console.error('[Profiles] Error creating profiles directory:', err);
    }
  };

  ipcMain.handle('profile-save', async (event, profileName, profileData) => {
    try {
      await ensureProfilesDir();
      const profileFile = path.join(profilesPath, `${profileName}.json`);
      await fs.writeFile(profileFile, JSON.stringify(profileData, null, 2), 'utf-8');
      console.log(`[Profile] Saved profile: ${profileName}`);
      return { success: true };
    } catch (error) {
      console.error('[Profile] Error saving profile:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('profile-load', async (event, profileName) => {
    try {
      const profileFile = path.join(profilesPath, `${profileName}.json`);
      const data = await fs.readFile(profileFile, 'utf-8');
      const profileData = JSON.parse(data);
      console.log(`[Profile] Loaded profile: ${profileName}`);
      return { success: true, data: profileData };
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('profile-delete', async (event, profileName) => {
    try {
      const profileFile = path.join(profilesPath, `${profileName}.json`);
      await fs.unlink(profileFile);
      console.log(`[Profile] Deleted profile: ${profileName}`);
      return { success: true };
    } catch (error) {
      console.error('[Profile] Error deleting profile:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('profile-list', async () => {
    try {
      await ensureProfilesDir();
      const files = await fs.readdir(profilesPath);
      const profiles = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const profileFile = path.join(profilesPath, file);
            const data = await fs.readFile(profileFile, 'utf-8');
            const profileData = JSON.parse(data);
            const profileName = file.replace('.json', '');

            profiles.push({
              name: profileName,
              savedDate: profileData.savedDate || 'Unknown',
              version: profileData.version || 'Unknown'
            });
          } catch (err) {
            console.error(`[Profile] Error reading profile ${file}:`, err);
          }
        }
      }

      profiles.sort((a, b) => {
        const dateA = new Date(a.savedDate);
        const dateB = new Date(b.savedDate);
        return dateB - dateA;
      });

      console.log(`[Profile] Listed ${profiles.length} profiles`);
      return { success: true, profiles };
    } catch (error) {
      console.error('[Profile] Error listing profiles:', error);
      return { success: false, error: error.message, profiles: [] };
    }
  });
}

