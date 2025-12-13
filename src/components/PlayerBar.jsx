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
  Plus
} from 'lucide-react';
import PlaylistMenu from './PlaylistMenu';
import './PlayerBar.css';

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
  onAddToPlaylist
}) => {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const playlistButtonRef = useRef(null);
  const playerMenuContainerRef = useRef(null);

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

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onDurationChange, onNext, repeat, autoplay, onPlayPause]);

  // Track the last song to detect song changes vs play/pause
  const lastSongRef = useRef(null);

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
        audio.currentTime = 0;
        
        audio.src = `osu://${encodeURIComponent(currentSong.audioFile)}`;
        audio.load();
        
        // Wait for audio to be ready before playing (fixes double-click bug)
        const handleCanPlay = () => {
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
  }, [currentSong]);

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

  const handleVolumeSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onVolumeChange(percentage);
    setIsMuted(false);
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
            <img 
              src={`osu://${encodeURIComponent(currentSong.imageFile)}`} 
              alt={currentSong.title}
              className="player-bar-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          <div className="player-bar-song-info">
            <div className="player-bar-song-title">{currentSong.title}</div>
            <div className="player-bar-song-artist">{currentSong.artist}</div>
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
            <div className="progress-bar" onClick={handleSeek}>
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
          <div className="volume-control">
            <button 
              className="control-button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="volume-bar" onClick={handleVolumeSeek}>
              <div 
                className="volume-bar-fill" 
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              >
                <div className="volume-bar-handle" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;

