import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Shuffle,
  Repeat,
  RotateCw,
  Plus,
  LucideFileVolume2,
  Gauge
} from 'lucide-react';
import PlaylistMenu from './PlaylistMenu';
import './PlayerBar.css';
import useAudioEqualizer from './useAudioEqualizer';
import { DEFAULT_EQ_BANDS } from './eqConstants';

const PlayerBar = ({
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onTimeUpdate,
  onDurationChange,
  volume,
  onVolumeChange,
  autoplay,
  onAutoplayChange,
  shuffle,
  onShuffleChange,
  repeat,
  onRepeatChange,
  playlists,
  onAddToPlaylist,
  eqBands: eqBandsProp,
  onEqBandsChange,
  showEQModal,
  onOpenEQModal
}) => {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const playlistButtonRef = useRef(null);
  const playerMenuContainerRef = useRef(null);
  
  // Playback speed control (0.5x - 2.0x)
  const [playbackRate, setPlaybackRate] = useState(() => {
    const saved = localStorage.getItem('playbackRate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [showSpeedControl, setShowSpeedControl] = useState(false);

  // Many-band EQ with more presets
  // Use eqBands from props directly (no fallback needed)
  
  // Update parent when EQ bands change
  const handleEqBandsChange = (newBands) => {
    if (onEqBandsChange) {
      onEqBandsChange(newBands);
    }
  };

  // EQ Presets
  const EQ_PRESETS = [
    { 
      name: 'Default', 
      bands: DEFAULT_EQ_BANDS.map(b => ({ ...b, gain: 0 })) 
    },
    { 
      name: 'Bass Boost', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [6, 5, 3, 1, 0, 0, 0, 0, 0, 0][i] })) 
    },
    { 
      name: 'Treble Boost', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [0, 0, 0, 0, 0, 2, 4, 5, 6, 7][i] })) 
    },
    { 
      name: 'V-Shape', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [6, 4, 2, 0, -2, -3, -2, 2, 5, 6][i] })) 
    },
    { 
      name: 'Vocal Boost', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [0, 0, 1, 3, 5, 4, 2, 0, 0, 0][i] })) 
    },
    { 
      name: 'Rock', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [4, 3, 2, 1, -1, -1, 1, 3, 4, 5][i] })) 
    },
    { 
      name: 'Pop', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [2, 3, 2, 0, -1, -1, 2, 3, 4, 4][i] })) 
    },
    { 
      name: 'Classical', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [3, 2, 1, 0, 0, 0, 1, 2, 3, 4][i] })) 
    },
    { 
      name: 'Electronic', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [5, 4, 2, 0, -2, -2, 0, 3, 5, 6][i] })) 
    },
    { 
      name: 'Hip-Hop', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [6, 5, 3, 1, -1, -1, 1, 2, 3, 4][i] })) 
    },
    { 
      name: 'Jazz', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [2, 2, 1, 0, 0, 0, 2, 3, 3, 3][i] })) 
    },
    { 
      name: 'Acoustic', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [3, 2, 1, 0, 1, 2, 3, 3, 2, 2][i] })) 
    },
    { 
      name: 'Lounge', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [-2, -1, 0, 1, 2, 2, 1, 0, -1, -2][i] })) 
    },
    { 
      name: 'Metal', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [5, 4, 2, 0, -3, -3, 0, 3, 5, 6][i] })) 
    },
    { 
      name: 'R&B', 
      bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [4, 4, 2, 1, 0, 0, 1, 2, 3, 3][i] })) 
    },
  ];

  // Hookup WebAudio EQ
  const [setBandGain] = useAudioEqualizer({ audioRef, eqBands: eqBandsProp });

  // Force re-apply EQ when song changes to ensure filters are applied
  useEffect(() => {
    if (currentSong && eqBandsProp && audioRef.current) {
      // Small delay to ensure audio is ready
      const timer = setTimeout(() => {
        // Trigger filter update by setting each band gain
        eqBandsProp.forEach((band, idx) => {
          if (setBandGain) {
            setBandGain(idx, band.gain);
          }
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentSong?.id, eqBandsProp, setBandGain]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => onTimeUpdate(audio.currentTime);
    const updateDuration = () => onDurationChange(audio.duration);
    const handleEnded = () => {
      // Repeat mode: only repeat current song (shuffle and autoplay are disabled when repeat is on)
      if (repeat) {
        audio.currentTime = 0;
        audio.play();
      } else if (autoplay) {
        // Autoplay: go to next song (works with shuffle)
        onNext();
      } else {
        // No repeat, no autoplay: just stop playing
        onPlayPause();
      }
    };

    const handleTimeUpdate = () => {
      updateTime();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onDurationChange, onNext, repeat, autoplay, onPlayPause]);

  // Track the last song to detect song changes vs play/pause
  const lastSongRef = useRef(null);

  // When currentSong is cleared (e.g. reset app), stop audio completely
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentSong) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      lastSongRef.current = null;
    }
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSong) {
      // Only reset audio if this is a NEW song (not just play/pause toggle)
      const isNewSong = lastSongRef.current?.id !== currentSong.id;
      lastSongRef.current = currentSong;
      
      if (isNewSong) {
        // New song - reset audio
        audio.pause();
        
        audio.src = `osu://${encodeURIComponent(currentSong.audioFile)}`;
        // Don't call audio.load() as it breaks MediaElementSource connection
        // Browser will load automatically when src changes
        
        // Wait for audio to be ready before playing (fixes double-click bug)
        const handleCanPlay = () => {
          // Set the currentTime if it was restored from saved state
          if (currentTime > 0) {
            audio.currentTime = currentTime;
          }
          
          // If isPlaying is true (user wants to play), start playing
          // This fixes the double-click bug by waiting for audio to be ready
          if (isPlaying) {
            audio.play()
              .catch(err => console.error('Error playing audio:', err));
          }
        };
        
        audio.addEventListener('canplay', handleCanPlay, { once: true });
        
        return () => {
          audio.removeEventListener('canplay', handleCanPlay);
        };
      }
    }
  }, [currentSong, currentTime, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    // Only control play/pause if audio is ready (fixes double-click bug) 
    // Don't reset currentTime when pausing/playing same song
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
      if (isPlaying) {
        audio.play().catch(err => console.error('Error playing audio:', err));
      } else {
        audio.pause();
      }
    }
    // If not ready, the canplay event handler in the previous useEffect will handle it
  }, [isPlaying, currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set volume immediately - ensure it's set as soon as audio element exists
    const setVolumeValue = () => {
      audio.volume = isMuted ? 0 : volume;
    };
    
    // Set volume immediately
    setVolumeValue();
    
    // Also set on various events to ensure it persists
    audio.addEventListener('loadedmetadata', setVolumeValue);
    audio.addEventListener('loadstart', setVolumeValue);
    audio.addEventListener('canplay', setVolumeValue);
    
    return () => {
      audio.removeEventListener('loadedmetadata', setVolumeValue);
      audio.removeEventListener('loadstart', setVolumeValue);
      audio.removeEventListener('canplay', setVolumeValue);
    };
  }, [volume, isMuted]);
  
  // Ensure volume is synced with audio element - run on every render
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const targetVolume = isMuted ? 0 : (volume !== undefined ? volume : 1);
      // Always sync volume to ensure it matches state
      audio.volume = targetVolume;
    }
  });

  // Apply playback rate to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
      localStorage.setItem('playbackRate', playbackRate.toString());
    }
  }, [playbackRate]);

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    audio.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  const handleProgressMouseDown = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const progressBar = e.currentTarget;
    
    const handleMouseMove = (moveEvent) => {
      const rect = progressBar.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * duration;
      audio.currentTime = newTime;
      onTimeUpdate(newTime);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    handleMouseMove(e);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleVolumeSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onVolumeChange(percentage);
    setIsMuted(false);
  };

  const handleVolumeMouseDown = (e) => {
    const volumeBar = e.currentTarget;
    
    const handleMouseMove = (moveEvent) => {
      const rect = volumeBar.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      onVolumeChange(percentage);
      setIsMuted(false);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    handleMouseMove(e);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) {
    return (
      <div className="player-bar empty">
        <div className="player-bar-content">
          <p>Select a song to start playing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player-bar">
      <audio ref={audioRef} volume={volume} />

      <div className="player-bar-content">
        <div className="player-bar-left">
          {currentSong.imageFile ? (
            <>
              <img 
                src={`osu://${encodeURIComponent(currentSong.imageFile)}`} 
                alt={currentSong.title}
                className="player-bar-image"
                loading="eager"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const placeholder = e.target.nextElementSibling;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
                onLoad={(e) => {
                  e.target.style.display = 'block';
                  const placeholder = e.target.nextElementSibling;
                  if (placeholder) placeholder.style.display = 'none';
                }}
              />
              <div className="player-bar-image" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', background: '#282828' }}>
                <LucideFileVolume2 size={32} style={{ opacity: 0.5 }} />
              </div>
            </>
          ) : (
            <div className="player-bar-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#282828' }}>
              <LucideFileVolume2 size={32} style={{ opacity: 0.5 }} />
            </div>
          )}
          <div className="player-bar-song-info">
            <div 
              className="player-bar-song-title"
              onClick={(e) => {
                e.stopPropagation();
                if (currentSong.beatmapSetId) {
                  const beatmapUrl = currentSong.beatmapId 
                    ? `https://osu.ppy.sh/beatmapsets/${currentSong.beatmapSetId}#osu/${currentSong.beatmapId}`
                    : `https://osu.ppy.sh/beatmapsets/${currentSong.beatmapSetId}`;
                  if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(beatmapUrl);
                  } else {
                    window.open(beatmapUrl, '_blank');
                  }
                }
              }}
              title={currentSong.beatmapSetId ? 'Click to open beatmap on osu.ppy.sh' : ''}
            >
              {currentSong.title}
            </div>
            <div 
              className="player-bar-song-artist"
              onClick={(e) => {
                e.stopPropagation();
                if (currentSong.beatmapSetId) {
                  const beatmapUrl = currentSong.beatmapId 
                    ? `https://osu.ppy.sh/beatmapsets/${currentSong.beatmapSetId}#osu/${currentSong.beatmapId}`
                    : `https://osu.ppy.sh/beatmapsets/${currentSong.beatmapSetId}`;
                  if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(beatmapUrl);
                  } else {
                    window.open(beatmapUrl, '_blank');
                  }
                }
              }}
              title={currentSong.beatmapSetId ? 'Click to open beatmap on osu.ppy.sh' : ''}
            >
              {currentSong.artist}
            </div>
          </div>
          {onAddToPlaylist && playlists && playlists.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                ref={playlistButtonRef}
                className="player-bar-add-to-playlist"
                onClick={() => {
                  setShowPlaylistMenu(!showPlaylistMenu);
                  // Position menu to stay within viewport
                  setTimeout(() => {
                    if (playerMenuContainerRef.current && playlistButtonRef.current) {
                      const menuRect = playerMenuContainerRef.current.getBoundingClientRect();
                      const buttonRect = playlistButtonRef.current.getBoundingClientRect();
                      const viewportHeight = window.innerHeight;
                      
                      // If menu would go above viewport, show it below instead
                      if (buttonRect.top - menuRect.height < 0) {
                        playerMenuContainerRef.current.style.bottom = 'auto';
                        playerMenuContainerRef.current.style.top = '100%';
                        playerMenuContainerRef.current.style.marginTop = '8px';
                        playerMenuContainerRef.current.style.marginBottom = '0';
                      } else {
                        playerMenuContainerRef.current.style.top = 'auto';
                        playerMenuContainerRef.current.style.bottom = '100%';
                        playerMenuContainerRef.current.style.marginBottom = '8px';
                        playerMenuContainerRef.current.style.marginTop = '0';
                      }
                      
                      // Ensure menu doesn't go off right edge
                      const menuRight = buttonRect.right;
                      const viewportWidth = window.innerWidth;
                      if (menuRight > viewportWidth - 20) {
                        playerMenuContainerRef.current.style.right = '0';
                        playerMenuContainerRef.current.style.left = 'auto';
                      }
                    }
                  }, 0);
                }}
                title="Add to playlist"
              >
                <Plus size={18} />
              </button>
              {showPlaylistMenu && (
                <div 
                  ref={playerMenuContainerRef}
                  style={{ 
                    position: 'absolute', 
                    left: 0, 
                    bottom: '100%', 
                    marginBottom: '8px',
                    zIndex: 1000,
                    animation: 'fadeInSlide 0.22s cubic-bezier(.68,-0.55,.27,1.55)'
                  }}
                >
                  <PlaylistMenu
                    playlists={playlists}
                    onAddToPlaylist={(playlistId) => {
                      onAddToPlaylist(playlistId, currentSong);
                      setShowPlaylistMenu(false);
                    }}
                    onClose={() => setShowPlaylistMenu(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="player-bar-center">
          <div className="player-controls">
            <button 
              className="control-button"
              onClick={() => onShuffleChange(!shuffle)}
              title="Shuffle"
            >
              <Shuffle size={18} className={shuffle ? 'active' : ''} />
            </button>
            <button 
              className="control-button"
              onClick={onPrevious}
              title="Previous"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button 
              className="control-button play-pause"
              onClick={onPlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button 
              className="control-button"
              onClick={onNext}
              title="Next"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button 
              className="control-button"
              onClick={() => {
                if (shuffle) {
                  // If shuffle is on, disable it first, then enable repeat
                  onShuffleChange(false);
                  onRepeatChange(true);
                } else {
                  onRepeatChange(!repeat);
                }
              }}
              title={shuffle ? "Repeat (disable shuffle first)" : "Repeat"}
              disabled={shuffle}
            >
              <Repeat size={18} className={repeat ? 'active' : ''} style={{ opacity: shuffle ? 0.5 : 1 }} />
            </button>
            <button 
              className="control-button"
              onClick={() => onAutoplayChange(!autoplay)}
              title={autoplay ? 'Disable Autoplay' : 'Enable Autoplay'}
            >
              <RotateCw size={18} className={autoplay ? 'active' : ''} />
            </button>
          </div>
          <div className="player-progress">
            <span className="player-time">{formatTime(currentTime)}</span>
            <div className="progress-bar" onMouseDown={handleProgressMouseDown}>
              <div 
                className="progress-bar-fill" 
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="progress-bar-handle" />
              </div>
            </div>
            <span className="player-time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-bar-right">
          <div className="volume-control" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="control-button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="volume-bar" onMouseDown={handleVolumeMouseDown}>
              <div 
                className="volume-bar-fill" 
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              >
                <div className="volume-bar-handle" />
              </div>
            </div>
            <button
              className="control-button"
              style={{ padding: '2px 6px', fontSize: 12, height: 28 }}
              onClick={() => onOpenEQModal()}
              title="Equalizer Settings"
            >
              <LucideFileVolume2 size={20} fill="EQ" />
            </button>
            
            {/* Speed Control */}
            <div style={{ position: 'relative' }}>
              <button
                className="control-button"
                style={{ padding: '4px 8px', fontSize: 11, height: 28, minWidth: 50 }}
                onClick={() => setShowSpeedControl(!showSpeedControl)}
                title="Playback Speed"
              >
                <Gauge size={16} style={{ marginRight: 4 }} />
                {playbackRate.toFixed(2)}x
              </button>
              
              {showSpeedControl && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '100%',
                    marginBottom: 8,
                    background: 'rgba(30, 30, 35, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    minWidth: 200,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 1000,
                    animation: 'fadeInSlide 0.22s cubic-bezier(.68,-0.55,.27,1.55)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                    Playback Speed
                  </div>
                  
                  {/* Quick preset buttons */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(speed => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackRate(speed)}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          border: playbackRate === speed ? `1px solid var(--accent-color)` : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 6,
                          background: playbackRate === speed ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: playbackRate === speed ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.7)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontWeight: playbackRate === speed ? 600 : 400
                        }}
                        onMouseEnter={(e) => {
                          if (playbackRate !== speed) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (playbackRate !== speed) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                  
                  {/* Slider */}
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                      className="speed-range"
                      style={{
                        width: '100%',
                        height: 4,
                        borderRadius: 2,
                        outline: 'none',
                        appearance: 'none',
                        background: `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${((playbackRate - 0.5) / 1.5) * 100}%, rgba(255, 255, 255, 0.1) ${((playbackRate - 0.5) / 1.5) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                      <span>0.5x</span>
                      <span>2.0x</span>
                    </div>
                  </div>
                  
                  {/* Reset button */}
                  <button
                    onClick={() => setPlaybackRate(1.0)}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '6px',
                      fontSize: 11,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    Reset to Normal (1.0x)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;

