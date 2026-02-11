export const buildDiscordPayload = ({ currentSong, duration }) => {
  if (!currentSong) return null;
  return {
    title: currentSong.title || 'Unknown Song',
    artist: currentSong.artist || 'Unknown Artist',
    album: currentSong.album || '',
    duration: currentSong.duration ?? duration,
    imageFile: currentSong.imageFile || null,
    beatmapSetId: currentSong.beatmapSetId || null,
    beatmapId: currentSong.beatmapId || null
  };
};

export const buildWidgetPayload = ({ currentSong, isPlaying, currentTime, duration }) => {
  if (!currentSong) return null;
  const basePayload = {
    title: currentSong.title || 'Unknown Song',
    titleUnicode: currentSong.titleUnicode || null,
    artist: currentSong.artist || 'Unknown Artist',
    artistUnicode: currentSong.artistUnicode || null,
    creator: currentSong.creator || null,
    audioFilename: currentSong.audioFilename || null,
    bpm: currentSong.bpm || null,
    difficulty: currentSong.difficulty || null,
    version: currentSong.version || null,
    mode: typeof currentSong.mode === 'number' ? currentSong.mode : null,
    beatmapSetId: currentSong.beatmapSetId || null,
    beatmapId: currentSong.beatmapId || null,
    album: currentSong.album || '',
    currentTime,
    duration,
    imageFile: currentSong.imageFile || null
  };

  return {
    ...basePayload,
    paused: !isPlaying
  };
};

export const dispatchDiscord = ({
  electronAPI,
  payload,
  immediate,
  throttleMs,
  lastSentRef,
  pendingTimerRef,
  pendingPayloadRef
}) => {
  if (!electronAPI || !electronAPI.setDiscordRichPresence) return;
  const now = Date.now();

  if (immediate || now - lastSentRef.current >= throttleMs) {
    if (payload) {
      electronAPI.setDiscordRichPresence(true, payload);
    } else {
      electronAPI.setDiscordRichPresence(false);
    }
    lastSentRef.current = now;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    pendingPayloadRef.current = null;
    return;
  }

  pendingPayloadRef.current = payload;
  const wait = throttleMs - (now - lastSentRef.current);
  if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  pendingTimerRef.current = setTimeout(() => {
    const p = pendingPayloadRef.current;
    if (!electronAPI || !electronAPI.setDiscordRichPresence) return;
    if (p) electronAPI.setDiscordRichPresence(true, p);
    else electronAPI.setDiscordRichPresence(false);
    lastSentRef.current = Date.now();
    pendingPayloadRef.current = null;
    pendingTimerRef.current = null;
  }, wait);
};

export const dispatchWidget = ({
  electronAPI,
  payload,
  immediate,
  throttleMs,
  lastSentRef,
  pendingTimerRef,
  pendingPayloadRef
}) => {
  if (!electronAPI || !electronAPI.widgetUpdateNowPlaying) return;
  const now = Date.now();

  if (immediate || now - lastSentRef.current >= throttleMs) {
    try {
      electronAPI.widgetUpdateNowPlaying(payload);
    } catch (e) {}
    lastSentRef.current = now;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    pendingPayloadRef.current = null;
    return;
  }

  pendingPayloadRef.current = payload;
  const wait = throttleMs - (now - lastSentRef.current);
  if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  pendingTimerRef.current = setTimeout(() => {
    const p = pendingPayloadRef.current;
    try {
      electronAPI.widgetUpdateNowPlaying(p);
    } catch (e) {}
    lastSentRef.current = Date.now();
    pendingPayloadRef.current = null;
    pendingTimerRef.current = null;
  }, wait);
};

export const startWidgetTimeInterval = ({
  electronAPI,
  widgetServerEnabled,
  isPlaying,
  currentSong,
  currentTimeRef
}) => {
  if (!widgetServerEnabled || !isPlaying || !currentSong) return null;
  return setInterval(() => {
    if (!electronAPI || !electronAPI.widgetUpdateNowPlaying) return;
    try {
      electronAPI.widgetUpdateNowPlaying({ currentTime: currentTimeRef.current, paused: false });
    } catch (e) {}
  }, 250);
};

export const clearDispatchTimers = ({ pendingDiscordTimerRef, pendingWidgetTimerRef }) => {
  if (pendingDiscordTimerRef.current) {
    clearTimeout(pendingDiscordTimerRef.current);
    pendingDiscordTimerRef.current = null;
  }
  if (pendingWidgetTimerRef.current) {
    clearTimeout(pendingWidgetTimerRef.current);
    pendingWidgetTimerRef.current = null;
  }
};
