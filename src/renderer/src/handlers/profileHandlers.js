export const getSettingsSnapshot = (deps) => {
  const {
    volume,
    autoplay,
    shuffle,
    repeat,
    discordRpcEnabled,
    widgetServerEnabled,
    albumArtBlur,
    blurIntensity,
    accentColor,
    minDurationValue,
    itemsPerPage,
    eqBands,
    hiddenArtists,
    nameFilter,
    nameFilterMode,
    scanAllMaps,
    dedupeTitlesEnabled,
    showSongBadges,
    vuEnabled
  } = deps;

  return {
    volume,
    autoplay,
    shuffle,
    repeat,
    discordRpcEnabled,
    widgetServerEnabled,
    albumArtBlur,
    blurIntensity,
    accentColor,
    minDurationValue,
    itemsPerPage,
    eqBands,
    hiddenArtists,
    nameFilter,
    nameFilterMode,
    scanAllMaps,
    dedupeTitlesEnabled,
    showSongBadges,
    vuEnabled,
    sortBy: localStorage.getItem('sortBy') || 'none',
    sortDuration: localStorage.getItem('sortDuration') || 'none'
  };
};

export const applySettingsFromData = ({ settings, setters, normalizeEqBands, electronAPI, logPrefix }) => {
  if (!settings) return;
  const s = settings;
  const {
    setVolume,
    setAutoplay,
    setShuffle,
    setRepeat,
    setDiscordRpcEnabled,
    setWidgetServerEnabled,
    setAlbumArtBlur,
    setBlurIntensity,
    setAccentColor,
    setVuEnabled,
    setMinDurationValue,
    setItemsPerPage,
    setEqBands,
    setHiddenArtists,
    setNameFilter,
    setNameFilterMode,
    setScanAllMaps,
    setDedupeTitlesEnabled,
    setShowSongBadges
  } = setters;

  if (s.volume !== undefined) setVolume(s.volume);
  if (s.autoplay !== undefined) setAutoplay(s.autoplay);
  if (s.shuffle !== undefined) setShuffle(s.shuffle);
  if (s.repeat !== undefined) setRepeat(s.repeat);
  if (s.discordRpcEnabled !== undefined) setDiscordRpcEnabled(s.discordRpcEnabled);
  if (s.widgetServerEnabled !== undefined) {
    setWidgetServerEnabled(s.widgetServerEnabled);
    if (s.widgetServerEnabled && electronAPI) {
      setTimeout(async () => {
        const isRunning = await electronAPI.widgetIsRunning();
        if (!isRunning) {
          const result = await electronAPI.widgetStartServer(3737);
          if (result.success) {
            console.log(`[${logPrefix}] Auto-started widget server`);
          }
        }
      }, 500);
    }
  }
  if (s.albumArtBlur !== undefined) setAlbumArtBlur(s.albumArtBlur);
  if (s.blurIntensity !== undefined) setBlurIntensity(s.blurIntensity);
  if (s.accentColor !== undefined) setAccentColor(s.accentColor);
  if (s.vuEnabled !== undefined) setVuEnabled(s.vuEnabled);
  if (s.minDurationValue !== undefined) setMinDurationValue(s.minDurationValue);
  if (s.itemsPerPage !== undefined) setItemsPerPage(s.itemsPerPage);
  if (s.eqBands !== undefined) setEqBands(normalizeEqBands(s.eqBands));
  if (Array.isArray(s.hiddenArtists)) {
    setHiddenArtists(s.hiddenArtists.length === 0 ? ['Unknown Artist'] : s.hiddenArtists);
  }
  if (typeof s.nameFilter === 'string') setNameFilter(s.nameFilter);
  if (typeof s.nameFilterMode === 'string') {
    setNameFilterMode(s.nameFilterMode === 'exact' ? 'contains' : s.nameFilterMode);
  }
  if (typeof s.scanAllMaps === 'boolean') setScanAllMaps(s.scanAllMaps);
  if (typeof s.dedupeTitlesEnabled === 'boolean') setDedupeTitlesEnabled(s.dedupeTitlesEnabled);
  if (typeof s.showSongBadges === 'boolean') setShowSongBadges(s.showSongBadges);
  if (s.sortBy !== undefined) localStorage.setItem('sortBy', s.sortBy);
  if (s.sortDuration !== undefined) localStorage.setItem('sortDuration', s.sortDuration);
};

export const handleExportData = ({ settings, version }) => {
  const exportData = {
    settings,
    exportDate: new Date().toISOString(),
    version
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sosu-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const handleImportData = ({ event, applySettings }) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importData = JSON.parse(e.target.result);
      if (importData.settings) {
        applySettings(importData.settings);
      }
      alert('Data imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import data. Please check the file format.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
};

export const getProfileData = ({ settings, version }) => {
  return {
    settings,
    savedDate: new Date().toISOString(),
    version
  };
};

export const handleSaveProfile = async ({ profileName, profileData, electronAPI }) => {
  if (!profileName || !profileName.trim()) {
    alert('Please enter a profile name');
    return false;
  }

  try {
    if (electronAPI) {
      const result = await electronAPI.profileSave(profileName, profileData);
      if (!result.success) {
        throw new Error(result.error);
      }
    } else {
      localStorage.setItem(`sosu-profile-${profileName}`, JSON.stringify(profileData));
    }

    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('Failed to save profile: ' + error.message);
    return false;
  }
};

export const handleLoadProfile = async ({ profileName, electronAPI, applySettings }) => {
  try {
    let profileData;

    if (electronAPI) {
      const result = await electronAPI.profileLoad(profileName);
      if (!result.success) {
        alert('Profile not found');
        return false;
      }
      profileData = result.data;
    } else {
      const profileDataStr = localStorage.getItem(`sosu-profile-${profileName}`);
      if (!profileDataStr) {
        alert('Profile not found');
        return false;
      }
      profileData = JSON.parse(profileDataStr);
    }

    if (profileData.settings) {
      applySettings(profileData.settings);
    }

    return true;
  } catch (error) {
    console.error('Error loading profile:', error);
    alert('Failed to load profile: ' + error.message);
    return false;
  }
};

export const handleDeleteProfile = async ({ profileName, electronAPI }) => {
  try {
    if (electronAPI) {
      const result = await electronAPI.profileDelete(profileName);
      if (!result.success) {
        throw new Error(result.error);
      }
    } else {
      localStorage.removeItem(`sosu-profile-${profileName}`);
    }
    return true;
  } catch (error) {
    console.error('Error deleting profile:', error);
    alert('Failed to delete profile: ' + error.message);
    return false;
  }
};

export const handleListProfiles = async ({ electronAPI }) => {
  try {
    if (electronAPI) {
      const result = await electronAPI.profileList();
      return result.success ? result.profiles : [];
    }

    const profiles = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sosu-profile-')) {
        const profileName = key.replace('sosu-profile-', '');
        try {
          const data = JSON.parse(localStorage.getItem(key));
          profiles.push({
            name: profileName,
            savedDate: data.savedDate || 'Unknown',
            version: data.version || 'Unknown'
          });
        } catch (e) {
          profiles.push({
            name: profileName,
            savedDate: 'Unknown',
            version: 'Unknown'
          });
        }
      }
    }

    return profiles.sort((a, b) => {
      const dateA = new Date(a.savedDate);
      const dateB = new Date(b.savedDate);
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error listing profiles:', error);
    return [];
  }
};

export const handleExportProfile = async ({ profileName, electronAPI }) => {
  try {
    let profileDataStr;

    if (electronAPI) {
      const result = await electronAPI.profileLoad(profileName);
      if (!result.success) {
        alert('Profile not found');
        return;
      }
      profileDataStr = JSON.stringify(result.data, null, 2);
    } else {
      profileDataStr = localStorage.getItem(`sosu-profile-${profileName}`);
      if (!profileDataStr) {
        alert('Profile not found');
        return;
      }
    }

    const dataBlob = new Blob([profileDataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sosu-profile-${profileName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting profile:', error);
    alert('Failed to export profile: ' + error.message);
  }
};
