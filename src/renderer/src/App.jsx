import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import PlayerBar from './components/PlayerBar';
import TitleBar from './components/TitleBar';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import SettingsModal from './components/SettingsModal';
import EQModal from './components/EQModal';
import LoadingScreen from './components/LoadingScreen';
import FirstRunScreen from './components/FirstRunScreen';
import SongDetailsModal from './components/SongDetailsModal';
import { DEFAULT_EQ_BANDS } from './components/eqConstants';
import { EQ_PRESETS } from './components/eqPresets';
import { VERSION } from './version';
import './App.css';
import useLocalStorageState from './hooks/useLocalStorageState';
import { normalizeEqBands, getContrastColor, adjustBrightness } from './utils/colorUtils';
import useSongs from './hooks/useSongs';

// Immediate startup overlay to prevent initial UI flash before React mounts
if (typeof document !== 'undefined' && !document.getElementById('sosu-startup-overlay')) {
  const startOverlay = document.createElement('div');
  startOverlay.id = 'sosu-startup-overlay';
  Object.assign(startOverlay.style, {
    position: 'fixed',
    // set below LoadingScreen z-index (9999) so LoadingScreen is visible
    zIndex: '9998',
    pointerEvents: 'none'
  });
  document.body.appendChild(startOverlay);
}

function App() {
  const [minDurationValue, setMinDurationValue] = useState(60); // Minimum duration in seconds
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useLocalStorageState('volume', 1, {
    serializer: (v) => String(v),
    deserializer: (v) => {
      if (v === null) return 1;
      try { const p = JSON.parse(v); return Number(p); } catch { return Number(v); }
    }
  });
  const [autoplay, setAutoplay] = useLocalStorageState('autoplay', false, { serializer: (v) => String(v) });
  const [shuffle, setShuffle] = useLocalStorageState('shuffle', false, { serializer: (v) => String(v) });
  const [repeat, setRepeat] = useLocalStorageState('repeat', false, { serializer: (v) => String(v) });
  const [currentView, setCurrentView] = useState('songs');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlists, setPlaylists] = useLocalStorageState('playlists', []);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEQModal, setShowEQModal] = useState(false);
  const [discordRpcEnabled, setDiscordRpcEnabled] = useState(false);
  const [widgetServerEnabled, setWidgetServerEnabled] = useState(false);
  const [vuEnabled, setVuEnabled] = useLocalStorageState('vuEnabled', true);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [eqBands, setEqBands] = useLocalStorageState('eqBands', DEFAULT_EQ_BANDS, { serializer: JSON.stringify, deserializer: (v) => normalizeEqBands(JSON.parse(v)) });
  const [albumArtBlur, setAlbumArtBlur] = useLocalStorageState('albumArtBlur', true);
  const [blurIntensity, setBlurIntensity] = useLocalStorageState('blurIntensity', 60);
  const [accentColor, setAccentColor] = useLocalStorageState('accentColor', '#1db954');
  const [showSongBadges, setShowSongBadges] = useLocalStorageState('showSongBadges', true);
  const [favorites, setFavorites] = useLocalStorageState('favorites', {});
  const [durationFilter, setDurationFilter] = useState({ min: 0, max: Infinity });
  const [itemsPerPage, setItemsPerPage] = useLocalStorageState('itemsPerPage', 50);
  const [displayedSongs, setDisplayedSongs] = useState([]);
  const [displayedSongsSourceView, setDisplayedSongsSourceView] = useState(null);
  const [songDetails, setSongDetails] = useState(null);
  const [highlightedSongId, setHighlightedSongId] = useState(null); // preview highlight id

  // Highlight song requests from other UI elements (e.g., jump-to-song)
  useEffect(() => {
    const handler = (ev) => {
      try {
        const songId = ev?.detail?.songId;
        if (!songId) return;
        setHighlightedSongId(songId);
        // Clear highlight after a short duration
        setTimeout(() => {
          setHighlightedSongId(null);
        }, 2500);
      } catch (e) {}
    };
    window.addEventListener('sosu:highlight-song', handler);
    return () => window.removeEventListener('sosu:highlight-song', handler);
  }, []);

  // Allow other UI to open Settings via a custom event (used by the "No results" helper)
  useEffect(() => {
    const handler = () => setShowSettingsModal(true);
    window.addEventListener('sosu:open-settings', handler);
    return () => window.removeEventListener('sosu:open-settings', handler);
  }, []);



  // Fallback global event to open the Create Playlist modal when other code dispatches it
  useEffect(() => {
    const onCreateEvt = (ev) => {
      try {
        console.debug && console.debug('[App] received sosu:create-playlist event, activeElement:', document.activeElement && (document.activeElement.tagName + ' ' + (document.activeElement.id || document.activeElement.className || '')));
      } catch (e) {}

      // If we recently deleted a playlist, wait a bit longer to avoid focus race with confirm/DOM updates
      let delay = 30;
      try {
        const lastDel = lastPlaylistDeletedAtRef.current || 0;
        if (Date.now() - lastDel < 800) {
          delay = 350;
          console.debug && console.debug('[App] delaying open CreatePlaylistModal due to recent delete', { sinceMs: Date.now() - lastDel });
        }
      } catch (e) {}

      // Schedule the modal open on the next tick (or later if needed) to avoid focus/confirm race conditions
      setTimeout(() => {
        try {
          setShowCreatePlaylistModal(true);
          console.debug && console.debug('[App] scheduled open CreatePlaylistModal');
        } catch (e) {}
      }, delay);
    };
    window.addEventListener('sosu:create-playlist', onCreateEvt);
    return () => window.removeEventListener('sosu:create-playlist', onCreateEvt);
  }, []);
  
  // Advanced filters
  const [hiddenArtists, setHiddenArtists] = useLocalStorageState('hiddenArtists', ['Unknown Artist']);
  const [nameFilter, setNameFilter] = useLocalStorageState('nameFilter', '');
  const [nameFilterMode, setNameFilterMode] = useLocalStorageState('nameFilterMode', 'contains');
  const [scanAllMaps, setScanAllMaps] = useLocalStorageState('scanAllMaps', false);
  const [dedupeTitlesEnabled, setDedupeTitlesEnabled] = useLocalStorageState('dedupeTitlesEnabled', true);

  const {
    songs,
    setSongs,
    songsCache,
    setSongsCache,
    songDurations,
    setSongDurations,
    osuFolderPath,
    setOsuFolderPath,
    loading,
    loadingProgress,
    loadSongs,
    clearSongsCache,
    selectFolder,
    removeFolder,
    // playback related
    playCounts,
    setPlayCounts,
    recentlyPlayed,
    setRecentlyPlayed,
    notifyPlayback,
    clearPlayCounts,
    clearRecentlyPlayed
  } = useSongs({
    scanAllMaps,
    onRestorePendingSong: (restoredSong, playbackState) => {
      restoredSong.mode = restoredSong.mode ?? 0;
      setCurrentSong(restoredSong);
      setCurrentTime(playbackState?.currentTime || 0);
      setDuration(playbackState?.duration || 0);
      setIsPlaying(false);
    }
  });

  // Use ref to prevent duplicate initialization
  const initRef = useRef(false);
  const autoSyncDoneRef = useRef(false); // Track if auto-sync has been done
  const autoSyncStartedRef = useRef(false); // Track if auto-sync was started (avoids StrictMode race)

  // Track whether we started an initial (startup) auto-sync that must finish before removing overlay
  const initialAutoSyncRef = useRef(false);
  const initialAutoSyncDoneRef = useRef(false);

  // When a startup auto-sync was started, wait until loading ends to mark it done
  useEffect(() => {
    if (initialAutoSyncRef.current && !loading) {
      initialAutoSyncDoneRef.current = true;
    }
  }, [loading]);

  // Remove startup overlay once app is ready (user data loaded and initial startup sync done / not scanning)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('sosu-startup-overlay');
    if (!el) return;
    // Only remove if we have loaded user data, not currently loading, and either there was no initial auto-sync OR it has completed
    if (userDataLoaded && !loading && (!initialAutoSyncRef.current || initialAutoSyncDoneRef.current)) {
      try { el.parentNode && el.parentNode.removeChild(el); } catch (e) {}
    }
  }, [userDataLoaded, loading]);

  // Load settings and playlists on mount using Electron cache if available
  useEffect(() => {
    // Prevent duplicate initialization (React Strict Mode runs effects twice in dev)
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      if (window.electronAPI) {
        // Send version to backend
        await window.electronAPI.widgetSetVersion(VERSION);
        
        // Load user data (settings)
        const data = await window.electronAPI.getUserData();
        // Use a local variable so startup scans use the same value that UI shows
        let effectiveScanAllMaps = scanAllMaps;

        if (data) {
          setVolume(data.volume ?? 1);
          setAutoplay(data.autoplay ?? false);
          setShuffle(data.shuffle ?? false);
          setRepeat(data.repeat ?? false);
          setPlaylists(data.playlists ?? []);
          setOsuFolderPath(data.osuFolderPath ?? null);
          setDiscordRpcEnabled(data.discordRpcEnabled ?? false);
          setWidgetServerEnabled(data.widgetServerEnabled ?? false);
          // Load advanced filters + scan settings
          if (Array.isArray(data.hiddenArtists)) {
            setHiddenArtists(data.hiddenArtists.length === 0 ? ['Unknown Artist'] : data.hiddenArtists);
          }
          if (typeof data.nameFilter === 'string') setNameFilter(data.nameFilter);
          if (typeof data.nameFilterMode === 'string') setNameFilterMode(data.nameFilterMode);
          if (typeof data.scanAllMaps === 'boolean') {
            effectiveScanAllMaps = data.scanAllMaps;
            setScanAllMaps(data.scanAllMaps);
          }
          if (typeof data.dedupeTitlesEnabled === 'boolean') {
            setDedupeTitlesEnabled(data.dedupeTitlesEnabled);
          }
          // Persisted UI settings
          if (typeof data.minDurationValue === 'number') setMinDurationValue(data.minDurationValue);
          if (typeof data.itemsPerPage === 'number') setItemsPerPage(data.itemsPerPage);
          if (typeof data.albumArtBlur === 'boolean') setAlbumArtBlur(data.albumArtBlur);
          if (typeof data.blurIntensity === 'number') setBlurIntensity(data.blurIntensity);
          if (typeof data.accentColor === 'string') setAccentColor(data.accentColor);
          
          // Auto-start widget server if it was enabled
          if (data.widgetServerEnabled) {
            setTimeout(async () => {
              // Check if server is already running first
              const isRunning = await window.electronAPI.widgetIsRunning();
              if (!isRunning) {
                const result = await window.electronAPI.widgetStartServer(3737);
                if (result.success) {
                  console.log('[Widget] Auto-started server');
                }
              }
            }, 500);
          }
          
          // Load EQ bands
          if (data.eqBands) {
            setEqBands(normalizeEqBands(data.eqBands));
          }
          if (typeof data.vuEnabled === 'boolean') setVuEnabled(data.vuEnabled);
        }
        
        // Load songs cache
        const cached = await window.electronAPI.getSongsCache();
        // Determine effective folder path: prefer userData, fall back to localStorage
        const effectiveFolder = data?.osuFolderPath || (() => { try { return localStorage.getItem('osuFolderPath'); } catch (e) { return null; } })();

        if (cached) {
          setSongsCache(cached);

          // If we have cached songs for the effective folder path, either load them temporarily
          // or start an auto-sync with full loading UI to avoid flicker on startup.
          if (effectiveFolder && cached[effectiveFolder]) {
            const cachedEntry = cached[effectiveFolder];
            // Ensure OSU folder state is set
            try { setOsuFolderPath(effectiveFolder); } catch (e) {}

            // If we haven't started an auto-sync yet, start it (show loading on first startup). Use a started flag to avoid StrictMode races.
            if (!autoSyncStartedRef.current) {
              autoSyncStartedRef.current = true;
              // If the user had a last played song, set pending restore so loadSongs can restore it after scanning
              if (data?.lastPlayedSong) {
                try { window._pendingSongRestore = { song: data.lastPlayedSong, playbackState: data.lastPlaybackState || {} }; } catch (e) {}
              }

              // Start auto-sync immediately and show LoadingScreen during the sync
              console.log('[App] Auto-syncing songs with folder on startup (showing loading)...');
              // mark that an initial auto-sync is in progress so overlay removal waits for it to finish
              try { initialAutoSyncRef.current = true; } catch(e) {}
              try {
                // AWAIT the load here so we don't set userDataLoaded until scanning has started/completed
                await loadSongs(effectiveFolder, false, true);
                // mark done here as well in case loading toggles quickly
                try { initialAutoSyncDoneRef.current = true; } catch(e) {}
                // mark overall auto-sync done
                try { autoSyncDoneRef.current = true; } catch(e) {}
              } catch (err) {
                console.error('[App] Auto-sync failed during startup:', err);
                try { initialAutoSyncDoneRef.current = true; } catch(e) {}
                try { autoSyncDoneRef.current = true; } catch(e) {}
              }
            } else {
              // Auto-sync has been started previously (or completed) — show cached songs immediately then do a background incremental scan
              setSongs(cachedEntry.songs);
              setSongDurations(cachedEntry.durations);

              // Do a background incremental scan without showing the LoadingScreen
              setTimeout(async () => {
                await loadSongs(effectiveFolder, false, false);
              }, 100);

              // Restore last played song if available (when loading from cache)
              if (data?.lastPlayedSong) {
                const restoredSong = cachedEntry.songs.find(s => s.id === data.lastPlayedSong.id);
                if (restoredSong) {
                  restoredSong.mode = data.lastPlayedSong.mode ?? restoredSong.mode ?? 0;
                  // Restore the song after a short delay to ensure everything is loaded
                  setTimeout(() => {
                    setCurrentSong(restoredSong);
                    setCurrentTime(data.lastPlaybackState?.currentTime || 0);
                    setDuration(data.lastPlaybackState?.duration || 0);
                    // Don't auto-play, let user decide
                    setIsPlaying(false);
                  }, 100);
                }
              }
            }
          }
        }

        // If we don't have cache but have an effective folder from localStorage/userData, kick off a scan to populate songs
        if ((!cached || (cached && !(effectiveFolder && cached[effectiveFolder]))) && effectiveFolder) {
          try {
            // Mark folder state and start a full load to populate songs
            try { setOsuFolderPath(effectiveFolder); } catch (e) {}
            if (!autoSyncStartedRef.current) {
              autoSyncStartedRef.current = true;
              try { initialAutoSyncRef.current = true; } catch (e) {}
              // run scan and show loading UI
              await loadSongs(effectiveFolder, false, true);
              try { initialAutoSyncDoneRef.current = true; } catch (e) {}
              try { autoSyncDoneRef.current = true; } catch (e) {}
            } else {
              // background load
              setTimeout(async () => { await loadSongs(effectiveFolder, false, false); }, 100);
            }
          } catch (e) {
            console.error('[App] initial loadSongs failed for effectiveFolder:', effectiveFolder, e);
            try { initialAutoSyncDoneRef.current = true; } catch (e) {}
          }
        }

      }
      setUserDataLoaded(true);
    })();
  }, []);

  // Check if this is first run (no folder selected)
  const isFirstRun = userDataLoaded && !osuFolderPath && !loading;
  const [firstRunError, setFirstRunError] = useState(null);

  // Update CSS variable when accentColor changes
  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty('--accent-color', accentColor);
      
      // Calculate and set accent color variants
      const accentHover = adjustBrightness(accentColor, 120);
      const accentDark = adjustBrightness(accentColor, 80);
      document.documentElement.style.setProperty('--accent-color-hover', accentHover);
      document.documentElement.style.setProperty('--accent-color-dark', accentDark);

      // Set readable text color for accent backgrounds
      const accentContrast = getContrastColor(accentColor);
      document.documentElement.style.setProperty('--accent-contrast', accentContrast);

      const hex = accentColor.replace('#', '').trim();
      let r = 29, g = 185, b = 84; // fallback (previous default)
      if (hex.length === 6) {
        r = parseInt(hex.slice(0,2), 16);
        g = parseInt(hex.slice(2,4), 16);
        b = parseInt(hex.slice(4,6), 16);
      }
      document.documentElement.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`);
    }
  }, [accentColor]);

  // EQ bands persisted by useLocalStorageState



  // Debounced save of user data to avoid frequent disk writes (currentTime excluded from main effect)
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);

  const scheduleSave = (partialData, delay = 2000, immediate = false) => {
    try {
      pendingSaveRef.current = { ...(pendingSaveRef.current || {}), ...partialData };
      if (immediate) {
        if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
        if (window.electronAPI && pendingSaveRef.current) {
          try { window.electronAPI.saveUserData(pendingSaveRef.current); } catch (e) {}
          pendingSaveRef.current = null;
        }
        return;
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          if (window.electronAPI && pendingSaveRef.current) {
            window.electronAPI.saveUserData(pendingSaveRef.current);
          }
        } catch (e) {}
        pendingSaveRef.current = null;
        saveTimerRef.current = null;
      }, delay);
    } catch (e) {}
  };

  // Save general user settings (exclude high-frequency currentTime updates)
  useEffect(() => {
    if (!userDataLoaded) return;
    const userData = {
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
      hiddenArtists,
      nameFilter,
      nameFilterMode,
      scanAllMaps,
      dedupeTitlesEnabled,
      // lastPlayedSong intentionally included but lastPlaybackState excludes currentTime here
      lastPlayedSong: currentSong ? {
        id: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        audioFile: currentSong.audioFile,
        folderPath: currentSong.folderPath
      } : null,
      lastPlaybackState: {
        isPlaying: isPlaying,
        duration: duration
      },
      eqBands: eqBands,
      recentlyPlayed: recentlyPlayed,
      playCounts: playCounts
    };

    scheduleSave(userData);

    // Cleanup on unmount: flush pending
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (pendingSaveRef.current && window.electronAPI) {
        try { window.electronAPI.saveUserData(pendingSaveRef.current); } catch (e) {}
        pendingSaveRef.current = null;
      }
    };
  }, [userDataLoaded, volume, autoplay, shuffle, repeat, playlists, osuFolderPath, discordRpcEnabled, widgetServerEnabled, minDurationValue, itemsPerPage, albumArtBlur, blurIntensity, accentColor, showSongBadges, hiddenArtists, nameFilter, nameFilterMode, scanAllMaps, dedupeTitlesEnabled, currentSong, duration, eqBands, recentlyPlayed, playCounts]);

  // Ensure data is flushed when the window is being closed or hidden (force save on exit)
  useEffect(() => {
    const flush = () => {
      try {
        if (!userDataLoaded) return;
        const payload = {
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
          hiddenArtists,
          nameFilter,
          nameFilterMode,
          scanAllMaps,
          dedupeTitlesEnabled,
          lastPlayedSong: currentSong ? {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist,
            audioFile: currentSong.audioFile,
            folderPath: currentSong.folderPath,
            mode: currentSong.mode
          } : null,
          lastPlaybackState: {
            isPlaying: isPlaying,
            currentTime: currentTime,
            duration: duration
          },
          eqBands,
          recentlyPlayed,
          playCounts
        };

        // Force immediate save via scheduleSave (immediate=true) so pending data is written
        scheduleSave(payload, 0, true);
        console.debug && console.debug('[App] forced save on close/visibilitychange');
      } catch (e) {
        console.warn('[App] forced save failed', e);
      }
    };

    const onBeforeUnload = (e) => { flush(); };
    const onPageHide = (e) => { flush(); };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flush(); };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userDataLoaded, volume, autoplay, shuffle, repeat, playlists, osuFolderPath, discordRpcEnabled, widgetServerEnabled, minDurationValue, itemsPerPage, albumArtBlur, blurIntensity, accentColor, showSongBadges, hiddenArtists, nameFilter, nameFilterMode, scanAllMaps, dedupeTitlesEnabled, currentSong, currentTime, duration, eqBands, recentlyPlayed, playCounts]);

  // Handle frequent updates to playback state (throttled, immediate on song change or pause)
  const prevSongIdRef = useRef(null);
  useEffect(() => {
    if (!userDataLoaded) return;
    const songChanged = prevSongIdRef.current !== (currentSong ? currentSong.id : null);
    prevSongIdRef.current = currentSong ? currentSong.id : null;

    const playbackPartial = {
      lastPlayedSong: currentSong ? {
        id: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        audioFile: currentSong.audioFile,
        folderPath: currentSong.folderPath
      } : null,
      lastPlaybackState: {
        isPlaying: isPlaying,
        currentTime: currentTime,
        duration: duration
      }
    };

    // If song changed or paused, save immediately; otherwise throttle frequent currentTime updates
    if (songChanged || !isPlaying) {
      scheduleSave(playbackPartial, 0, true);
    } else {
      scheduleSave(playbackPartial, 5000, false);
    }
  }, [currentSong?.id, isPlaying, currentTime, duration, userDataLoaded]);

  // Throttled Discord Rich Presence and Widget updates to avoid spamming IPC on every timeupdate
  const DISPATCH_THROTTLE = 1000; // ms
  const lastDiscordSentRef = useRef(0);
  const pendingDiscordTimerRef = useRef(null);
  const pendingDiscordPayloadRef = useRef(null);
  const lastWidgetSentRef = useRef(0);
  const pendingWidgetTimerRef = useRef(null);
  const pendingWidgetPayloadRef = useRef(null);
  const prevDiscordSongIdRef = useRef(null);
  const prevIsPlayingRef = useRef(null);

  const dispatchDiscord = (payload, immediate = false) => {
    if (!window.electronAPI || !window.electronAPI.setDiscordRichPresence) return;
    const now = Date.now();

    if (immediate || now - lastDiscordSentRef.current >= DISPATCH_THROTTLE) {
      if (payload) {
        window.electronAPI.setDiscordRichPresence(true, payload);
      } else {
        window.electronAPI.setDiscordRichPresence(false);
      }
      lastDiscordSentRef.current = now;
      if (pendingDiscordTimerRef.current) { clearTimeout(pendingDiscordTimerRef.current); pendingDiscordTimerRef.current = null; }
      pendingDiscordPayloadRef.current = null;
      return;
    }

    // schedule for later
    pendingDiscordPayloadRef.current = payload;
    const wait = DISPATCH_THROTTLE - (now - lastDiscordSentRef.current);
    if (pendingDiscordTimerRef.current) clearTimeout(pendingDiscordTimerRef.current);
    pendingDiscordTimerRef.current = setTimeout(() => {
      const p = pendingDiscordPayloadRef.current;
      if (!window.electronAPI || !window.electronAPI.setDiscordRichPresence) return;
      if (p) window.electronAPI.setDiscordRichPresence(true, p);
      else window.electronAPI.setDiscordRichPresence(false);
      lastDiscordSentRef.current = Date.now();
      pendingDiscordPayloadRef.current = null;
      pendingDiscordTimerRef.current = null;
    }, wait);
  };

  const dispatchWidget = (payload, immediate = false) => {
    if (!window.electronAPI || !window.electronAPI.widgetUpdateNowPlaying) return;
    const now = Date.now();

    if (immediate || now - lastWidgetSentRef.current >= DISPATCH_THROTTLE) {
      try {
        window.electronAPI.widgetUpdateNowPlaying(payload);
      } catch (e) {}
      lastWidgetSentRef.current = now;
      if (pendingWidgetTimerRef.current) { clearTimeout(pendingWidgetTimerRef.current); pendingWidgetTimerRef.current = null; }
      pendingWidgetPayloadRef.current = null;
      return;
    }

    pendingWidgetPayloadRef.current = payload;
    const wait = DISPATCH_THROTTLE - (now - lastWidgetSentRef.current);
    if (pendingWidgetTimerRef.current) clearTimeout(pendingWidgetTimerRef.current);
    pendingWidgetTimerRef.current = setTimeout(() => {
      const p = pendingWidgetPayloadRef.current;
      try { window.electronAPI.widgetUpdateNowPlaying(p); } catch (e) {}
      lastWidgetSentRef.current = Date.now();
      pendingWidgetPayloadRef.current = null;
      pendingWidgetTimerRef.current = null;
    }, wait);
  };

  useEffect(() => {
    // Determine whether this is a song change or play/pause toggle which should be immediate
    const songChanged = prevDiscordSongIdRef.current !== (currentSong ? currentSong.id : null);
    const isPlayingChanged = prevIsPlayingRef.current !== isPlaying;
    prevDiscordSongIdRef.current = currentSong ? currentSong.id : null;
    prevIsPlayingRef.current = isPlaying;

    const discordPayload = currentSong ? {
      title: currentSong.title || 'Unknown Song',
      artist: currentSong.artist || 'Unknown Artist',
      album: currentSong.album || '',
      duration: currentSong.duration ?? duration,
      imageFile: currentSong.imageFile || null,
      beatmapSetId: currentSong.beatmapSetId || null,
      beatmapId: currentSong.beatmapId || null
    } : null;

    const widgetPayload = currentSong ? (
      isPlaying ? {
        title: currentSong.title || 'Unknown Song',
        titleUnicode: currentSong.titleUnicode || null,
        artist: currentSong.artist || 'Unknown Artist',
        artistUnicode: currentSong.artistUnicode || null,
        creator: currentSong.creator || null,
        audioFilename: currentSong.audioFilename || null,
        bpm: currentSong.bpm || null,
        difficulty: currentSong.difficulty || null,
        version: currentSong.version || null,
        mode: (typeof currentSong.mode === 'number') ? currentSong.mode : null,
        beatmapSetId: currentSong.beatmapSetId || null,
        beatmapId: currentSong.beatmapId || null,
        album: currentSong.album || '',
        currentTime: currentTime,
        duration: duration,
        paused: false,
        imageFile: currentSong.imageFile || null
      } : {
        title: currentSong.title || 'Unknown Song',
        titleUnicode: currentSong.titleUnicode || null,
        artist: currentSong.artist || 'Unknown Artist',
        artistUnicode: currentSong.artistUnicode || null,
        creator: currentSong.creator || null,
        audioFilename: currentSong.audioFilename || null,
        bpm: currentSong.bpm || null,
        difficulty: currentSong.difficulty || null,
        version: currentSong.version || null,
        mode: (typeof currentSong.mode === 'number') ? currentSong.mode : null,
        beatmapSetId: currentSong.beatmapSetId || null,
        beatmapId: currentSong.beatmapId || null,
        album: currentSong.album || '',
        currentTime: currentTime,
        duration: duration,
        paused: true,
        imageFile: currentSong.imageFile || null
      }
    ) : null;

    // Dispatch with immediate=true for song change / pause / resume events
    const immediate = songChanged || isPlayingChanged || !isPlaying;

    if (discordRpcEnabled) dispatchDiscord(discordPayload, immediate);
    else dispatchDiscord(null, true);

    // Send metadata updates as before
    dispatchWidget(widgetPayload, immediate);

    // If playing and widget server enabled, start a fast interval to send currentTime-only updates
    // This enables near-realtime currentTime updates without spamming metadata updates
    let intervalId = null;
    if (widgetServerEnabled && isPlaying && currentSong) {
      intervalId = setInterval(() => {
        if (!window.electronAPI || !window.electronAPI.widgetUpdateNowPlaying) return;
        // Send lightweight payload with currentTime and paused=false so server doesn't retain stale paused state
        try { window.electronAPI.widgetUpdateNowPlaying({ currentTime: currentTimeRef.current, paused: false }); } catch (e) {}
      }, 250); // 250ms updates for smoother progress
    }

    // Cleanup scheduled timers on unmount / when dependencies change
    return () => {
      if (pendingDiscordTimerRef.current) { clearTimeout(pendingDiscordTimerRef.current); pendingDiscordTimerRef.current = null; }
      if (pendingWidgetTimerRef.current) { clearTimeout(pendingWidgetTimerRef.current); pendingWidgetTimerRef.current = null; }
      if (intervalId) clearInterval(intervalId);
    };
  }, [discordRpcEnabled, currentSong, isPlaying, currentTime, duration, widgetServerEnabled]);







  useEffect(() => {
    // Also apply a global class to immediately hide/show badges even if some components didn't re-render yet
    try {
      if (showSongBadges) {
        document.documentElement.classList.remove('hide-song-badges');
      } else {
        document.documentElement.classList.add('hide-song-badges');
      }
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [showSongBadges]);

  // Forward playback progress to songs hook for play count & recently played tracking
  useEffect(() => {
    if (notifyPlayback) {
      notifyPlayback({ currentSong, isPlaying, currentTime, duration });
    }
  }, [currentSong, isPlaying, currentTime, duration, notifyPlayback]);

  // Get all unique artists from songs
  const getAllArtists = () => {
    const artistsSet = new Set();
    songs.forEach(song => {
      if (song.artist) {
        artistsSet.add(song.artist);
      }
    });
    return Array.from(artistsSet).sort();
  };

  // Calculate filtered stats
  const getFilterStats = () => {
    const totalSongs = songs.length;
    let hiddenCount = 0; // hidden by duration/artist/title filters (before duplicate removal)
    let hiddenByDuration = 0;
    let hiddenByArtist = 0;
    let hiddenByTitle = 0;
    let duplicateCount = 0; // would be removed by title dedupe after other filters
    const seenTitles = new Set();
    
    songs.forEach(song => {
      const duration = songDurations?.[song.id] ?? song.duration;
      if (duration && duration < minDurationValue) {
        hiddenCount++;
        hiddenByDuration++;
        return;
      }
      
      if (hiddenArtists.length > 0 && song.artist) {
        const artistLower = song.artist.toLowerCase().trim();
        if (hiddenArtists.some(hidden => hidden.toLowerCase().trim() === artistLower)) {
          hiddenCount++;
          hiddenByArtist++;
          return;
        }
      }
      
      if (nameFilter) {
        const songTitle = (song.title || '').toLowerCase();
        const raw = nameFilter
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        for (const item of raw) {
          const idx = item.indexOf('::');
          const mode = (idx > 0 ? item.slice(0, idx) : nameFilterMode).toLowerCase();
          const term = (idx > 0 ? item.slice(idx + 2) : item).toLowerCase().trim();
          if (!term) continue;

          let hit = false;
          switch (mode) {
            case 'startswith':
              hit = songTitle.startsWith(term);
              break;
            case 'endswith':
              hit = songTitle.endsWith(term);
              break;
            case 'contains':
            default:
              hit = songTitle.includes(term);
              break;
          }

          if (hit) {
            hiddenCount++;
            hiddenByTitle++;
            return;
          }
        }
      }

      // passed filters -> count duplicates by title (case-insensitive)
      const normalizedTitle = (song.title || '').toLowerCase().trim();
      if (normalizedTitle) {
        if (seenTitles.has(normalizedTitle)) {
          duplicateCount++;
        } else {
          seenTitles.add(normalizedTitle);
        }
      }
    });
    
    const visibleBeforeDedupe = totalSongs - hiddenCount;
    const visibleAfterDedupe = dedupeTitlesEnabled
      ? Math.max(0, visibleBeforeDedupe - duplicateCount)
      : visibleBeforeDedupe;
    const hiddenTotal = totalSongs - visibleAfterDedupe;

    return {
      total: totalSongs,
      hidden: hiddenTotal,
      hiddenBy: {
        duration: hiddenByDuration,
        artist: hiddenByArtist,
        title: hiddenByTitle
      },
      visible: visibleAfterDedupe,
      // Show duplicates that are actually hidden right now; if dedupe is off, this is 0
      duplicate: dedupeTitlesEnabled ? duplicateCount : 0
    };
  };

  // If the currently playing song is no longer in the global songs list
  // (e.g. after reset or rescan removed it), stop playback and clear it
  useEffect(() => {
    if (!currentSong) return;
    const exists = songs.some(song => song.id === currentSong.id);
    if (!exists) {
      setIsPlaying(false);
      setCurrentSong(null);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [songs, currentSong]);

  // Previously we would stop playback when filters/search hid the current song.
  // That behavior was surprising — keep playback running even if the song isn't visible in the list.
  // Note: we still stop playback when the song is actually removed from the library (see other effect above).
  useEffect(() => {
    // No-op: do not clear playback when a song is filtered out by search or filters.
    // This preserves playback while the user types in the SearchBar or adjusts filters.
  }, [displayedSongs, currentSong, currentView, displayedSongsSourceView]);

  // Cache clearing and scanning handled by `useSongs` hook (clearSongsCache)



  // Reset the app to factory defaults (like first run)
  const resetAppToDefaults = async () => {
    try {
      // Stop widget server if running
      if (window.electronAPI?.widgetIsRunning) {
        const running = await window.electronAPI.widgetIsRunning();
        if (running && window.electronAPI.widgetStopServer) {
          await window.electronAPI.widgetStopServer();
        }
      }

      // Clear relevant localStorage keys
      const keysToClear = [
        'eqBands','albumArtBlur','blurIntensity','accentColor','showSongBadges','recentlyPlayed','favorites','playCounts','itemsPerPage','sortBy','sortDuration','searchHistory',
        'hiddenArtists','nameFilter','nameFilterMode','scanAllMaps','dedupeTitlesEnabled','vuEnabled'
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));

      // Reset React state to initial defaults
      setVolume(0.5);
      setAutoplay(false);
      setShuffle(false);
      setRepeat(false);
      setPlaylists([]);
      setOsuFolderPath(null);
      setDiscordRpcEnabled(false);
      setWidgetServerEnabled(false);
      setEqBands(DEFAULT_EQ_BANDS);
      setAlbumArtBlur(true);
      setBlurIntensity(60);
      setAccentColor('#1db954');
      // Reset VU visualizer to default enabled
      setVuEnabled(true);
      // Clear playback stats managed by songs hook
      clearRecentlyPlayed();
      setFavorites({});
      clearPlayCounts();
      setDurationFilter({ min: 0, max: Infinity });
      setMinDurationValue(60);
      setItemsPerPage(50);
      setHiddenArtists(['Unknown Artist']);
      setNameFilter('');
      setNameFilterMode('contains');
      setScanAllMaps(false);
      setDedupeTitlesEnabled(true);
      setDisplayedSongs([]);
      setCurrentSong(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setSelectedPlaylistId(null);
      setCurrentView('songs');

      // Clear songs cache
      setSongs([]);
      setSongsCache({});
      setSongDurations({});
      if (window.electronAPI?.saveSongsCache) {
        await window.electronAPI.saveSongsCache({});
      }

      // Save blank user data
      if (window.electronAPI?.saveUserData) {
        await window.electronAPI.saveUserData({
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
          lastPlayedSong: null,
          lastPlaybackState: { isPlaying: false, currentTime: 0, duration: 0 },
          eqBands: DEFAULT_EQ_BANDS
        });
      }
    } catch (err) {
      console.error('[Reset] Failed to reset app to defaults:', err);
    }
  };

  // Song loading and scanning logic moved to `useSongs` hook. See `hooks/useSongs.js` for implementation.


  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Global spacebar handler: toggle play/pause when appropriate
  useEffect(() => {
    const onKeyDown = (e) => {
      // Detect spacebar (support older key values too)
      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
      if (!isSpace) return;

      // If any modifier is held, ignore
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const active = document.activeElement;
      if (active) {
        const tag = (active.tagName || '').toUpperCase();
        const isEditable = active.isContentEditable;
        // Ignore when focused on input fields, textareas, buttons, selects or contenteditable elements
        if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag) || isEditable) return;
        // Also ignore if an element with role="textbox" is focused
        const role = active.getAttribute && active.getAttribute('role');
        if (role === 'textbox') return;
      }

      // Prevent default scrolling
      try { e.preventDefault(); } catch (err) {}

      // Toggle play/pause
      handlePlayPause();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePlayPause]);

  const handleSongSelect = (song) => {
    // If clicking the same song that's playing, just toggle play/pause
    if (currentSong?.id === song.id && isPlaying) {
      setIsPlaying(false);
      return;
    }
    // If clicking the same song that's paused, resume
    if (currentSong?.id === song.id && !isPlaying) {
      setIsPlaying(true);
      return;
    }
    // Otherwise, select new song
    setCurrentSong(song);
    setCurrentTime(0);
    // Set isPlaying to true - PlayerBar will wait for audio to load before actually playing
    setIsPlaying(true);
  };

  // Track shuffle order for proper shuffle navigation
  const shuffleHistoryRef = useRef([]);
  const [shuffleOrder, setShuffleOrder] = useState([]);
  // Track playback history for previous button (works regardless of shuffle)
  const playbackHistoryRef = useRef([]);

  // Generate shuffle order when shuffle is enabled
  useEffect(() => {
    if (shuffle && songs.length > 0) {
      // Create shuffled array excluding current song
      const currentId = currentSong?.id;
      const availableSongs = songs.filter(s => s.id !== currentId);
      const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
      
      // Add current song at the start if it exists
      const order = currentId ? [currentId, ...shuffled.map(s => s.id)] : shuffled.map(s => s.id);
      setShuffleOrder(order);
      shuffleHistoryRef.current = [];
    } else {
      setShuffleOrder([]);
      shuffleHistoryRef.current = [];
    }
  }, [shuffle, songs.length, currentSong?.id]);

  // Add current song to shuffle history when it changes
  useEffect(() => {
    if (shuffle && currentSong) {
      const history = shuffleHistoryRef.current;
      if (!history.includes(currentSong.id)) {
        history.push(currentSong.id);
        // Keep history reasonable size
        if (history.length > songs.length * 2) {
          history.shift();
        }
      }
    }
  }, [currentSong, shuffle, songs.length]);

  // Add current song to playback history (for previous button, works regardless of shuffle)
  useEffect(() => {
    if (currentSong) {
      const history = playbackHistoryRef.current;
      // Only add if it's different from the last song in history
      if (history.length === 0 || history[history.length - 1] !== currentSong.id) {
        history.push(currentSong.id);
        // Keep history reasonable size (enough for going back through playlist)
        if (history.length > songs.length * 3) {
          history.shift();
        }
      }
    }
  }, [currentSong, songs.length]);

  const handleNext = () => {
    const currentList = displayedSongs.length > 0 ? displayedSongs : getCurrentSongs();
    if (currentSong && currentList.length > 0) {
      if (shuffle && shuffleOrder.length > 0) {
        const currentIndex = shuffleOrder.indexOf(currentSong.id);
        if (currentIndex !== -1 && currentIndex < shuffleOrder.length - 1) {
          const nextId = shuffleOrder[currentIndex + 1];
          const nextSong = currentList.find(s => s.id === nextId);
          if (nextSong) {
            handleSongSelect(nextSong);
            return;
          }
        }
        const availableSongs = currentList.filter(s => !shuffleHistoryRef.current.includes(s.id));
        if (availableSongs.length > 0) {
          const nextSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
          handleSongSelect(nextSong);
          return;
        }
        shuffleHistoryRef.current = [];
        const randomSong = currentList[Math.floor(Math.random() * currentList.length)];
        handleSongSelect(randomSong);
        return;
      } else {
        // Always advance to next track when user presses Next (even if repeat is enabled)
        const currentIndex = currentList.findIndex(s => s.id === currentSong.id);
        const nextIndex = (currentIndex + 1) % currentList.length;
        handleSongSelect(currentList[nextIndex]);
      }
    }
  };  

  const handlePrevious = () => {
    const currentList = displayedSongs.length > 0 ? displayedSongs : getCurrentSongs();
    if (currentSong && currentList.length > 0) {
      if (repeat) return;
      const history = playbackHistoryRef.current;
      if (history.length > 1) {
        history.pop();
        const prevId = history[history.length - 1];
        const prevSong = currentList.find(s => s.id === prevId);
        if (prevSong) {
          handleSongSelect(prevSong);
          return;
        }
      }
      const currentIndex = currentList.findIndex(s => s.id === currentSong.id);
      const prevIndex = currentIndex === 0 ? currentList.length - 1 : currentIndex - 1;
      handleSongSelect(currentList[prevIndex]);
    }
  };  

  // Playlist management
  const createPlaylist = (name) => {
    const newPlaylist = {
      id: Date.now().toString(),
      name: name,
      songs: [],
      createdAt: new Date().toISOString()
    };
    setPlaylists([...playlists, newPlaylist]);
  };

  const addSongToPlaylist = (playlistId, song) => {
    console.debug && console.debug('[App] addSongToPlaylist called', playlistId, song && song.title);
    const pid = String(playlistId);
    setPlaylists(prev => {
      const next = prev.map(playlist => {
        if (String(playlist.id) === pid) {
          // Check if song already exists (compare as strings)
          if (!playlist.songs.find(s => String(s.id) === String(song.id))) {
            const updated = { ...playlist, songs: [...playlist.songs, song] };
            console.debug && console.debug('[App] updated playlist', pid, updated);
            return updated;
          } else {
            console.debug && console.debug('[App] song already in playlist', pid, song.id);
          }
        }
        return playlist;
      });
      console.debug && console.debug('[App] playlists after add', next);

      // Dispatch an event so callers can observe the change immediately (useful for tests/debug/UI feedback)
      try {
        window.dispatchEvent(new CustomEvent('sosu:playlist-updated', { detail: { playlistId: pid, song, playlists: next } }));
      } catch (e) { console.error('dispatch playlist-updated failed', e); }

      return next;
    });

    // Expose for quick console debugging and fallback calls
    try { window.__sosu_addSongToPlaylist = addSongToPlaylist; } catch (e) {}
  };

  // Ensure a global helper is available immediately for other components to call directly
  try {
    window.__sosu_addSongToPlaylist = (playlistId, song) => {
      console.debug && console.debug('[window helper] __sosu_addSongToPlaylist called', playlistId, song && song.title);
      addSongToPlaylist(playlistId, song);
    };
  } catch (e) {}

  const removeSongFromPlaylist = (playlistId, songId) => {
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        return { ...playlist, songs: playlist.songs.filter(s => s.id !== songId) };
      }
      return playlist;
    }));
  };

  const lastPlaylistDeletedAtRef = React.useRef(0);

  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  const deletePlaylist = (playlistId) => {
    try { console.debug && console.debug('[App] deletePlaylist invoked, activeElement before confirm (modal):', document.activeElement && (document.activeElement.tagName + ' ' + (document.activeElement.id || document.activeElement.className || ''))); } catch (e) {}
    const target = playlists.find(p => p.id === playlistId);
    setConfirmDelete({ id: playlistId, name: target?.name || '' });
  };

  const confirmDeleteNow = (playlistId) => {
    try { console.debug && console.debug('[App] confirmDeleteNow', playlistId); } catch (e) {}
    setPlaylists(playlists.filter(p => p.id !== playlistId));
    // record deletion timestamp to avoid open race
    try { lastPlaylistDeletedAtRef.current = Date.now(); } catch (e) {}
    // blur any active element on next tick
    try {
      setTimeout(() => { try { if (document && document.activeElement) { document.activeElement.blur(); console.debug && console.debug('[App] blurred activeElement after confirmDeleteNow'); } } catch (e) {} }, 0);
    } catch (e) {}

    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
      setCurrentView('songs');
    }
    setConfirmDelete(null);
  };

  const cancelConfirmDelete = () => setConfirmDelete(null);

  // Export all user data as JSON
  const handleExportData = () => {
    const exportData = {
      playlists,
      favorites,
      playCounts,
      recentlyPlayed,
      settings: {
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
        sortBy: localStorage.getItem('sortBy') || 'none',
        sortDuration: localStorage.getItem('sortDuration') || 'none'
      },
      exportDate: new Date().toISOString(),
      version: VERSION
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

  // Import user data from JSON file
  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        // Import data with validation
        if (importData.playlists) setPlaylists(importData.playlists);
        if (importData.favorites) setFavorites(importData.favorites);
        if (importData.playCounts) setPlayCounts(importData.playCounts);
        if (importData.recentlyPlayed) setRecentlyPlayed(importData.recentlyPlayed);
        
        // Import settings
        if (importData.settings) {
          const s = importData.settings;
          if (s.volume !== undefined) setVolume(s.volume);
          if (s.autoplay !== undefined) setAutoplay(s.autoplay);
          if (s.shuffle !== undefined) setShuffle(s.shuffle);
          if (s.repeat !== undefined) setRepeat(s.repeat);
          if (s.discordRpcEnabled !== undefined) setDiscordRpcEnabled(s.discordRpcEnabled);
          if (s.widgetServerEnabled !== undefined) {
            setWidgetServerEnabled(s.widgetServerEnabled);
            // Auto-start widget server if it was enabled in import
            if (s.widgetServerEnabled && window.electronAPI) {
              setTimeout(async () => {
                const isRunning = await window.electronAPI.widgetIsRunning();
                if (!isRunning) {
                  const result = await window.electronAPI.widgetStartServer(3737);
                  if (result.success) {
                    console.log('[Import] Auto-started widget server');
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
            // If imported array is empty, default to ['Unknown Artist']
            setHiddenArtists(s.hiddenArtists.length === 0 ? ['Unknown Artist'] : s.hiddenArtists);
          }
          if (typeof s.nameFilter === 'string') setNameFilter(s.nameFilter);
          if (typeof s.nameFilterMode === 'string') {
            // Migration: we removed 'exact' from UI; treat as 'contains'
            setNameFilterMode(s.nameFilterMode === 'exact' ? 'contains' : s.nameFilterMode);
          }
          if (typeof s.scanAllMaps === 'boolean') setScanAllMaps(s.scanAllMaps);
          if (typeof s.dedupeTitlesEnabled === 'boolean') setDedupeTitlesEnabled(s.dedupeTitlesEnabled);
          if (s.sortBy !== undefined) localStorage.setItem('sortBy', s.sortBy);
          if (s.sortDuration !== undefined) localStorage.setItem('sortDuration', s.sortDuration);
        }
        
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setSelectedPlaylistId(null);
  };

  const handleSelectPlaylist = (playlistId) => {
    setSelectedPlaylistId(playlistId);
    setCurrentView(`playlist-${playlistId}`);
  };

  // Get current songs to display
  const getCurrentSongs = () => {
    let songsToReturn;
    
    if (currentView === 'songs') {
      songsToReturn = songs;
    } else if (currentView === 'recently-played') {
      songsToReturn = recentlyPlayed;
    } else if (currentView === 'favorites') {
      songsToReturn = songs.filter(song => favorites[song.id]);
    } else if (currentView === 'most-played') {
      songsToReturn = songs
        .filter(song => playCounts[song.id] && playCounts[song.id] > 0)
        .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0));
    } else {
      songsToReturn = playlists.find(p => p.id === selectedPlaylistId)?.songs ?? [];
    }

    // First apply per-song filters (duration, hidden artists, nameFilter)
    const filtered = songsToReturn.filter(song => {
      const duration = songDurations?.[song.id] ?? song.duration;

      // ✅ Use user-defined minDurationValue instead of hardcoded 10
      if (duration && duration < minDurationValue) return false;

      // Filter by hidden artists
      if (hiddenArtists.length > 0 && song.artist) {
        const artistLower = song.artist.toLowerCase().trim();
        if (hiddenArtists.some(hidden => hidden.toLowerCase().trim() === artistLower)) {
          return false;
        }
      }

      // Title Filter (hide): supports "mode::term" entries, comma-separated.
      if (nameFilter) {
        const songTitle = (song.title || '').toLowerCase();
        const raw = nameFilter
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        for (const item of raw) {
          const idx = item.indexOf('::');
          const mode = (idx > 0 ? item.slice(0, idx) : nameFilterMode).toLowerCase();
          const term = (idx > 0 ? item.slice(idx + 2) : item).toLowerCase().trim();
          if (!term) continue;

          let hit = false;
          switch (mode) {
            case 'startswith':
              hit = songTitle.startsWith(term);
              break;
            case 'endswith':
              hit = songTitle.endsWith(term);
              break;
            case 'contains':
            default:
              hit = songTitle.includes(term);
              break;
          }

          if (hit) return false; // hide when any term matches
        }
      }

      return true;
    });

    // If dedupe by title is disabled, return the filtered list as-is
    if (!dedupeTitlesEnabled) return filtered;

    // Group by normalized title (empty titles are treated as unique by id)
    const groups = new Map();

    for (const s of filtered) {
      const normalized = (s.title || '').toLowerCase().trim();
      const key = normalized || `__id__${s.id}`;
      const arr = groups.get(key) || [];
      arr.push(s);
      groups.set(key, arr);
    }

    // Build resulting list preserving first-occurrence order but replacing groups with a single canonical item
    const processed = new Set();
    const result = [];

    for (const s of filtered) {
      const normalized = (s.title || '').toLowerCase().trim();
      const key = normalized || `__id__${s.id}`;
      if (processed.has(key)) continue;

      const group = groups.get(key) || [s];
      if (group.length === 1) {
        result.push(s);
      } else {
        // Score songs by completeness: image, beatmapSetId, artist quality, duration
        const scored = group.map(song => {
          let score = 0;
          if (song.imageFile) score += 30;
          if (song.beatmapSetId) score += 25;
          if (song.artist && song.artist !== 'Unknown Artist') score += 10;
          if (song.title) score += 5;
          if (song.duration) score += Math.min(10, Math.round(song.duration / 30));
          return { song, score };
        }).sort((a, b) => b.score - a.score);

        const canonical = { ...scored[0].song };
        canonical.duplicates = group.filter(x => x.id !== canonical.id);
        canonical.duplicatesCount = canonical.duplicates.length;
        result.push(canonical);
      }

      processed.add(key);
    }

    return result;
  };  
  

  // Show first run screen if no folder is selected
  // But show loading screen if loading
  if (isFirstRun) {
    if (loading) {
      return <LoadingScreen loadingProgress={loadingProgress} />;
    }
    return (
      <FirstRunScreen
        onSelectFolder={async () => {
          if (!window.electronAPI) {
            alert('Electron API not available. Please run this app in Electron.');
            return;
          }

          const folderPath = await window.electronAPI.selectOsuFolder();
          if (!folderPath) return;

          // Clear previous error and initiate a forced scan showing the LoadingScreen
          setFirstRunError(null);
          const result = await loadSongs(folderPath, true, true); // Force scan and show loading

          // If scan found no songs, keep FirstRunScreen and show an error
          if (!result || !Array.isArray(result.songs) || result.songs.length === 0) {
            setFirstRunError('No songs were found in the selected folder. Please select your osu! Songs folder that contains beatmap folders.');
            return;
          }

          // Success: clear any error
          setFirstRunError(null);
        }}
        errorMessage={firstRunError}
      />
    );
  }

  if (!userDataLoaded || loading) {
    return (
      <Router>
        <LoadingScreen loadingProgress={loadingProgress} />
      </Router>
    );
  }

  return (
    <Router>
      <div className="app" style={{ opacity: 1, transition: 'opacity 0.5s ease-in' }}>
        {/* Blurred Album Art Background - covers entire viewport */}
        {albumArtBlur && currentSong?.imageFile && (
          <img 
            alt={currentSong.id}
            src={`osu://${encodeURIComponent(currentSong.imageFile)}`}
            className="app-blur-background"
            style={{
              filter: `blur(${blurIntensity}px) saturate(130%)`
            }}
          />
        )}
        <TitleBar currentSong={currentSong} />
        <div className="app-content">
          <Sidebar 
            onSelectFolder={() => setShowSettingsModal(true)} 
            osuFolderPath={osuFolderPath}
            currentView={currentView}
            onViewChange={handleViewChange}
            playlists={playlists}
            onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            onSelectPlaylist={handleSelectPlaylist}
            selectedPlaylistId={selectedPlaylistId}
          />
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            osuFolderPath={osuFolderPath}
            onSelectFolder={selectFolder}
            onRemoveFolder={removeFolder}
            discordRpcEnabled={discordRpcEnabled}
            onSetDiscordRpcEnabled={setDiscordRpcEnabled}
            widgetServerEnabled={widgetServerEnabled}
            onSetWidgetServerEnabled={setWidgetServerEnabled}
            albumArtBlur={albumArtBlur}
            onSetAlbumArtBlur={setAlbumArtBlur}
            blurIntensity={blurIntensity}
            onSetBlurIntensity={setBlurIntensity}
            accentColor={accentColor}
            onSetAccentColor={setAccentColor}
            onClearCache={clearSongsCache}
            vuEnabled={vuEnabled}
            onSetVuEnabled={setVuEnabled}
            minDurationValue={minDurationValue}
            setMinDurationValue={setMinDurationValue}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetApp={resetAppToDefaults}
            hiddenArtists={hiddenArtists}
            setHiddenArtists={setHiddenArtists}
            nameFilter={nameFilter}
            setNameFilter={setNameFilter}
            nameFilterMode={nameFilterMode}
            setNameFilterMode={setNameFilterMode}
            getAllArtists={getAllArtists}
            filterStats={getFilterStats()}
            scanAllMaps={scanAllMaps}
            setScanAllMaps={setScanAllMaps}
            dedupeTitlesEnabled={dedupeTitlesEnabled}
            setDedupeTitlesEnabled={setDedupeTitlesEnabled}
            showSongBadges={showSongBadges}
            onSetShowSongBadges={setShowSongBadges}
            totalScanned={songs.length}
          />
          <EQModal
            isOpen={showEQModal}
            onClose={() => setShowEQModal(false)}
            bands={eqBands}
            onBandChange={(idx, gain) => {
              const next = eqBands.slice();
              next[idx] = { ...next[idx], gain };
              setEqBands(next);
            }}
            presets={EQ_PRESETS}
            onSetPreset={(preset) => setEqBands(preset.bands)}
          />
          
          <CreatePlaylistModal
            isOpen={showCreatePlaylistModal}
            onClose={() => setShowCreatePlaylistModal(false)}
            onCreate={createPlaylist}
          />

          {/* Non-blocking confirm dialog for playlist deletion (replaces window.confirm to avoid focus races) */}
          {confirmDelete && (
            <div className="modal-overlay" onClick={cancelConfirmDelete}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Delete Playlist</h2>
                  <button className="modal-close" onClick={cancelConfirmDelete}>
                    <span style={{opacity:0.8}}>✕</span>
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  <p>Are you sure you want to delete <strong>{confirmDelete.name || 'this playlist'}</strong>?</p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                    <button className="modal-button cancel" onClick={cancelConfirmDelete}>Cancel</button>
                    <button className="modal-button create" onClick={() => confirmDeleteNow(confirmDelete.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback: open create playlist modal when other code dispatches the custom event */}
          <MainContent
            songs={getCurrentSongs()}
            onSongSelect={handleSongSelect}
            currentSong={currentSong}
            songDurations={songDurations}
            loading={loading}
            loadingProgress={loadingProgress}
            currentView={currentView}
            selectedPlaylistId={selectedPlaylistId}
            playlists={playlists}
            allSongs={songs}
            onAddToPlaylist={addSongToPlaylist}
            onRemoveFromPlaylist={removeSongFromPlaylist}
            onDeletePlaylist={deletePlaylist}
            minDurationValue={minDurationValue}
            albumArtBlur={albumArtBlur}
            blurIntensity={blurIntensity}
            favorites={favorites}
            isPlayingNow={isPlaying}
            itemsPerPage={itemsPerPage}
            onDisplayedSongsChange={(list) => {
              setDisplayedSongs(list);
              setDisplayedSongsSourceView(currentView);
            }}
            onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            onToggleFavorite={(songId) => {
              setFavorites(prev => {
                const newFav = { ...prev };
                if (newFav[songId]) {
                  delete newFav[songId];
                } else {
                  newFav[songId] = true;
                }
                return newFav;
              });
            }}
            onAddArtistToFilter={(artist) => {
              if (!artist) return;
              setHiddenArtists(prev => {
                const normalized = artist.trim();
                if (!normalized) return prev;
                if (prev.some(a => a.toLowerCase().trim() === normalized.toLowerCase())) return prev;
                const next = [...prev, normalized];
                return next;
              });
            }}
            onOpenSongDetails={(song) => setSongDetails(song)}
            onPreviewSelect={(song) => {
              // Preview-select: only set UI highlight, do NOT change playback
              setHighlightedSongId(song ? song.id : null);
            }}
            onClearPreview={() => setHighlightedSongId(null)}
            highlightedSongId={highlightedSongId}
            showSongBadges={showSongBadges}
            playCounts={playCounts}
            nameFilter={nameFilter}
          />

          {/* Song details modal (opened from context menu) */}
          {songDetails && (
            <SongDetailsModal
              isOpen={!!songDetails}
              song={songDetails}
              onClose={() => { setSongDetails(null); setHighlightedSongId(null); }}
            />
          )}
        </div>
        <PlayerBar
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          currentTime={currentTime}
          duration={duration}
          onTimeUpdate={setCurrentTime}
          onDurationChange={(dur) => {
            setDuration(dur);
            if (currentSong && dur > 0) {
              setSongDurations(prev => ({
                ...prev,
                [currentSong.id]: dur
              }));
            }
          }}
          volume={volume}
          onVolumeChange={setVolume}
          autoplay={autoplay}
          onAutoplayChange={setAutoplay}
          shuffle={shuffle}
          onShuffleChange={setShuffle}
          repeat={repeat}
          onRepeatChange={setRepeat}
          playlists={playlists}
          onAddToPlaylist={addSongToPlaylist}
          eqBands={eqBands}
          onEqBandsChange={setEqBands}
          showEQModal={showEQModal}
          onOpenEQModal={() => setShowEQModal(true)}
          vuEnabled={vuEnabled}
        />
      </div>
    </Router>
  );
}

export default App;