const DEFAULTS = {
  volume: 1,
  autoplay: false,
  shuffle: false,
  repeat: false,
  minDurationValue: 60,
  itemsPerPage: 50,
  albumArtBlur: true,
  blurIntensity: 60,
  accentColor: '#1db954',
  showSongBadges: false,
  hiddenArtists: ['Unknown Artist'],
  nameFilter: '',
  nameFilterMode: 'contains',
  scanAllMaps: false,
  dedupeTitlesEnabled: true,
  vuEnabled: true,
  closeToTray: true,
  askBeforeClose: true,
  hardwareAcceleration: true
};

const clearLocalStorageKeys = (keys) => {
  keys.forEach((k) => {
    try { localStorage.removeItem(k); } catch (e) {}
  });
};

export const resetSettingsToDefaults = async (deps) => {
  const {
    electronAPI,
    DEFAULT_EQ_BANDS,
    setVolume,
    setAutoplay,
    setShuffle,
    setRepeat,
    setPlaylists,
    setOsuFolderPath,
    setDiscordRpcEnabled,
    setWidgetServerEnabled,
    setEqBands,
    setAlbumArtBlur,
    setBlurIntensity,
    setAccentColor,
    setVuEnabled,
    setShowSongBadges,
    clearRecentlyPlayed,
    setFavorites,
    clearPlayCounts,
    setDurationFilter,
    setMinDurationValue,
    setItemsPerPage,
    setHiddenArtists,
    setNameFilter,
    setNameFilterMode,
    setScanAllMaps,
    setDedupeTitlesEnabled,
    setDisplayedSongs,
    setCurrentSong,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setSelectedPlaylistId,
    setCurrentView,
    setCloseToTray,
    setAskBeforeClose,
    setHardwareAcceleration
  } = deps || {};

  try {
    if (electronAPI?.widgetIsRunning) {
      const running = await electronAPI.widgetIsRunning();
      if (running && electronAPI.widgetStopServer) {
        await electronAPI.widgetStopServer();
      }
    }

    const keysToClear = [
      'volume',
      'autoplay',
      'shuffle',
      'repeat',
      'eqBands',
      'albumArtBlur',
      'blurIntensity',
      'accentColor',
      'showSongBadges',
      'itemsPerPage',
      'sortBy',
      'sortDuration',
      'searchHistory',
      'hiddenArtists',
      'nameFilter',
      'nameFilterMode',
      'scanAllMaps',
      'dedupeTitlesEnabled',
      'vuEnabled',
      'closeToTray',
      'askBeforeClose',
      'hardwareAcceleration',
      'minDurationValue'
    ];
    clearLocalStorageKeys(keysToClear);

    setVolume?.(DEFAULTS.volume);
    setAutoplay?.(DEFAULTS.autoplay);
    setShuffle?.(DEFAULTS.shuffle);
    setRepeat?.(DEFAULTS.repeat);
    setDiscordRpcEnabled?.(false);
    setWidgetServerEnabled?.(false);
    setEqBands?.(DEFAULT_EQ_BANDS);
    setAlbumArtBlur?.(DEFAULTS.albumArtBlur);
    setBlurIntensity?.(DEFAULTS.blurIntensity);
    setAccentColor?.(DEFAULTS.accentColor);
    setShowSongBadges?.(DEFAULTS.showSongBadges);
    setVuEnabled?.(DEFAULTS.vuEnabled);
    setDurationFilter?.({ min: 0, max: Infinity });
    setMinDurationValue?.(DEFAULTS.minDurationValue);
    setItemsPerPage?.(DEFAULTS.itemsPerPage);
    setHiddenArtists?.(DEFAULTS.hiddenArtists);
    setNameFilter?.(DEFAULTS.nameFilter);
    setNameFilterMode?.(DEFAULTS.nameFilterMode);
    setScanAllMaps?.(DEFAULTS.scanAllMaps);
    setDedupeTitlesEnabled?.(DEFAULTS.dedupeTitlesEnabled);
    setCloseToTray?.(DEFAULTS.closeToTray);
    setAskBeforeClose?.(DEFAULTS.askBeforeClose);
    setHardwareAcceleration?.(DEFAULTS.hardwareAcceleration);
  } catch (err) {
    console.error('[Reset] Failed to reset settings to defaults:', err);
  }
};

export const resetFullToDefaults = async (deps) => {
  const { electronAPI } = deps || {};

  try {
    try { localStorage.clear(); } catch (e) {}
    if (electronAPI?.appFullReset) {
      await electronAPI.appFullReset();
    }
  } catch (err) {
    console.error('[Reset] Failed to full reset:', err);
  }
};
