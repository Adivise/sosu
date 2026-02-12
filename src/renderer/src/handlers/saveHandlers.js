export const buildLastPlayedSong = ({ currentSong, includeMode }) => {
  if (!currentSong) return null;
  const payload = {
    id: currentSong.id,
    title: currentSong.title,
    artist: currentSong.artist,
    audioFile: currentSong.audioFile,
    folderPath: currentSong.folderPath
  };
  if (includeMode) {
    payload.mode = currentSong.mode;
  }
  return payload;
};

export const buildUserDataPayload = ({
  volume,
  autoplay,
  shuffle,
  repeat,
  playlists,
  osuFolderPath,
  discordRpcEnabled,
  widgetServerEnabled,
  vuEnabled,
  minDurationValue,
  itemsPerPage,
  albumArtBlur,
  blurIntensity,
  accentColor,
  showSongBadges,
  hardwareAcceleration,
  hiddenArtists,
  nameFilter,
  nameFilterMode,
  scanAllMaps,
  dedupeTitlesEnabled,
  currentSong,
  isPlaying,
  currentTime,
  duration,
  eqBands,
  recentlyPlayed,
  playCounts,
  includeCurrentTime = false,
  includeMode = false
}) => {
  const lastPlaybackState = {
    isPlaying,
    duration
  };
  if (includeCurrentTime) {
    lastPlaybackState.currentTime = currentTime;
  }

  return {
    volume,
    autoplay,
    shuffle,
    repeat,
    playlists,
    osuFolderPath,
    discordRpcEnabled,
    widgetServerEnabled,
    vuEnabled,
    minDurationValue,
    itemsPerPage,
    albumArtBlur,
    blurIntensity,
    accentColor,
    showSongBadges,
    hardwareAcceleration,
    hiddenArtists,
    nameFilter,
    nameFilterMode,
    scanAllMaps,
    dedupeTitlesEnabled,
    lastPlayedSong: buildLastPlayedSong({ currentSong, includeMode }),
    lastPlaybackState,
    eqBands,
    recentlyPlayed,
    playCounts
  };
};

export const flushUserData = ({
  userDataLoaded,
  scheduleSave,
  payloadArgs,
  includeCurrentTime,
  includeMode,
  logLabel
}) => {
  if (!userDataLoaded) return;
  const payload = buildUserDataPayload({
    ...payloadArgs,
    includeCurrentTime,
    includeMode
  });
  scheduleSave(payload, 0, true);
  if (logLabel) {
    console.debug && console.debug(logLabel);
  }
};
