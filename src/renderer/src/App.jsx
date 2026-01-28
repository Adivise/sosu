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
import { DEFAULT_EQ_BANDS } from './components/eqConstants';
import { EQ_PRESETS } from './components/eqPresets';
import { VERSION } from './version';
import './App.css';

// Normalize saved EQ data to current band layout (supports migration from older 10-band data)
const normalizeEqBands = (bands) => {
  if (!Array.isArray(bands)) return DEFAULT_EQ_BANDS;
  const byFreq = new Map(
    bands
      .filter((b) => b && typeof b.freq === 'number')
      .map((b) => [b.freq, typeof b.gain === 'number' ? b.gain : 0])
  );

  return DEFAULT_EQ_BANDS.map((band) => {
    const gain = byFreq.get(band.freq);
    if (gain === undefined) return { ...band, gain: 0 };
    const clamped = Math.max(-12, Math.min(12, Number(gain)));
    return { ...band, gain: clamped };
  });
};

// Choose black/white text for best contrast against a given hex color
const getContrastColor = (hex) => {
  if (!hex) return '#000';
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#000';
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#000' : '#fff';
};

// Utility function to adjust color brightness
const adjustBrightness = (hex, percent) => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  const adjust = percent / 100;
  const newR = Math.round(Math.min(255, r * adjust));
  const newG = Math.round(Math.min(255, g * adjust));
  const newB = Math.round(Math.min(255, b * adjust));
  
  // Convert back to hex
  return '#' + [newR, newG, newB].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

function App() {
  const [songs, setSongs] = useState([]);
  const [minDurationValue, setMinDurationValue] = useState(60); // Minimum duration in seconds
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [osuFolderPath, setOsuFolderPath] = useState(null);
  const [songDurations, setSongDurations] = useState({});
  const [autoplay, setAutoplay] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('songs');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEQModal, setShowEQModal] = useState(false);
  const [songsCache, setSongsCache] = useState({});
  const [discordRpcEnabled, setDiscordRpcEnabled] = useState(false);
  const [widgetServerEnabled, setWidgetServerEnabled] = useState(false);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [eqBands, setEqBands] = useState(() => {
    const saved = localStorage.getItem('eqBands');
    return saved ? normalizeEqBands(JSON.parse(saved)) : DEFAULT_EQ_BANDS;
  });
  const [albumArtBlur, setAlbumArtBlur] = useState(() => {
    const saved = localStorage.getItem('albumArtBlur');
    return saved ? JSON.parse(saved) : true;
  });
  const [blurIntensity, setBlurIntensity] = useState(() => {
    const saved = localStorage.getItem('blurIntensity');
    return saved ? parseInt(saved) : 60; // Default 60px blur
  });
  const [accentColor, setAccentColor] = useState(() => {
    const saved = localStorage.getItem('accentColor');
    return saved || '#1db954'; // Default Spotify green
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    const saved = localStorage.getItem('recentlyPlayed');
    return saved ? JSON.parse(saved) : [];
  });
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : {}; // { songId: true }
  });
  const [ratings, setRatings] = useState(() => {
    const saved = localStorage.getItem('ratings');
    return saved ? JSON.parse(saved) : {}; // { songId: 1-5 }
  });
  const [playCounts, setPlayCounts] = useState(() => {
    const saved = localStorage.getItem('playCounts');
    return saved ? JSON.parse(saved) : {}; // { songId: count }
  });
  const [durationFilter, setDurationFilter] = useState({ min: 0, max: Infinity });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('itemsPerPage');
    return saved ? parseInt(saved) : 50;
  });
  const [displayedSongs, setDisplayedSongs] = useState([]);
  const [displayedSongsSourceView, setDisplayedSongsSourceView] = useState(null);
  
  // Advanced filters
  const [hiddenArtists, setHiddenArtists] = useState(() => {
    const saved = localStorage.getItem('hiddenArtists');
    return saved ? JSON.parse(saved) : [];
  });
  const [nameFilter, setNameFilter] = useState(() => {
    const saved = localStorage.getItem('nameFilter');
    return saved || '';
  });
  const [nameFilterMode, setNameFilterMode] = useState(() => {
    const saved = localStorage.getItem('nameFilterMode');
    return saved || 'contains'; // 'contains', 'startswith', 'endswith', 'exact'
  });
  const [scanAllMaps, setScanAllMaps] = useState(() => {
    const saved = localStorage.getItem('scanAllMaps');
    return saved ? JSON.parse(saved) : false; // false = scan only with beatmapId
  });
  const [dedupeTitlesEnabled, setDedupeTitlesEnabled] = useState(() => {
    const saved = localStorage.getItem('dedupeTitlesEnabled');
    return saved ? JSON.parse(saved) : true; // default ON to match current behavior
  });

  // Use ref to prevent duplicate initialization
  const initRef = useRef(false);
  const autoSyncDoneRef = useRef(false); // Track if auto-sync has been done

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
          if (Array.isArray(data.hiddenArtists)) setHiddenArtists(data.hiddenArtists);
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
        }
        
        // Load songs cache
        const cached = await window.electronAPI.getSongsCache();
        if (cached) {
          setSongsCache(cached);
          // If we have cached songs for the current folder path, load them temporarily
          if (data?.osuFolderPath && cached[data.osuFolderPath]) {
            setSongs(cached[data.osuFolderPath].songs);
            setSongDurations(cached[data.osuFolderPath].durations);
            
            // Auto-rescan to sync with actual folder (incremental scan) - only on app startup
            // This will add new songs and remove deleted ones
            // Skip if auto-sync was already done (prevents duplicate scans)
            if (!autoSyncDoneRef.current) {
              autoSyncDoneRef.current = true;
              setTimeout(async () => {
                console.log('[App] Auto-syncing songs with folder on startup...');
                const result = await window.electronAPI.scanOsuFolder(
                  data.osuFolderPath,
                  false,
                  effectiveScanAllMaps
                );
                if (result.success && result.songs) {
                  setSongs(result.songs);
                  
                  // Update durations
                  const durations = {};
                  result.songs.forEach(song => {
                    if (song.duration) {
                      durations[song.id] = song.duration;
                    }
                  });
                  setSongDurations(durations);
                  
                  // Update cache
                  const newCache = {
                    ...cached,
                    [data.osuFolderPath]: {
                      songs: result.songs,
                      durations: durations
                    }
                  };
                  setSongsCache(newCache);
                  if (window.electronAPI?.saveSongsCache) {
                    window.electronAPI.saveSongsCache(newCache);
                  }
                  
                  // Log stats if available
                  if (result.stats) {
                    console.log(`[App] Sync complete - ${result.stats.new} new, ${result.stats.deleted} deleted, ${result.stats.reused} unchanged`);
                  }
                }
              }, 500);
            }
            
            // Restore last played song if available (when loading from cache)
            if (data.lastPlayedSong) {
              const restoredSong = cached[data.osuFolderPath].songs.find(s => s.id === data.lastPlayedSong.id);
              if (restoredSong) {
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
      setUserDataLoaded(true);
    })();
  }, []);

  // Check if this is first run (no folder selected)
  const isFirstRun = userDataLoaded && !osuFolderPath;

  // Update CSS variable when accentColor changes
  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty('--accent-color', accentColor);
      localStorage.setItem('accentColor', accentColor);
      
      // Calculate and set accent color variants
      const accentHover = adjustBrightness(accentColor, 120);
      const accentDark = adjustBrightness(accentColor, 80);
      document.documentElement.style.setProperty('--accent-color-hover', accentHover);
      document.documentElement.style.setProperty('--accent-color-dark', accentDark);

      // Set readable text color for accent backgrounds
      const accentContrast = getContrastColor(accentColor);
      document.documentElement.style.setProperty('--accent-contrast', accentContrast);
    }
  }, [accentColor]);

  // Save EQ bands to localStorage
  useEffect(() => {
    if (eqBands) {
      localStorage.setItem('eqBands', JSON.stringify(eqBands));
    }
  }, [eqBands]);


  // Save ALL user data changes to cache anytime critical changes occur
  useEffect(() => {
    if (!userDataLoaded) return;
    if (window.electronAPI) {
      const userData = {
        volume, 
        autoplay, 
        shuffle, 
        repeat, 
        playlists, 
        osuFolderPath, 
        discordRpcEnabled, 
        widgetServerEnabled,
        // Persisted UI + filters
        minDurationValue,
        itemsPerPage,
        albumArtBlur,
        blurIntensity,
        accentColor,
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
          folderPath: currentSong.folderPath
        } : null,
        lastPlaybackState: {
          isPlaying: isPlaying,
          currentTime: currentTime,
          duration: duration
        },
        eqBands: eqBands
      };
      window.electronAPI.saveUserData(userData);
    }
  }, [userDataLoaded, volume, autoplay, shuffle, repeat, playlists, osuFolderPath, discordRpcEnabled, widgetServerEnabled, minDurationValue, itemsPerPage, albumArtBlur, blurIntensity, accentColor, hiddenArtists, nameFilter, nameFilterMode, scanAllMaps, dedupeTitlesEnabled, currentSong, isPlaying, currentTime, duration, eqBands]);

  // When song/state changes: update Discord Rich Presence if enabled
  useEffect(() => {
    if (!window.electronAPI) return;
    if (discordRpcEnabled && currentSong) {
      const songTitle = currentSong.title || 'Unknown Song';
      const songArtist = currentSong.artist || 'Unknown Artist';
      
      window.electronAPI.setDiscordRichPresence(true, {
        title: songTitle,
        artist: songArtist,
        album: currentSong.album || '',
        duration: currentSong.duration ?? duration,
        startTime: isPlaying ? Date.now() - Math.floor(currentTime * 1000) : undefined,
        imageFile: currentSong.imageFile || null,
        beatmapSetId: currentSong.beatmapSetId || null,
        beatmapId: currentSong.beatmapId || null
      });
    } else {
      window.electronAPI.setDiscordRichPresence(false);
    }
  }, [discordRpcEnabled, currentSong, isPlaying, currentTime, duration]);

  // Update widget with now playing info
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.widgetUpdateNowPlaying) return;
    
    if (currentSong && isPlaying) {
      window.electronAPI.widgetUpdateNowPlaying({
        title: currentSong.title || 'Unknown Song',
        artist: currentSong.artist || 'Unknown Artist',
        album: currentSong.album || '',
        currentTime: currentTime,
        duration: duration,
        imageFile: currentSong.imageFile || null
      });
    } else if (currentSong && !isPlaying) {
      // Send paused state with current time
      window.electronAPI.widgetUpdateNowPlaying({
        title: currentSong.title || 'Unknown Song',
        artist: currentSong.artist || 'Unknown Artist',
        album: currentSong.album || '',
        currentTime: currentTime,
        duration: duration,
        paused: true,
        imageFile: currentSong.imageFile || null
      });
    } else {
      // No song playing
      window.electronAPI.widgetUpdateNowPlaying(null);
    }
  }, [currentSong, isPlaying, currentTime, duration]);

  // Load settings and playlists on mount (fallback to localStorage if Electron data not loaded)
  useEffect(() => {
    // Only use localStorage if Electron API hasn't loaded data yet
    // The Electron API loading happens in the other useEffect above
    // This is just a fallback for when Electron isn't available
    if (!window.electronAPI) {
      const savedVolume = localStorage.getItem('volume');
      const savedAutoplay = localStorage.getItem('autoplay');
      const savedShuffle = localStorage.getItem('shuffle');
      const savedRepeat = localStorage.getItem('repeat');
      
      if (savedVolume !== null) setVolume(parseFloat(savedVolume));
      if (savedAutoplay !== null) setAutoplay(savedAutoplay === 'true');
      if (savedShuffle !== null) setShuffle(savedShuffle === 'true');
      if (savedRepeat !== null) setRepeat(savedRepeat === 'true');
    }

    // Load playlists (no longer loaded from Electron, only localStorage)
    const savedPlaylists = localStorage.getItem('playlists');
    if (savedPlaylists) {
      try {
        setPlaylists(JSON.parse(savedPlaylists));
      } catch (e) {
        console.error('Error loading playlists:', e);
      }
    }

    // Note: Removed loadSongs call here to prevent duplicate scanning
    // Songs are loaded and auto-synced in the first useEffect with initRef guard
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('autoplay', autoplay.toString());
  }, [autoplay]);

  useEffect(() => {
    localStorage.setItem('shuffle', shuffle.toString());
  }, [shuffle]);

  useEffect(() => {
    localStorage.setItem('repeat', repeat.toString());
  }, [repeat]);

  // Persist album art blur setting
  useEffect(() => {
    localStorage.setItem('albumArtBlur', JSON.stringify(albumArtBlur));
  }, [albumArtBlur]);

  // Persist blur intensity setting
  useEffect(() => {
    localStorage.setItem('blurIntensity', blurIntensity.toString());
  }, [blurIntensity]);

  // Save playlists when they change
  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Track recently played songs
  useEffect(() => {
    if (currentSong && isPlaying) {
      const existingIndex = recentlyPlayed.findIndex(item => item.id === currentSong.id);
      let newRecentlyPlayed;
      
      if (existingIndex !== -1) {
        // Move to top if already exists
        newRecentlyPlayed = [
          { ...currentSong, playedAt: Date.now() },
          ...recentlyPlayed.filter(item => item.id !== currentSong.id)
        ];
      } else {
        // Add to top
        newRecentlyPlayed = [
          { ...currentSong, playedAt: Date.now() },
          ...recentlyPlayed
        ].slice(0, 50); // Keep last 50 songs
      }
      
      setRecentlyPlayed(newRecentlyPlayed);
      localStorage.setItem('recentlyPlayed', JSON.stringify(newRecentlyPlayed));
    }
  }, [currentSong, isPlaying]);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Persist ratings
  useEffect(() => {
    localStorage.setItem('ratings', JSON.stringify(ratings));
  }, [ratings]);

  // Track play counts when song finishes or plays for > 30 seconds
  const playCountTrackedRef = useRef(new Set());
  useEffect(() => {
    if (currentSong && isPlaying && duration > 30) {
      // Track after 30 seconds or when song ends
      const threshold = Math.min(30, duration * 0.5); // 30s or 50% of song
      if (currentTime > threshold && !playCountTrackedRef.current.has(currentSong.id)) {
        playCountTrackedRef.current.add(currentSong.id);
        setPlayCounts(prev => {
          const newCounts = { ...prev };
          newCounts[currentSong.id] = (newCounts[currentSong.id] || 0) + 1;
          localStorage.setItem('playCounts', JSON.stringify(newCounts));
          return newCounts;
        });
      }
    }
    // Reset tracking when song changes
    if (currentSong && currentTime < 5) {
      playCountTrackedRef.current.delete(currentSong.id);
    }
  }, [currentSong, isPlaying, currentTime, duration]);

  // Persist itemsPerPage to localStorage
  useEffect(() => {
    localStorage.setItem('itemsPerPage', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('hiddenArtists', JSON.stringify(hiddenArtists));
  }, [hiddenArtists]);

  useEffect(() => {
    localStorage.setItem('nameFilter', nameFilter);
  }, [nameFilter]);

  useEffect(() => {
    localStorage.setItem('nameFilterMode', nameFilterMode);
  }, [nameFilterMode]);

  useEffect(() => {
    localStorage.setItem('scanAllMaps', JSON.stringify(scanAllMaps));
  }, [scanAllMaps]);

  useEffect(() => {
    localStorage.setItem('dedupeTitlesEnabled', JSON.stringify(dedupeTitlesEnabled));
  }, [dedupeTitlesEnabled]);

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

  // If the currently playing song is no longer in the currently displayed list
  // (e.g. due to filters hiding it), stop playback and clear it as well
  useEffect(() => {
    if (!currentSong) return;
    if (currentView !== 'songs') return;
    if (displayedSongsSourceView !== 'songs') return;
    if (!displayedSongs || displayedSongs.length === 0) return;
    const visible = displayedSongs.some(song => song.id === currentSong.id);
    if (!visible) {
      setIsPlaying(false);
      setCurrentSong(null);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [displayedSongs, currentSong, currentView, displayedSongsSourceView]);

  // Handler to clear songs cache
  const clearSongsCache = async (overrideScanAllMaps = null) => {
    if (!osuFolderPath) return;
    const scanFlag = overrideScanAllMaps === null ? scanAllMaps : overrideScanAllMaps;
  
    console.log('[Cache] Clearing songs cache...');
    setLoading(true);
    setSongs([]);
    setSongsCache({});
    setSongDurations({});
    setLoadingProgress({ current: 0, total: 0 });

    // Remove old listener first to prevent duplicates
    if (window.electronAPI.removeScanProgressListener) {
      window.electronAPI.removeScanProgressListener();
    }

    // ✅ Reattach listener
    if (window.electronAPI.onScanProgress) {
      window.electronAPI.onScanProgress((progress) => {
        setLoadingProgress(progress);
      });
    }
  
    try {
      // ✅ clear cache file
      if (window.electronAPI?.saveSongsCache) {
        await window.electronAPI.saveSongsCache({});
      }
  
      // small delay so UI updates before rescanning
      await new Promise(res => setTimeout(res, 200));
      const result = await window.electronAPI.scanOsuFolder(osuFolderPath, true, scanFlag);
  
      if (result?.success) {
        setSongs(result.songs);
      } else {
        console.error('[Cache] Rescan failed:', result?.error);
      }
    } catch (err) {
      console.error('[Cache] Error while clearing/rescanning:', err);
    } finally {
      setLoading(false);
    }
  };   

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
        'eqBands','albumArtBlur','blurIntensity','accentColor','recentlyPlayed','favorites','ratings','playCounts','itemsPerPage','sortBy','sortDuration','searchHistory',
        'hiddenArtists','nameFilter','nameFilterMode','scanAllMaps','dedupeTitlesEnabled'
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
      setRecentlyPlayed([]);
      setFavorites({});
      setRatings({});
      setPlayCounts({});
      setDurationFilter({ min: 0, max: Infinity });
      setMinDurationValue(60);
      setItemsPerPage(50);
      setHiddenArtists([]);
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
          hiddenArtists: [],
          nameFilter: '',
          nameFilterMode: 'contains',
          scanAllMaps: false,
          dedupeTitlesEnabled: true,
          lastPlayedSong: null,
          lastPlaybackState: { isPlaying: false, currentTime: 0, duration: 0 },
          eqBands: DEFAULT_EQ_BANDS
        });
      }
    } catch (err) {
      console.error('[Reset] Failed to reset app to defaults:', err);
    }
  };

  const loadSongs = async (folderPath, forceScan = false) => {
    if (!window.electronAPI) return;
    
    // Check cache from backend (more reliable than state)
    const cacheKey = folderPath;
    let hasValidCache = false;
    
    // Skip cache check if forceScan is true (e.g., from first run)
    if (!forceScan) {
      // Check both in-memory cache and backend cache
      if (songsCache[cacheKey] && songsCache[cacheKey].songs && songsCache[cacheKey].songs.length > 0) {
        hasValidCache = true;
      } else {
        // Try to load from backend cache
        const backendCache = await window.electronAPI.getSongsCache();
        if (backendCache && backendCache[cacheKey] && backendCache[cacheKey].songs && backendCache[cacheKey].songs.length > 0) {
          hasValidCache = true;
          // Update in-memory cache
          setSongsCache(backendCache);
          setSongs(backendCache[cacheKey].songs);
          setSongDurations(backendCache[cacheKey].durations || {});
          setOsuFolderPath(folderPath);
          // Still do an incremental scan in background to sync changes
          // But don't show loading screen
        }
      }
      
      // If we have valid cache, do incremental scan in background
      if (hasValidCache && songsCache[cacheKey]) {
        setOsuFolderPath(folderPath);
        // Do incremental scan in background (no loading screen)
        setTimeout(async () => {
          const result = await window.electronAPI.scanOsuFolder(folderPath, false, scanAllMaps);
          if (result.success && result.songs) {
            setSongs(result.songs);
            const durations = {};
            result.songs.forEach(song => {
              if (song.duration) {
                durations[song.id] = song.duration;
              }
            });
            setSongDurations(durations);
            // Update cache
            setSongsCache(prev => ({
              ...prev,
              [cacheKey]: {
                songs: result.songs,
                durations: durations
              }
            }));
          }
        }, 100);
        return;
      }
    }
    
    // Only set loading if not already set (to avoid flickering)
    if (!loading) {
      setLoading(true);
    }
    setLoadingProgress({ current: 0, total: 0 });
    
    // Remove old listener first to prevent duplicates
    if (window.electronAPI.removeScanProgressListener) {
      window.electronAPI.removeScanProgressListener();
    }
    
    // Set up progress listener
    if (window.electronAPI.onScanProgress) {
      window.electronAPI.onScanProgress((progress) => {
        setLoadingProgress(progress);
      });
    }
    
    try {
      const result = await window.electronAPI.scanOsuFolder(folderPath, false, scanAllMaps);
      if (result.success && result.songs) {
        setSongs(result.songs);
        setOsuFolderPath(folderPath);
        localStorage.setItem('osuFolderPath', folderPath);
        
        // Initialize song durations from metadata if available
        const durations = {};
        result.songs.forEach(song => {
          if (song.duration) {
            durations[song.id] = song.duration;
          }
        });
        setSongDurations(durations);
        
        // Restore last played song if we have a pending restore
        if (window._pendingSongRestore) {
          const pending = window._pendingSongRestore;
          const restoredSong = result.songs.find(s => s.id === pending.song.id);
          if (restoredSong) {
            // Restore the song after a short delay to ensure everything is loaded
            setTimeout(() => {
              setCurrentSong(restoredSong);
              setCurrentTime(pending.playbackState.currentTime || 0);
              setDuration(pending.playbackState.duration || 0);
              // Don't auto-play, let user decide
              setIsPlaying(false);
              // Clear pending restore
              delete window._pendingSongRestore;
            }, 100);
          } else {
            delete window._pendingSongRestore;
          }
        }
        
        // Only save cache if we actually scanned (not from cache)
        if (!result.fromCache) {
          // Cache the results
          setSongsCache(prev => {
            const newCache = {
              ...prev,
              [cacheKey]: {
                songs: result.songs,
                durations: durations
              }
            };
            // Save cache to disk
            if (window.electronAPI?.saveSongsCache) {
              window.electronAPI.saveSongsCache(newCache).catch(err => {
                console.error('Error saving songs cache:', err);
              });
            }
            return newCache;
          });
        } else {
          // If from cache, just update the in-memory cache without saving
          setSongsCache(prev => ({
            ...prev,
            [cacheKey]: {
              songs: result.songs,
              durations: durations
            }
          }));
        }
      }
    } finally {
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
      // Clean up listener
      if (window.electronAPI.removeScanProgressListener) {
        window.electronAPI.removeScanProgressListener();
      }
    }
  };

  const selectFolder = async () => {
    if (!window.electronAPI) {
      alert('Electron API not available. Please run this app in Electron.');
      return;
    }
  
    setLoading(true);
    const folderPath = await window.electronAPI.selectOsuFolder();
  
    // ✅ If user canceled folder dialog, stop
    if (!folderPath) {
      setLoading(false);
      return;
    }
  
    // ✅ If folder is same as previous, don't rescan
    if (folderPath === osuFolderPath) {
      console.log(`[Songs] Skipping rescan — same folder selected: ${folderPath}`);
      setLoading(false);
      return;
    }
  
    // ✅ Only rescan if it's a different path
    await loadSongs(folderPath);
  };  

  const removeFolder = () => {
    setOsuFolderPath(null);
    setSongs([]);
    setSongDurations({});
    localStorage.removeItem('osuFolderPath');
    // Clear cache for this folder
    if (osuFolderPath) {
      setSongsCache(prev => {
        const newCache = { ...prev };
        delete newCache[osuFolderPath];
        return newCache;
      });
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

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
      if (shuffle && !repeat && shuffleOrder.length > 0) {
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
      } else if (!repeat) {
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
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        // Check if song already exists
        if (!playlist.songs.find(s => s.id === song.id)) {
          return { ...playlist, songs: [...playlist.songs, song] };
        }
      }
      return playlist;
    }));
  };

  const removeSongFromPlaylist = (playlistId, songId) => {
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        return { ...playlist, songs: playlist.songs.filter(s => s.id !== songId) };
      }
      return playlist;
    }));
  };

  const deletePlaylist = (playlistId) => {
    // Using window.confirm as it's supported in Electron
    if (window.confirm && window.confirm('Are you sure you want to delete this playlist?')) {
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      if (selectedPlaylistId === playlistId) {
        setSelectedPlaylistId(null);
        setCurrentView('songs');
      }
    }
  };

  // Export all user data as JSON
  const handleExportData = () => {
    const exportData = {
      playlists,
      favorites,
      ratings,
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
        if (importData.ratings) setRatings(importData.ratings);
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
          if (s.minDurationValue !== undefined) setMinDurationValue(s.minDurationValue);
          if (s.itemsPerPage !== undefined) setItemsPerPage(s.itemsPerPage);
          if (s.eqBands !== undefined) setEqBands(normalizeEqBands(s.eqBands));
          if (Array.isArray(s.hiddenArtists)) setHiddenArtists(s.hiddenArtists);
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
    
    const seenTitles = new Set();
  
    return songsToReturn.filter(song => {
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
      // Back-compat: "term" uses current selected mode.
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

      if (dedupeTitlesEnabled) {
        const normalizedTitle = (song.title || '').toLowerCase().trim();
        if (normalizedTitle && seenTitles.has(normalizedTitle)) return false;
        if (normalizedTitle) seenTitles.add(normalizedTitle);
      }

      return true;
    });
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
          
          setLoading(true);
          setLoadingProgress({ current: 0, total: 0 });
          
          // Set up progress listener
          if (window.electronAPI.removeScanProgressListener) {
            window.electronAPI.removeScanProgressListener();
          }
          if (window.electronAPI.onScanProgress) {
            window.electronAPI.onScanProgress((progress) => {
              setLoadingProgress(progress);
            });
          }
          
          const folderPath = await window.electronAPI.selectOsuFolder();
          
          if (!folderPath) {
            setLoading(false);
            return;
          }
          
          await loadSongs(folderPath, true); // Force scan on first run
        }}
      />
    );
  }

  return (
    <Router>
      {(!userDataLoaded || loading) && <LoadingScreen loadingProgress={loadingProgress} />}
      <div className="app" style={{ opacity: userDataLoaded && !loading ? 1 : 0, transition: 'opacity 0.5s ease-in' }}>
        {/* Blurred Album Art Background - covers entire viewport */}
        {albumArtBlur && currentSong?.imageFile && (
          <div 
            key={currentSong.id}
            className="app-blur-background"
            style={{
              backgroundImage: `url(osu://${encodeURIComponent(currentSong.imageFile)})`,
              filter: `blur(${blurIntensity}px) saturate(130%)`
            }}
          />
        )}
        <TitleBar />
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
          />
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
        />
      </div>
    </Router>
  );
}

export default App;

