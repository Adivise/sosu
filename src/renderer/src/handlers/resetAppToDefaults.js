export const resetAppToDefaults = async (deps) => {
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
    setAskBeforeClose
  } = deps || {};

  try {
    if (electronAPI?.widgetIsRunning) {
      const running = await electronAPI.widgetIsRunning();
      if (running && electronAPI.widgetStopServer) {
        await electronAPI.widgetStopServer();
      }
    }

    const keysToClear = [
      'eqBands',
      'albumArtBlur',
      'blurIntensity',
      'accentColor',
      'showSongBadges',
      'recentlyPlayed',
      'favorites',
      'playCounts',
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
      'askBeforeClose'
    ];
    keysToClear.forEach((k) => localStorage.removeItem(k));

    setVolume?.(0.5);
    setAutoplay?.(false);
    setShuffle?.(false);
    setRepeat?.(false);
    setPlaylists?.([]);
    setOsuFolderPath?.(null);
    setDiscordRpcEnabled?.(false);
    setWidgetServerEnabled?.(false);
    setEqBands?.(DEFAULT_EQ_BANDS);
    setAlbumArtBlur?.(true);
    setBlurIntensity?.(60);
    setAccentColor?.('#1db954');
    setVuEnabled?.(true);
    clearRecentlyPlayed?.();
    setFavorites?.({});
    clearPlayCounts?.();
    setDurationFilter?.({ min: 0, max: Infinity });
    setMinDurationValue?.(60);
    setItemsPerPage?.(50);
    setHiddenArtists?.(['Unknown Artist']);
    setNameFilter?.('');
    setNameFilterMode?.('contains');
    setScanAllMaps?.(false);
    setDedupeTitlesEnabled?.(true);
    setCloseToTray?.(false);
    setAskBeforeClose?.(true);
    setDisplayedSongs?.([]);
    setCurrentSong?.(null);
    setIsPlaying?.(false);
    setCurrentTime?.(0);
    setDuration?.(0);
    setSelectedPlaylistId?.(null);
    setCurrentView?.('songs');

    if (electronAPI?.saveUserData) {
      await electronAPI.saveUserData({
        volume: 1,
        autoplay: false,
        shuffle: false,
        repeat: false,
        playlists: [],
        osuFolderPath: null,
        discordRpcEnabled: false,
        widgetServerEnabled: false,
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
        closeToTray: false,
        askBeforeClose: true,
        lastPlayedSong: null,
        lastPlaybackState: { isPlaying: false, currentTime: 0, duration: 0 },
        eqBands: DEFAULT_EQ_BANDS
      });
    }
  } catch (err) {
    console.error('[Reset] Failed to reset app to defaults:', err);
  }
};
