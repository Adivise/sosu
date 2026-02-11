import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
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
import VUPanel from './VUPanel';

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
  onOpenEQModal,
  vuEnabled
}) => {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [menuPortalEl, setMenuPortalEl] = useState(null);
  const [playerMenuPos, setPlayerMenuPos] = useState({ x: -9999, y: -9999 });
  const [playerMenuReady, setPlayerMenuReady] = useState(false);
  const playlistButtonRef = useRef(null);
  const playerMenuRef = useRef(null);
  // legacy ref (kept for compatibility) - not used for absolute positioning anymore
  const playerMenuContainerRef = useRef(null);

  // Volume percent tooltip state
  const [showVolumePercent, setShowVolumePercent] = useState(false);
  const volumeHideTimeoutRef = useRef(null);

  
  // Playback speed control (0.5x - 2.0x)
  const [playbackRate, setPlaybackRate] = useState(() => {
    const saved = localStorage.getItem('playbackRate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [showSpeedControl, setShowSpeedControl] = useState(false);



  // Many-band EQ with more presets
  // Use eqBands from props directly (no fallback needed)
  
  // Portal root for playlist menu
  useEffect(() => {
    if (showPlaylistMenu) {
      const el = document.createElement('div');
      el.className = 'playerbar-menu-root';
      document.body.appendChild(el);
      setMenuPortalEl(el);
      return () => {
        if (el.parentNode) el.parentNode.removeChild(el);
        setMenuPortalEl(null);
      };
    }
    return undefined;
  }, [showPlaylistMenu]);

  // Measure and position the portal menu when it appears
  useEffect(() => {
    if (!showPlaylistMenu) {
      setPlayerMenuReady(false);
      setPlayerMenuPos({ x: -9999, y: -9999 });
      return;
    }

    const id = setTimeout(() => {
      const btn = playlistButtonRef.current;
      const menuEl = playerMenuRef.current;
      if (!btn || !menuEl) return;

      // Temporarily ensure menu is measurable
      menuEl.style.left = '0px';
      menuEl.style.top = '0px';
      menuEl.style.visibility = 'hidden';

      const btnRect = btn.getBoundingClientRect();
      const subRect = menuEl.getBoundingClientRect();
      const margin = 8;

      let x = Math.round(btnRect.right + 8);
      let y = Math.round(btnRect.top + Math.round((btnRect.height - subRect.height) / 2));

      if (x + subRect.width > window.innerWidth - margin) {
        x = Math.round(btnRect.left - subRect.width - 8);
      }
      if (y + subRect.height > window.innerHeight - margin) {
        y = Math.max(margin, Math.round(window.innerHeight - margin - subRect.height));
      }
      if (y < margin) y = margin;

      try {
        menuEl.style.left = `${x}px`;
        menuEl.style.top = `${y}px`;
        menuEl.style.visibility = 'visible';
        menuEl.style.opacity = '0.02';
        menuEl.style.pointerEvents = 'auto';
        menuEl.style.transform = 'translateX(-4px) scale(0.995)';
      } catch (e) {}

      setPlayerMenuPos({ x, y });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { menuEl.style.opacity = ''; menuEl.style.transform = ''; } catch(e) {}
        setPlayerMenuReady(true);
      }));
    }, 0);

    return () => clearTimeout(id);
  }, [showPlaylistMenu]);

  // Update parent when EQ bands change
  const handleEqBandsChange = (newBands) => {
    if (onEqBandsChange) {
      onEqBandsChange(newBands);
    }
  };
  // Hookup WebAudio EQ and request analyser setup for VU meter
  const [setBandGain] = useAudioEqualizer({
    audioRef,
    eqBands: eqBandsProp,
    onSetup: (filters, ctxInfo) => {
      // Expose context and source to analyser setup via event - PlayerBar will listen
      try {
        window.__sosu_lastAudioCtxInfo = ctxInfo;
        window.dispatchEvent(new CustomEvent('sosu:audio-eq-setup', { detail: ctxInfo }));
      } catch (e) {}
    }
  });

  // Mini VU waveform state/refs
  const analyserRefs = React.useRef({ left: null, right: null, mix: null, splitter: null, raf: null, ctx: null });
  const [leftLevel, setLeftLevel] = useState(0);
  const [rightLevel, setRightLevel] = useState(0);
  // small debug display for RMS (percentage 0-100)
  const [rmsDisplay, setRmsDisplay] = useState(0);
  const lastRmsRef = useRef({ val: 0, lastUpdate: 0 });


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

    // Set volume immediately - use a perceptual mapping (power curve) so low slider values are much quieter
    const mapVolume = (v) => Math.pow(Math.max(0, Math.min(1, v || 0)), 2);
    const setVolumeValue = () => {
      audio.volume = isMuted ? 0 : mapVolume(volume);
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
      const mapVolume = (v) => Math.pow(Math.max(0, Math.min(1, v || 0)), 2);
      const targetVolume = isMuted ? 0 : (volume !== undefined ? mapVolume(volume) : 1);
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

  // Cleanup any pending hide timeout on unmount
  useEffect(() => {
    return () => {
      try { clearTimeout(volumeHideTimeoutRef.current); } catch (e) {}
    };
  }, []);

  // Setup analyser nodes when useAudioEqualizer signals that AudioContext/source are ready
  useEffect(() => {
    const handle = (ev) => {
      try {
        if (!vuEnabled) {
          // If VU is disabled, ensure any existing analyser loops are stopped and disconnected
          try { if (analyserRefs.current.raf) cancelAnimationFrame(analyserRefs.current.raf); } catch(e) {}
          try { if (analyserRefs.current.left) analyserRefs.current.left.disconnect(); } catch(e) {}
          try { if (analyserRefs.current.right) analyserRefs.current.right.disconnect(); } catch(e) {}
          try { if (analyserRefs.current.splitter) analyserRefs.current.splitter.disconnect(); } catch(e) {}
          return;
        }

        const { context, source } = ev?.detail || {};
        console.debug && console.debug('[PlayerBar] received audio-eq-setup', { hasContext: !!context, hasSource: !!source });
        if (!context || !source) return;
        try { console.debug && console.debug('[PlayerBar] audio state', { ctxState: context.state, audioReady: audioRef.current?.readyState, audioPaused: audioRef.current?.paused, audioSrc: audioRef.current?.src }); } catch (e) {}

        // Clean previous
        try {
          if (analyserRefs.current.raf) cancelAnimationFrame(analyserRefs.current.raf);
        } catch (e) {}
        try {
          if (analyserRefs.current.left) analyserRefs.current.left.disconnect();
        } catch (e) {}
        try {
          if (analyserRefs.current.right) analyserRefs.current.right.disconnect();
        } catch (e) {}
        try {
          if (analyserRefs.current.splitter) analyserRefs.current.splitter.disconnect();
        } catch (e) {}

        // Create nodes
        const splitter = context.createChannelSplitter(2);
        // Ensure audio context is running
        try { if (context.state === 'suspended') { context.resume().catch(err => console.warn('[PlayerBar] resume ctx failed', err)); } } catch (e) { console.warn('[PlayerBar] ctx resume error', e); }        const analyserL = context.createAnalyser();
        const analyserR = context.createAnalyser();
        // A mix analyser that listens to the combined source (works for mono/stereo)
        const mixAnalyser = context.createAnalyser();

        // Prefer a higher FFT size for better frequency resolution and smoother visuals
        analyserL.fftSize = 2048;
        analyserR.fftSize = 2048;
        mixAnalyser.fftSize = 2048;

        // Slightly higher smoothing to avoid jitter while remaining responsive
        analyserL.smoothingTimeConstant = 0.12;
        analyserR.smoothingTimeConstant = 0.12;
        mixAnalyser.smoothingTimeConstant = 0.12;

        // Connect source -> splitter -> analysers (parallel to existing EQ chain)
        try { source.connect(splitter); } catch (e) { console.warn('[PlayerBar] source.connect(splitter) failed', e); }
        try { splitter.connect(analyserL, 0); } catch (e) { console.warn('[PlayerBar] splitter.connect L failed', e); }
        try { splitter.connect(analyserR, 1); } catch (e) { console.warn('[PlayerBar] splitter.connect R failed', e); }
        // Also connect source directly to mix analyser (to get a combined waveform)
        try { source.connect(mixAnalyser); } catch (e) { console.warn('[PlayerBar] source.connect(mixAnalyser) failed', e); }

        analyserRefs.current = { left: analyserL, right: analyserR, mix: mixAnalyser, splitter, raf: null, ctx: context };

        // Notify global listeners (Visualizer components) that analyser is ready
        try {
          try { window.__sosu_lastAnalyser = mixAnalyser; } catch (e) {}
          window.dispatchEvent(new CustomEvent('sosu:analyser-ready', { detail: { analyser: mixAnalyser } }));
        } catch (e) {}

        const bufL = new Uint8Array(analyserL.fftSize);
        const bufR = new Uint8Array(analyserR.fftSize);
        const bufMix = new Uint8Array(analyserRefs.current.mix.fftSize);

        let lastLogAt = 0;
        const sample = () => {
          try {
            // Use the mix analyser for a reliable mono waveform/RMS (works with mono or stereo sources)
            let rmsL = 0, rmsR = 0;
            try {
              const mix = analyserRefs.current.mix;
              if (mix) {
                mix.getByteTimeDomainData(bufMix);
                let sum = 0;
                let min = 255, max = 0;
                for (let i = 0; i < bufMix.length; i++) {
                  const vraw = bufMix[i];
                  if (vraw < min) min = vraw;
                  if (vraw > max) max = vraw;
                  const v = (vraw - 128) / 128;
                  sum += v * v;
                }
                const rms = Math.sqrt(sum / bufMix.length);
                rmsL = rmsR = rms;

                // Debug: occasionally log buffer range when it's all flat
                const now = Date.now();
                if ((max - min) <= 2 && now - lastLogAt > 3000) {
                  console.debug && console.debug('[PlayerBar] mix analyser flat sample', { min, max, rms, paused: audioRef.current?.paused, ready: audioRef.current?.readyState });
                  lastLogAt = now;
                }
              } else {
                analyserL.getByteTimeDomainData(bufL);
                analyserR.getByteTimeDomainData(bufR);

                // compute RMS normalized 0..1
                let sumL = 0, sumR = 0;
                for (let i = 0; i < bufL.length; i++) {
                  const v = (bufL[i] - 128) / 128;
                  sumL += v * v;
                }
                for (let i = 0; i < bufR.length; i++) {
                  const v = (bufR[i] - 128) / 128;
                  sumR += v * v;
                }
                rmsL = Math.sqrt(sumL / bufL.length);
                rmsR = Math.sqrt(sumR / bufR.length);
                // Fallback for mono sources: mirror left into right if right is silent
                if (rmsR < 0.0005 && rmsL > 0) rmsR = rmsL;
              }
            } catch (e) {}

            // Smoothly update state
            setLeftLevel(prev => prev * 0.75 + rmsL * 0.25);
            setRightLevel(prev => prev * 0.75 + rmsR * 0.25);

            // Update simple display infrequently to avoid re-renders
            try {
              const now = Date.now();
              lastRmsRef.val = Math.max(rmsL, rmsR);
              if (now - lastRmsRef.lastUpdate > 250) {
                try { setRmsDisplay(Math.round(lastRmsRef.val * 100)); } catch (e) {}
                lastRmsRef.lastUpdate = now;
              }
            } catch (e) {}

            // Log once if levels stay zero for a while to help debugging
            const now2 = Date.now();
            if (now2 - lastLogAt > 3000) {
              console.debug && console.debug('[PlayerBar] VU sample', { left: rmsL, right: rmsR });
              lastLogAt = now2;
            }
          } catch (e) { console.warn('[PlayerBar] VU sample failed', e); }
          analyserRefs.current.raf = requestAnimationFrame(sample);
        };

        analyserRefs.current.raf = requestAnimationFrame(sample);
      } catch (e) { console.warn('[PlayerBar] analyser setup failed', e); }
    };

    window.addEventListener('sosu:audio-eq-setup', handle);
    return () => {
      window.removeEventListener('sosu:audio-eq-setup', handle);
      try { if (analyserRefs.current.raf) cancelAnimationFrame(analyserRefs.current.raf); } catch (e) {}
      try { if (analyserRefs.current.left) analyserRefs.current.left.disconnect(); } catch (e) {}
      try { if (analyserRefs.current.right) analyserRefs.current.right.disconnect(); } catch (e) {}
      try { if (analyserRefs.current.splitter) analyserRefs.current.splitter.disconnect(); } catch (e) {}
    };
  }, [vuEnabled]);

  // If VU gets enabled after audio setup, re-emit the last setup event
  useEffect(() => {
    if (!vuEnabled) return;
    try {
      const ctxInfo = window.__sosu_lastAudioCtxInfo;
      if (ctxInfo && ctxInfo.context && ctxInfo.source) {
        window.dispatchEvent(new CustomEvent('sosu:audio-eq-setup', { detail: ctxInfo }));
      }
    } catch (e) {}
  }, [vuEnabled]);

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

    // Show percentage briefly when user clicks on the bar
    try { clearTimeout(volumeHideTimeoutRef.current); } catch (e) {}
    setShowVolumePercent(true);
    volumeHideTimeoutRef.current = setTimeout(() => setShowVolumePercent(false), 800);
  };

  const handleVolumeMouseDown = (e) => {
    const volumeBar = e.currentTarget;
    
    const handleMouseMove = (moveEvent) => {
      const rect = volumeBar.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      onVolumeChange(percentage);
      setIsMuted(false);

      // keep percent visible while dragging
      try { clearTimeout(volumeHideTimeoutRef.current); } catch (e) {}
      setShowVolumePercent(true);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // hide a moment after release
      try { clearTimeout(volumeHideTimeoutRef.current); } catch (e) {}
      volumeHideTimeoutRef.current = setTimeout(() => setShowVolumePercent(false), 800);
    };

    // show immediately when starting drag
    try { clearTimeout(volumeHideTimeoutRef.current); } catch (e) {}
    setShowVolumePercent(true);

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
      <audio ref={audioRef} volume={isMuted ? 0 : Math.pow(Math.max(0, Math.min(1, volume || 0)), 2)} />

      {/* Stretch VU across the top edge of the player bar */}
      {vuEnabled && (
        <div className="player-bar-top-stretch">
          <VUPanel defaultHeight={30} />
        </div>
      )}

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
                // Jump to this song in the library list
                if (currentSong?.id) {
                  window.dispatchEvent(new CustomEvent('sosu:jump-to-song', { detail: { songId: currentSong.id } }));
                }
              }}
              title="Jump to this song in Library"
            >
              {currentSong.title}
            </div>
            <div 
              className="player-bar-song-artist"
              onClick={(e) => {
                e.stopPropagation();
                // Search by this artist in the main search bar
                if (currentSong?.artist) {
                  window.dispatchEvent(new CustomEvent('sosu:set-search-query', { detail: { query: currentSong.artist } }));
                }
              }}
              title="Search by this artist"
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
                  // Toggle portal-based menu
                  setPlayerMenuReady(false);
                  setPlayerMenuPos({ x: -9999, y: -9999 });
                  setShowPlaylistMenu(prev => !prev);
                }}
                title="Add to playlist"
              >
                <Plus size={18} />
              </button>

              {/* Old inline menu removed; using portal below for consistent visuals */}

              {menuPortalEl && showPlaylistMenu && ReactDOM.createPortal(
                <div
                  ref={playerMenuRef}
                  className={`context-submenu ${playerMenuReady ? 'ready' : 'measuring'}`}
                  style={{
                    position: 'fixed',
                    left: playerMenuReady ? `${playerMenuPos.x}px` : '-9999px',
                    top: playerMenuReady ? `${playerMenuPos.y}px` : '-9999px',
                    visibility: playerMenuReady ? 'visible' : 'hidden',
                    opacity: playerMenuReady ? 1 : 0,
                    pointerEvents: playerMenuReady ? 'auto' : 'none',
                    zIndex: 2300,
                    background: 'transparent',
                    border: 'none',
                    padding: 0
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <PlaylistMenu
                    playlists={playlists}
                    onAddToPlaylist={(playlistId) => { onAddToPlaylist(playlistId, currentSong); setShowPlaylistMenu(false); }}
                    onClose={() => setShowPlaylistMenu(false)}
                    onCreate={() => { window.dispatchEvent(new CustomEvent('sosu:create-playlist')); setShowPlaylistMenu(false); }}
                  />
                </div>,
                menuPortalEl
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

        <div className="player-bar-right" style={{ position: 'relative' }}>

          <div className="volume-control" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="control-button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="volume-bar" onMouseDown={handleVolumeMouseDown}>
              <div className={`volume-percent ${showVolumePercent ? 'show' : ''}`} style={{ left: `${isMuted ? 0 : Math.round(volume * 100)}%` }}>
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </div>
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

