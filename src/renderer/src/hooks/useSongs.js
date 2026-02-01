import { useState, useCallback, useRef } from 'react';
import useLocalStorageState from './useLocalStorageState';

export default function useSongs({ scanAllMaps, onRestorePendingSong } = {}) {
  const [songs, setSongs] = useState([]);
  const [songsCache, setSongsCache] = useState({});
  const [songDurations, setSongDurations] = useState({});
  const [osuFolderPath, setOsuFolderPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // Persisted playback counts and recently played list
  const [playCounts, setPlayCounts] = useLocalStorageState('playCounts', {});
  const [recentlyPlayed, setRecentlyPlayed] = useLocalStorageState('recentlyPlayed', []);

  // Refs for tracking counting cooldowns within session
  const playCountTrackedRef = useRef(new Set());
  const lastPlayTsRef = useRef({});

  const clearScanProgressListener = useCallback(() => {
    if (window.electronAPI?.removeScanProgressListener) {
      try { window.electronAPI.removeScanProgressListener(); } catch (e) {}
    }
  }, []);

  // Notify playback progress to update play counts & recently played
  const notifyPlayback = useCallback(({ currentSong, isPlaying, currentTime, duration }) => {
    if (!currentSong || !currentSong.id || !duration || duration <= 0) {
      // reset tracking when no song or duration unknown
      if (!currentSong || currentTime < 5) {
        playCountTrackedRef.current.delete(currentSong?.id);
      }
      return;
    }

    const songId = currentSong.id;
    const now = Date.now();
    const cooldownMs = 30 * 1000;

    const incrementPlay = () => {
      const last = lastPlayTsRef.current[songId] || 0;
      if (now - last < cooldownMs) return;

      lastPlayTsRef.current[songId] = now;
      playCountTrackedRef.current.add(songId);

      // Update play counts persistently
      setPlayCounts(prev => {
        const newCounts = { ...prev };
        newCounts[songId] = (newCounts[songId] || 0) + 1;
        return newCounts;
      });

      // Update recently played (keep last 50)
      setRecentlyPlayed(prev => {
        const next = [{ ...currentSong, playedAt: now }, ...prev.filter(p => p.id !== songId)].slice(0, 50);
        return next;
      });

      // Dispatch event
      try { window.dispatchEvent(new CustomEvent('sosu:song-played', { detail: { songId, timestamp: now } })); } catch (e) {}
    };

    const threshold = duration >= 60 ? duration * 0.9 : duration * 0.5;

    if (currentTime >= threshold && !playCountTrackedRef.current.has(songId)) {
      incrementPlay();
      return;
    }

    if (duration > 0 && currentTime >= Math.max(duration - 0.5, 0) && !playCountTrackedRef.current.has(songId)) {
      incrementPlay();
      return;
    }

    if (currentTime < 5) {
      playCountTrackedRef.current.delete(songId);
    }
  }, [setPlayCounts, setRecentlyPlayed]);

  const _attachProgressListener = useCallback(() => {
    clearScanProgressListener();
    if (window.electronAPI?.onScanProgress) {
      window.electronAPI.onScanProgress((progress) => {
        setLoadingProgress(progress);
      });
    }
  }, [clearScanProgressListener]);

  const loadSongs = useCallback(async (folderPath, forceScan = false, showLoading = false) => {
    if (!window.electronAPI || !folderPath) return;

    const cacheKey = folderPath;
    let hasValidCache = false;

    if (!forceScan) {
      if (songsCache[cacheKey] && songsCache[cacheKey].songs && songsCache[cacheKey].songs.length > 0) {
        hasValidCache = true;
      } else {
        try {
          const backendCache = await window.electronAPI.getSongsCache();
          if (backendCache && backendCache[cacheKey] && backendCache[cacheKey].songs && backendCache[cacheKey].songs.length > 0) {
            hasValidCache = true;
            setSongsCache(backendCache);
            setSongs(backendCache[cacheKey].songs);
            setSongDurations(backendCache[cacheKey].durations || {});
            setOsuFolderPath(folderPath);
            // still do an incremental scan in background
          }
        } catch (e) {
          // ignore
        }
      }

      if (hasValidCache && songsCache[cacheKey]) {
        setOsuFolderPath(folderPath);
        setTimeout(async () => {
          try {
            // If caller requested to show loading during this incremental sync, enable it
            if (showLoading && !loading) setLoading(true);
            const result = await window.electronAPI.scanOsuFolder(folderPath, false, scanAllMaps);
            if (result?.success && result.songs) {
              setSongs(result.songs);
              const durations = {};
              result.songs.forEach(song => { if (song.duration) durations[song.id] = song.duration; });
              setSongDurations(durations);
              setSongsCache(prev => ({
                ...prev,
                [cacheKey]: { songs: result.songs, durations }
              }));
            }
          } catch (e) {
            console.error('[useSongs] background scan failed', e);
          } finally {
            if (showLoading) setLoading(false);
          }
        }, 100);
        return;
      }
    }

    if (showLoading && !loading) setLoading(true);
    if (!loading) setLoading(true);
    setLoadingProgress({ current: 0, total: 0 });

    _attachProgressListener();

    let result = null;
    try {
      result = await window.electronAPI.scanOsuFolder(folderPath, false, scanAllMaps);
      if (result?.success && result.songs) {
        setSongs(result.songs);
        setOsuFolderPath(folderPath);
        try { localStorage.setItem('osuFolderPath', folderPath); } catch (e) {}

        const durations = {};
        result.songs.forEach(song => { if (song.duration) durations[song.id] = song.duration; });
        setSongDurations(durations);

        // Restore pending song if available
        if (window._pendingSongRestore && typeof onRestorePendingSong === 'function') {
          const pending = window._pendingSongRestore;
          const restoredSong = result.songs.find(s => s.id === pending.song.id);
          if (restoredSong) {
            try {
              setTimeout(() => {
                onRestorePendingSong(restoredSong, pending.playbackState);
                delete window._pendingSongRestore;
              }, 100);
            } catch (e) { delete window._pendingSongRestore; }
          } else {
            delete window._pendingSongRestore;
          }
        }

        if (!result.fromCache) {
          setSongsCache(prev => {
            const newCache = {
              ...prev,
              [cacheKey]: { songs: result.songs, durations }
            };
            if (window.electronAPI?.saveSongsCache) {
              window.electronAPI.saveSongsCache(newCache).catch(err => console.error('Error saving songs cache:', err));
            }
            return newCache;
          });
        } else {
          setSongsCache(prev => ({ ...prev, [cacheKey]: { songs: result.songs, durations } }));
        }
      }
    } catch (err) {
      console.error('[useSongs] scan failed', err);
    } finally {
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
      clearScanProgressListener();
    }

    // Return scan result for caller inspection
    return result;
  }, [scanAllMaps, songsCache, _attachProgressListener, loading, clearScanProgressListener, onRestorePendingSong]);

  const selectFolder = useCallback(async () => {
    if (!window.electronAPI) {
      alert('Electron API not available. Please run this app in Electron.');
      return null;
    }

    setLoading(true);
    try {
      const folderPath = await window.electronAPI.selectOsuFolder();
      if (!folderPath) {
        setLoading(false);
        return null;
      }
      // if same folder, no need to rescan
      if (folderPath === osuFolderPath) {
        setLoading(false);
        return folderPath;
      }

      await loadSongs(folderPath);
      return folderPath;
    } finally {
      setLoading(false);
    }
  }, [osuFolderPath, loadSongs]);

  const clearSongsCache = useCallback(async (overrideScanAllMaps = null) => {
    if (!osuFolderPath) return;
    const scanFlag = overrideScanAllMaps === null ? scanAllMaps : overrideScanAllMaps;

    setLoading(true);
    setSongs([]);
    setSongsCache({});
    setSongDurations({});
    setLoadingProgress({ current: 0, total: 0 });

    clearScanProgressListener();
    _attachProgressListener();

    try {
      if (window.electronAPI?.saveSongsCache) {
        await window.electronAPI.saveSongsCache({});
      }
      await new Promise(res => setTimeout(res, 200));
      const result = await window.electronAPI.scanOsuFolder(osuFolderPath, true, scanFlag);
      if (result?.success) {
        setSongs(result.songs);
      } else {
        console.error('[useSongs] Rescan failed:', result?.error);
      }
    } catch (err) {
      console.error('[useSongs] Error while clearing/rescanning:', err);
    } finally {
      setLoading(false);
    }
  }, [osuFolderPath, scanAllMaps, clearScanProgressListener, _attachProgressListener]);

  const removeFolder = useCallback(() => {
    setOsuFolderPath(null);
    setSongs([]);
    setSongDurations({});
    try { localStorage.removeItem('osuFolderPath'); } catch (e) {}
    if (osuFolderPath) {
      setSongsCache(prev => {
        const newCache = { ...prev };
        delete newCache[osuFolderPath];
        return newCache;
      });
    }
  }, [osuFolderPath]);

  const clearPlayCounts = useCallback(() => setPlayCounts({}), [setPlayCounts]);
  const clearRecentlyPlayed = useCallback(() => setRecentlyPlayed([]), [setRecentlyPlayed]);

  return {
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
  };
}
