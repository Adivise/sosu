import { useState, useEffect, useRef } from 'react';
import { EyeOff } from 'lucide-react';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import PlayerBar from './components/PlayerBar';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import SettingsModal from './components/SettingsModal';
import EQModal from './components/EQModal';
import LoadingScreen from './components/LoadingScreen';
import FirstRunScreen from './components/FirstRunScreen';
import SongDetailsModal from './components/SongDetailsModal';
import CloseConfirmDialog from './components/CloseConfirmDialog';
import { DEFAULT_EQ_BANDS } from './components/eqConstants';
import { EQ_PRESETS } from './components/eqPresets';
import { VERSION } from './version';
import './App.css';
import useLocalStorageState from './hooks/useLocalStorageState';
import { normalizeEqBands, getContrastColor, adjustBrightness } from './utils/colorUtils';
import { getCurrentSongs as getCurrentSongsHelper, getFilterStats as getFilterStatsHelper } from './utils/songFilters';
import { getAllArtists as getAllArtistsHelper } from './utils/songHelpers';
import {
  buildShuffleOrder as buildShuffleOrderHelper,
  updateShuffleHistory as updateShuffleHistoryHelper,
  updatePlaybackHistory as updatePlaybackHistoryHelper
} from './utils/playbackHelpers';
import { scheduleSave as scheduleSaveHelper } from './utils/userDataSave';
import { resetSettingsToDefaults as resetSettingsToDefaultsHelper, resetFullToDefaults as resetFullToDefaultsHelper } from './handlers/resetAppToDefaults';
import {
  handlePlayPause as handlePlayPauseHelper,
  handleSongSelect as handleSongSelectHelper,
  handleNext as handleNextHelper,
  handlePrevious as handlePreviousHelper
} from './handlers/playbackHandlers';
import {
  createPlaylist as createPlaylistHelper,
  addSongToPlaylist as addSongToPlaylistHelper,
  removeSongFromPlaylist as removeSongFromPlaylistHelper,
  requestDeletePlaylist as requestDeletePlaylistHelper,
  confirmDeletePlaylist as confirmDeletePlaylistHelper,
  cancelDeletePlaylist as cancelDeletePlaylistHelper,
  ensurePlaylistGlobalHelper as ensurePlaylistGlobalHelperHelper,
  renamePlaylist as renamePlaylistHelper
} from './handlers/playlistHandlers';
import {
  getSettingsSnapshot as getSettingsSnapshotHelper,
  applySettingsFromData as applySettingsFromDataHelper,
  handleExportData as handleExportDataHelper,
  handleImportData as handleImportDataHelper,
  getProfileData as getProfileDataHelper,
  handleSaveProfile as handleSaveProfileHelper,
  handleLoadProfile as handleLoadProfileHelper,
  handleDeleteProfile as handleDeleteProfileHelper,
  handleListProfiles as handleListProfilesHelper,
  handleExportProfile as handleExportProfileHelper
} from './handlers/profileHandlers';
import {
  createCloseRequestHandler as createCloseRequestHandlerHelper,
  handleCloseConfirmMinimize as handleCloseConfirmMinimizeHelper,
  handleCloseConfirmQuit as handleCloseConfirmQuitHelper,
  handleCloseConfirmCancel as handleCloseConfirmCancelHelper
} from './handlers/windowHandlers';
import {
  registerHighlightSongEvent as registerHighlightSongEventHelper,
  registerOpenSettingsEvent as registerOpenSettingsEventHelper,
  registerCreatePlaylistEvent as registerCreatePlaylistEventHelper
} from './handlers/eventHandlers';
import {
  handleViewChange as handleViewChangeHelper,
  handleSelectPlaylist as handleSelectPlaylistHelper
} from './handlers/viewHandlers';
import {
  buildUserDataPayload as buildUserDataPayloadHelper,
  flushUserData as flushUserDataHelper
} from './handlers/saveHandlers';
import {
  buildDiscordPayload as buildDiscordPayloadHelper,
  buildWidgetPayload as buildWidgetPayloadHelper,
  dispatchDiscord as dispatchDiscordHelper,
  dispatchWidget as dispatchWidgetHelper,
  startWidgetTimeInterval as startWidgetTimeIntervalHelper,
  clearDispatchTimers as clearDispatchTimersHelper
} from './handlers/discordWidgetHandlers';
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
  const [showSongBadges, setShowSongBadges] = useLocalStorageState('showSongBadges', false);
  const [favorites, setFavorites] = useLocalStorageState('favorites', {});
  const [_durationFilter, setDurationFilter] = useState({ min: 0, max: Infinity });
  const [itemsPerPage, setItemsPerPage] = useLocalStorageState('itemsPerPage', 50);
  const [displayedSongs, setDisplayedSongs] = useState([]);
  const [displayedSongsSourceView, setDisplayedSongsSourceView] = useState(null);
  const [songDetails, setSongDetails] = useState(null);
  const [highlightedSongId, setHighlightedSongId] = useState(null); // preview highlight id
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const pendingPreviewRef = useRef(false);
  
  // Close to tray settings
  const [closeToTray, setCloseToTray] = useLocalStorageState('closeToTray', true);
  const [askBeforeClose, setAskBeforeClose] = useLocalStorageState('askBeforeClose', true);
  const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false);
  const [hardwareAcceleration, setHardwareAcceleration] = useLocalStorageState('hardwareAcceleration', true);

  // Highlight song requests from other UI elements (e.g., jump-to-song)
  useEffect(() => {
    return registerHighlightSongEventHelper({ setHighlightedSongId });
  }, []);

  // Watch for the preview window closing so we can re-enable the player UI
  useEffect(() => {
    if (!window.electronAPI) return;
    const handleClosed = () => {
      // ignore closures that occur while we're immediately opening a new preview
      if (pendingPreviewRef.current) return;
      setIsPreviewOpen(false);
      setHighlightedSongId(null);
    };
    window.electronAPI.onBeatmapPlayerClosed(handleClosed);
    return () => {
      if (window.electronAPI.removeBeatmapPlayerClosedListener) {
        window.electronAPI.removeBeatmapPlayerClosedListener();
      }
    };
  }, []);

  // Allow other UI to open Settings via a custom event (used by the "No results" helper)
  useEffect(() => {
    return registerOpenSettingsEventHelper({ setShowSettingsModal });
  }, []);

  // Fallback global event to open the Create Playlist modal when other code dispatches it
  useEffect(() => {
    return registerCreatePlaylistEventHelper({
      setShowCreatePlaylistModal,
      lastPlaylistDeletedAtRef
    });
  }, []);

  // Handle app close request from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleCloseRequest = createCloseRequestHandlerHelper({
      askBeforeClose,
      closeToTray,
      setShowCloseConfirmDialog,
      electronAPI: window.electronAPI
    });

    window.electronAPI.onAppCloseRequested(handleCloseRequest);

    return () => {
      window.electronAPI.removeAppCloseRequestedListener();
    };
  }, [askBeforeClose, closeToTray]);

  const handleCloseConfirmMinimize = (dontAskAgain) => {
    handleCloseConfirmMinimizeHelper({
      dontAskAgain,
      setAskBeforeClose,
      setCloseToTray,
      setShowCloseConfirmDialog,
      electronAPI: window.electronAPI
    });
  };

  const handleCloseConfirmQuit = (dontAskAgain) => {
    handleCloseConfirmQuitHelper({
      dontAskAgain,
      setAskBeforeClose,
      setCloseToTray,
      setShowCloseConfirmDialog,
      electronAPI: window.electronAPI
    });
  };

  const handleCloseConfirmCancel = () => {
    handleCloseConfirmCancelHelper({ setShowCloseConfirmDialog });
  };

  const openBeatmapPreview = async (song = null) => {
    if (!song || !song.folderPath) {
      console.error('[Preview] No song or folder path provided');
      return;
    }

    // pause current playback and mark preview open so UI can block
    if (isPlaying) {
      setIsPlaying(false);
    }
    setIsPreviewOpen(true);
    pendingPreviewRef.current = true;

    try {
      // send current theme to preview before opening so it matches immediately
      try {
        const accentHover = adjustBrightness(accentColor, 120);
        const accentDark = adjustBrightness(accentColor, 80);
        const accentContrast = getContrastColor(accentColor);
        const hex = (accentColor || '#1db954').replace('#', '').trim();
        let r = 29, g = 185, b = 84;
        if (hex.length === 6) { r = parseInt(hex.slice(0,2), 16); g = parseInt(hex.slice(2,4), 16); b = parseInt(hex.slice(4,6), 16); }
        if (window.electronAPI?.updateBeatmapPlayerTheme) {
          window.electronAPI.updateBeatmapPlayerTheme({
            accentColor,
            accentHover,
            accentDark,
            accentContrast,
            accentColorRgb: `${r}, ${g}, ${b}`
          });
        }
      } catch (e) { /* ignore */ }

      const result = await window.electronAPI.openBeatmapPlayer(song.folderPath);
      pendingPreviewRef.current = false;
      if (!result?.success) {
        console.error('[Preview] Failed to open window:', result?.error);
        // if the preview failed to open, clear the open flag so UI isn't blocked forever
        setIsPreviewOpen(false);
      } else {
        // Ensure the newly opened preview receives theme vars — send again after window is created
        const themePayload = {
          accentColor,
          accentHover: adjustBrightness(accentColor, 120),
          accentDark: adjustBrightness(accentColor, 80),
          accentContrast: getContrastColor(accentColor),
          accentColorRgb: (() => {
            const hex = (accentColor || '#1db954').replace('#', '').trim();
            let r = 29, g = 185, b = 84;
            if (hex.length === 6) {
              r = parseInt(hex.slice(0, 2), 16);
              g = parseInt(hex.slice(2, 4), 16);
              b = parseInt(hex.slice(4, 6), 16);
            }
            return `${r}, ${g}, ${b}`;
          })()
        };
        try {
          const sendTheme = () => {
            try {
              if (window.electronAPI?.updateBeatmapPlayerTheme) {
                window.electronAPI.updateBeatmapPlayerTheme(themePayload);
              }
            } catch (_e) { /* ignore */ }
          };
          sendTheme();
          setTimeout(sendTheme, 120);
        } catch (_e) { /* ignore */ }
      }
    } catch (err) {
      console.error('[Preview] Error opening beatmap player:', err);
      pendingPreviewRef.current = false;
      setIsPreviewOpen(false);
    }
  };
  
  // Advanced filters
  const [hiddenArtists, setHiddenArtists] = useLocalStorageState('hiddenArtists', ['Unknown Artist']);
  const [nameFilter, setNameFilter] = useLocalStorageState('nameFilter', '');
  const [nameFilterMode, setNameFilterMode] = useLocalStorageState('nameFilterMode', 'contains');
  const [scanAllMaps, setScanAllMaps] = useLocalStorageState('scanAllMaps', false);
  const [dedupeTitlesEnabled, setDedupeTitlesEnabled] = useLocalStorageState('dedupeTitlesEnabled', false);
  const [preferredCanonicalByTitle, setPreferredCanonicalByTitle] = useLocalStorageState('preferredCanonicalByTitle', {});

  const {
    songs,
    setSongs,
    songsCache: _songsCache,
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
    setPlayCounts: _setPlayCounts,
    recentlyPlayed,
    setRecentlyPlayed: _setRecentlyPlayed,
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
      try {
        if (el.parentNode) el.parentNode.removeChild(el);
      } catch (_e) { /* ignore */ }
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
        let _effectiveScanAllMaps = scanAllMaps;

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
            _effectiveScanAllMaps = data.scanAllMaps;
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
          if (typeof data.showSongBadges === 'boolean') setShowSongBadges(data.showSongBadges);
          if (typeof data.hardwareAcceleration === 'boolean') setHardwareAcceleration(data.hardwareAcceleration);
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

      // Send theme vars to beatmap preview window (runtime sync)
      try {
        if (window.electronAPI?.updateBeatmapPlayerTheme) {
          window.electronAPI.updateBeatmapPlayerTheme({
            accentColor,
            accentHover,
            accentDark,
            accentContrast,
            accentColorRgb: `${r}, ${g}, ${b}`
          });
        }
      } catch (err) { /* ignore */ }
    }
  }, [accentColor]);

  // EQ bands persisted by useLocalStorageState

  // Debounced save of user data to avoid frequent disk writes (currentTime excluded from main effect)
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);

  const scheduleSave = (partialData, delay = 1000, immediate = true) => {
    scheduleSaveHelper({
      pendingSaveRef,
      saveTimerRef,
      saveUserData: (data) => {
        if (window.electronAPI && data) {
          try { window.electronAPI.saveUserData(data); } catch (e) {}
        }
      }
    }, partialData, delay, immediate);
  };

  // Ensure accent color is saved immediately when it changes so preview windows
  // that read from userData always see the latest accent (even if theme IPC
  // messages are missed due to timing).
  useEffect(() => {
    if (!userDataLoaded) return;
    scheduleSave({ accentColor }, 0, true);
  }, [accentColor, userDataLoaded]);

  // Save general user settings (exclude high-frequency currentTime updates)
  useEffect(() => {
    if (!userDataLoaded) return;
    const userData = buildUserDataPayloadHelper({
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
      playCounts
    });

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
    // Added `vuEnabled` so toggling the VU meter triggers a save immediately
  }, [userDataLoaded, volume, autoplay, shuffle, repeat, playlists, osuFolderPath, discordRpcEnabled, widgetServerEnabled, vuEnabled, minDurationValue, itemsPerPage, albumArtBlur, blurIntensity, accentColor, showSongBadges, hardwareAcceleration, hiddenArtists, nameFilter, nameFilterMode, scanAllMaps, dedupeTitlesEnabled, currentSong, duration, eqBands, recentlyPlayed, playCounts]);

  // Set window title based on current song
  useEffect(() => {
    if (window.electronAPI?.windowSetTitle) {
      if (currentSong) {
        const titleText = `${currentSong.title}${currentSong.artist ? ' — ' + currentSong.artist : ''} (Player)`;
        window.electronAPI.windowSetTitle(titleText);
      } else {
        window.electronAPI.windowSetTitle('sosu (Player)');
      }
    }
  }, [currentSong]);

  // Ensure data is flushed when the window is being closed or hidden (force save on exit)
  useEffect(() => {
    const flush = () => {
      try {
        flushUserDataHelper({
          userDataLoaded,
          scheduleSave,
          payloadArgs: {
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
            playCounts
          },
          includeCurrentTime: true,
          includeMode: true,
          logLabel: '[App] forced save on close/visibilitychange'
        });
      } catch (e) {
        console.warn('[App] forced save failed', e);
      }
    };

    const onBeforeUnload = (_e) => { flush(); };
    const onPageHide = (_e) => { flush(); };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flush(); };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userDataLoaded, volume, autoplay, shuffle, repeat, playlists, osuFolderPath, discordRpcEnabled, widgetServerEnabled, minDurationValue, itemsPerPage, albumArtBlur, blurIntensity, accentColor, showSongBadges, hardwareAcceleration, hiddenArtists, nameFilter, nameFilterMode, scanAllMaps, dedupeTitlesEnabled, currentSong, currentTime, duration, eqBands, recentlyPlayed, playCounts]);

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
  const currentTimeRef = useRef(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    // Determine whether this is a song change or play/pause toggle which should be immediate
    const songChanged = prevDiscordSongIdRef.current !== (currentSong ? currentSong.id : null);
    const isPlayingChanged = prevIsPlayingRef.current !== isPlaying;
    prevDiscordSongIdRef.current = currentSong ? currentSong.id : null;
    prevIsPlayingRef.current = isPlaying;

    const discordPayload = buildDiscordPayloadHelper({ currentSong, duration });
    const widgetPayload = buildWidgetPayloadHelper({ currentSong, isPlaying, currentTime, duration });

    // Dispatch with immediate=true for song change / pause / resume events
    const immediate = songChanged || isPlayingChanged || !isPlaying;

    if (discordRpcEnabled) {
      dispatchDiscordHelper({
        electronAPI: window.electronAPI,
        payload: discordPayload,
        immediate,
        throttleMs: DISPATCH_THROTTLE,
        lastSentRef: lastDiscordSentRef,
        pendingTimerRef: pendingDiscordTimerRef,
        pendingPayloadRef: pendingDiscordPayloadRef
      });
    } else {
      dispatchDiscordHelper({
        electronAPI: window.electronAPI,
        payload: null,
        immediate: true,
        throttleMs: DISPATCH_THROTTLE,
        lastSentRef: lastDiscordSentRef,
        pendingTimerRef: pendingDiscordTimerRef,
        pendingPayloadRef: pendingDiscordPayloadRef
      });
    }

    // Send metadata updates as before
    dispatchWidgetHelper({
      electronAPI: window.electronAPI,
      payload: widgetPayload,
      immediate,
      throttleMs: DISPATCH_THROTTLE,
      lastSentRef: lastWidgetSentRef,
      pendingTimerRef: pendingWidgetTimerRef,
      pendingPayloadRef: pendingWidgetPayloadRef
    });

    // If playing and widget server enabled, start a fast interval to send currentTime-only updates
    // This enables near-realtime currentTime updates without spamming metadata updates
    const intervalId = startWidgetTimeIntervalHelper({
      electronAPI: window.electronAPI,
      widgetServerEnabled,
      isPlaying,
      currentSong,
      currentTimeRef
    });

    // Cleanup scheduled timers on unmount / when dependencies change
    return () => {
      clearDispatchTimersHelper({ pendingDiscordTimerRef, pendingWidgetTimerRef });
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

  const getAllArtists = () => getAllArtistsHelper(songs);

  // Calculate filtered stats
  const filterStats = getFilterStatsHelper({
    songs,
    songDurations,
    minDurationValue,
    hiddenArtists,
    nameFilter,
    nameFilterMode,
    dedupeTitlesEnabled
  });

  // If the currently playing song is no longer in the global songs list
  // (e.g. after reset or rescan removed it), stop playback and clear it
  useEffect(() => {
    if (!currentSong) return;
    // Don't clear if this is a difficulty variant (has _difficultyFilename)
    // Difficulty variants are synthetic objects created from currentSong, so they won't be in songs list
    if (currentSong._difficultyFilename) return;
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



  const handleResetSettings = async () => {
    await resetSettingsToDefaultsHelper({
      electronAPI: window.electronAPI,
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
    });
  };

  const handleResetFull = async () => {
    await resetFullToDefaultsHelper({
      electronAPI: window.electronAPI
    });
  };

  // Song loading and scanning logic moved to `useSongs` hook. See `hooks/useSongs.js` for implementation.


  const handlePlayPause = () => {
    handlePlayPauseHelper({ isPlaying, setIsPlaying });
  };

  // Global spacebar handler: toggle play/pause when appropriate
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isPreviewOpen) return; // don't respond while preview window blocks UI
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
  }, [handlePlayPause, isPreviewOpen]);

  const handleSongSelect = (song) => {
    // If titles are grouped (dedupe) and user plays a hidden duplicate,
    // promote it to be the canonical entry for that title.
    try {
      if (dedupeTitlesEnabled && song && !song._difficultyFilename) {
        const key = (song.title || '').toLowerCase().trim();
        if (key) {
          setPreferredCanonicalByTitle((prev) => ({ ...(prev || {}), [key]: song.id }));
        }
      }
    } catch (_e) {}

    handleSongSelectHelper({
      song,
      currentSong,
      isPlaying,
      setIsPlaying,
      setCurrentSong,
      setCurrentTime
    });
  };

  // Track shuffle order for proper shuffle navigation
  const shuffleHistoryRef = useRef([]);
  const [shuffleOrder, setShuffleOrder] = useState([]);
  // Track playback history for previous button (works regardless of shuffle)
  const playbackHistoryRef = useRef([]);

  // Generate shuffle order when shuffle is enabled
  useEffect(() => {
    if (shuffle && songs.length > 0) {
      const order = buildShuffleOrderHelper({ songs, currentSongId: currentSong?.id });
      setShuffleOrder(order);
      shuffleHistoryRef.current = [];
    } else {
      setShuffleOrder([]);
      shuffleHistoryRef.current = [];
    }
  }, [shuffle, songs.length, currentSong?.id]);

  // Add current song to shuffle history when it changes
  useEffect(() => {
    updateShuffleHistoryHelper({
      shuffle,
      currentSong,
      songsLength: songs.length,
      shuffleHistoryRef
    });
  }, [currentSong, shuffle, songs.length]);

  // Add current song to playback history (for previous button, works regardless of shuffle)
  useEffect(() => {
    updatePlaybackHistoryHelper({
      currentSong,
      songsLength: songs.length,
      playbackHistoryRef
    });
  }, [currentSong, songs.length]);

  const currentSongsArgs = {
    currentView,
    songs,
    recentlyPlayed,
    favorites,
    playCounts,
    playlists,
    selectedPlaylistId,
    songDurations,
    minDurationValue,
    hiddenArtists,
    nameFilter,
    nameFilterMode,
    dedupeTitlesEnabled,
    preferredCanonicalByTitle
  };

  const getCurrentSongs = () => getCurrentSongsHelper(currentSongsArgs);

  const handleNext = () => {
    handleNextHelper({
      displayedSongs,
      getCurrentSongs,
      currentSong,
      shuffle,
      shuffleOrder,
      shuffleHistoryRef,
      handleSongSelect
    });
  };  

  const handlePrevious = () => {
    handlePreviousHelper({
      displayedSongs,
      getCurrentSongs,
      currentSong,
      repeat,
      playbackHistoryRef,
      handleSongSelect
    });
  };  

  // Playlist management
  const createPlaylist = (name) => {
    createPlaylistHelper({ name, playlists, setPlaylists });
  };

  const addSongToPlaylist = (playlistId, song) => {
    addSongToPlaylistHelper({ playlistId, song, setPlaylists });
  };

  const removeSongFromPlaylist = (playlistId, songId) => {
    removeSongFromPlaylistHelper({ playlistId, songId, playlists, setPlaylists });
  };

  const lastPlaylistDeletedAtRef = useRef(0);

  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  const deletePlaylist = (playlistId) => {
    requestDeletePlaylistHelper({ playlistId, playlists, setConfirmDelete });
  };

  const confirmDeleteNow = (playlistId) => {
    confirmDeletePlaylistHelper({
      playlistId,
      playlists,
      setPlaylists,
      setSelectedPlaylistId,
      setCurrentView,
      setConfirmDelete,
      lastPlaylistDeletedAtRef
    });
  };

  const cancelConfirmDelete = () => {
    cancelDeletePlaylistHelper({ setConfirmDelete });
  };

  const renamePlaylist = (playlistId, newName) => {
    renamePlaylistHelper({ playlistId, newName, playlists, setPlaylists });
  };

  useEffect(() => {
    ensurePlaylistGlobalHelperHelper({
      addSongToPlaylist: ({ playlistId, song, setPlaylists: targetSetPlaylists }) => {
        addSongToPlaylistHelper({ playlistId, song, setPlaylists: targetSetPlaylists });
      },
      setPlaylists
    });
  }, [setPlaylists]);

  const getSettingsSnapshot = () =>
    getSettingsSnapshotHelper({
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
      hardwareAcceleration,
      closeToTray,
      askBeforeClose
    });

  const applySettings = (settings, logPrefix) =>
    applySettingsFromDataHelper({
      settings,
      normalizeEqBands,
      electronAPI: window.electronAPI,
      logPrefix,
      setters: {
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
        setShowSongBadges,
        setHardwareAcceleration,
        setCloseToTray,
        setAskBeforeClose
      }
    });

  const handleExportData = () => {
    handleExportDataHelper({ settings: getSettingsSnapshot(), version: VERSION });
  };

  const handleImportData = (event) => {
    handleImportDataHelper({
      event,
      applySettings: (settings) => applySettings(settings, 'Import')
    });
  };

  const getProfileData = () =>
    getProfileDataHelper({ settings: getSettingsSnapshot(), version: VERSION });

  const handleSaveProfile = async (profileName) => {
    return handleSaveProfileHelper({
      profileName,
      profileData: getProfileData(),
      electronAPI: window.electronAPI
    });
  };

  const handleLoadProfile = async (profileName) => {
    return handleLoadProfileHelper({
      profileName,
      electronAPI: window.electronAPI,
      applySettings: (settings) => applySettings(settings, 'Profile')
    });
  };

  const handleDeleteProfile = async (profileName) => {
    return handleDeleteProfileHelper({ profileName, electronAPI: window.electronAPI });
  };

  const handleListProfiles = async () => {
    return handleListProfilesHelper({ electronAPI: window.electronAPI });
  };

  const handleExportProfile = async (profileName) => {
    return handleExportProfileHelper({ profileName, electronAPI: window.electronAPI });
  };

  const handleViewChange = (view) => {
    handleViewChangeHelper({ view, setCurrentView, setSelectedPlaylistId });
  };

  const handleSelectPlaylist = (playlistId) => {
    handleSelectPlaylistHelper({ playlistId, setSelectedPlaylistId, setCurrentView });
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
            onOpenBeatmapPreview={() => openBeatmapPreview(null)}
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
            onResetSettings={handleResetSettings}
            onResetFull={handleResetFull}
            hiddenArtists={hiddenArtists}
            setHiddenArtists={setHiddenArtists}
            nameFilter={nameFilter}
            setNameFilter={setNameFilter}
            nameFilterMode={nameFilterMode}
            setNameFilterMode={setNameFilterMode}
            getAllArtists={getAllArtists}
            filterStats={filterStats}
            scanAllMaps={scanAllMaps}
            setScanAllMaps={setScanAllMaps}
            dedupeTitlesEnabled={dedupeTitlesEnabled}
            setDedupeTitlesEnabled={setDedupeTitlesEnabled}
            showSongBadges={showSongBadges}
            onSetShowSongBadges={setShowSongBadges}
            totalScanned={songs.length}
            onSaveProfile={handleSaveProfile}
            onLoadProfile={handleLoadProfile}
            onDeleteProfile={handleDeleteProfile}
            onListProfiles={handleListProfiles}
            onExportProfile={handleExportProfile}
            closeToTray={closeToTray}
            onSetCloseToTray={setCloseToTray}
            askBeforeClose={askBeforeClose}
            onSetAskBeforeClose={setAskBeforeClose}
            hardwareAcceleration={hardwareAcceleration}
            onSetHardwareAcceleration={setHardwareAcceleration}
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

          <CloseConfirmDialog
            isOpen={showCloseConfirmDialog}
            onMinimize={handleCloseConfirmMinimize}
            onQuit={handleCloseConfirmQuit}
            onCancel={handleCloseConfirmCancel}
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
            songs={getCurrentSongsHelper(currentSongsArgs)}
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
            onRenamePlaylist={renamePlaylist}
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
            onOpenBeatmapPreview={(song) => openBeatmapPreview(song)}
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
          controlsDisabled={isPreviewOpen}
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
          onOpenBeatmapPreview={(song) => openBeatmapPreview(song)}
        />

        {/* overlay that blocks interaction while preview window is open */}
        {isPreviewOpen && (
          <div className="preview-blocker-overlay">
            <div className="preview-blocker-inner">
              <EyeOff className="preview-blocker-icon" />
              <div className="preview-blocker-message">Preview open – close it to return to player</div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;