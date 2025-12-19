import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import PlayerBar from './components/PlayerBar';
import TitleBar from './components/TitleBar';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import SettingsModal from './components/SettingsModal';
import './App.css';

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
  const [songsCache, setSongsCache] = useState({});
  const [discordRpcEnabled, setDiscordRpcEnabled] = useState(false);
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // Load settings and playlists on mount using Electron cache if available
  useEffect(() => {
    (async () => {
      if (window.electronAPI) {
        // Load user data (settings)
        const data = await window.electronAPI.getUserData();
        if (data) {
          setVolume(data.volume ?? 1);
          setAutoplay(data.autoplay ?? false);
          setShuffle(data.shuffle ?? false);
          setRepeat(data.repeat ?? false);
          setPlaylists(data.playlists ?? []);
          setOsuFolderPath(data.osuFolderPath ?? null);
          setDiscordRpcEnabled(data.discordRpcEnabled ?? false);
        }
        
        // Load songs cache
        const cached = await window.electronAPI.getSongsCache();
        if (cached) {
          setSongsCache(cached);
          // If we have cached songs for the current folder path, load them
          if (data?.osuFolderPath && cached[data.osuFolderPath]) {
            setSongs(cached[data.osuFolderPath].songs);
            setSongDurations(cached[data.osuFolderPath].durations);
            
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

  // Save ALL user data changes to cache anytime critical changes occur
  useEffect(() => {
    if (!userDataLoaded) return;
    if (window.electronAPI) {
      const userData = {
        volume, autoplay, shuffle, repeat, playlists, osuFolderPath, discordRpcEnabled,
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
      window.electronAPI.saveUserData(userData);
    }
  }, [userDataLoaded, volume, autoplay, shuffle, repeat, playlists, osuFolderPath, discordRpcEnabled, currentSong, isPlaying, currentTime, duration]);

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

    // Load playlists
    const savedPlaylists = localStorage.getItem('playlists');
    if (savedPlaylists) {
      try {
        setPlaylists(JSON.parse(savedPlaylists));
      } catch (e) {
        console.error('Error loading playlists:', e);
      }
    }

    // Try to load saved folder path from localStorage
    const savedPath = localStorage.getItem('osuFolderPath');
    if (savedPath && window.electronAPI) {
      loadSongs(savedPath);
    }
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

  // Save playlists when they change
  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Handler to clear songs cache
  const clearSongsCache = async () => {
    if (!osuFolderPath) return;
  
    console.log('[Cache] Clearing songs cache...');
    setLoading(true);
    setSongs([]);
    setSongsCache({});
    setSongDurations({});
    setLoadingProgress({ current: 0, total: 0 });

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
      const result = await window.electronAPI.scanOsuFolder(osuFolderPath, true);
  
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

  const loadSongs = async (folderPath) => {
    if (!window.electronAPI) return;
    
    // Check cache first
    const cacheKey = folderPath;
    if (songsCache[cacheKey]) {
      setSongs(songsCache[cacheKey].songs);
      setSongDurations(songsCache[cacheKey].durations);
      setOsuFolderPath(folderPath);
      return;
    }
    
    setLoading(true);
    setLoadingProgress({ current: 0, total: 0 });
    
    // Set up progress listener
    if (window.electronAPI.onScanProgress) {
      window.electronAPI.onScanProgress((progress) => {
        setLoadingProgress(progress);
      });
    }
    
    try {
      const result = await window.electronAPI.scanOsuFolder(folderPath);
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
    const currentList = getCurrentSongs(); // ✅ use filtered list
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
    const currentList = getCurrentSongs(); // ✅ use filtered list
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
    let songsToReturn = currentView === 'songs' ? songs : playlists.find(p => p.id === selectedPlaylistId)?.songs ?? [];
    const seenTitles = new Set();
  
    return songsToReturn.filter(song => {
      const duration = songDurations?.[song.id] ?? song.duration;
  
      // ✅ Use user-defined minDurationValue instead of hardcoded 10
      if (duration && duration < minDurationValue) return false;
  
      const normalizedTitle = (song.title || '').toLowerCase().trim();
      if (normalizedTitle && seenTitles.has(normalizedTitle)) return false;
      if (normalizedTitle) seenTitles.add(normalizedTitle);
  
      return true;
    });
  };  
  

  return (
    <Router>
      <div className="app">
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
            onClearCache={clearSongsCache}
            minDurationValue={minDurationValue}
            setMinDurationValue={setMinDurationValue}
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
        />
      </div>
    </Router>
  );
}

export default App;

