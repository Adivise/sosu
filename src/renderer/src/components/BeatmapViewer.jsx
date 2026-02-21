import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Play, Pause, Settings, Maximize2, Minimize2, Info } from 'lucide-react';
import BeatmapViewerFps from './BeatmapViewerFps';
import BeatmapViewerSettings from './BeatmapViewerSettings';
import BeatmapViewerProgress from './BeatmapViewerProgress';
import BeatmapViewerTimeline from './BeatmapViewerTimeline';
import PreviewDetailsModal from './PreviewDetailsModal';
import usePlayfieldRenderer from '../hooks/usePlayfieldRenderer';
import './BeatmapViewer.css';
import './DifficultyDropdown.css';

// reuse simple list for human-readable mode names
const MODE_LABELS = ['osu!standard','osu!taiko','osu!catch','osu!mania'];

/* Inline, portal-based difficulty dropdown so we do NOT add new files —
   constrains the menu to the viewport and reuses `playlist-menu` styles. */
function InlineDifficultyDropdown({ options = [], value = '', onSelect, title = '' }) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [portalEl, setPortalEl] = useState(null);
  const [menuPos, setMenuPos] = useState({ left: -9999, top: -9999, width: 260 });
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const lastWheelTs = useRef(0); /* rate-limit wheel-driven selection changes */

  useEffect(() => {
    // create portal container on mount so the menu can render immediately on first click
    const el = document.createElement('div');
    el.className = 'difficulty-dropdown-root';
    document.body.appendChild(el);
    setPortalEl(el);
    return () => { if (el.parentNode) el.parentNode.removeChild(el); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') return setOpen(false);
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min((options?.length||0)-1, Math.max(0, i+1))); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(0, i-1)); }
      if (e.key === 'Enter' && highlightIndex >= 0 && options[highlightIndex]) { e.preventDefault(); handleSelect(options[highlightIndex]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, highlightIndex, options]);

  useEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    const margin = 8;
    const preferredWidth = Math.min(420, Math.max(200, rect.width));
    menu.style.width = `${preferredWidth}px`;
    const menuRect = menu.getBoundingClientRect();

    let left = rect.left;
    if (left + menuRect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - menuRect.width - margin);
    if (left < margin) left = margin;

    let top = rect.bottom + 8;
    if (top + menuRect.height > window.innerHeight - margin) {
      top = rect.top - menuRect.height - 8;
      if (top < margin) top = margin;
    }

    setMenuPos({ left: Math.round(left), top: Math.round(top), width: Math.round(preferredWidth) });
  }, [open, portalEl, options]);

  const selected = options.find(o => o.filename === value) || options[0] || { filename: '', version: '' };

  const handleSelect = (opt) => {
    setOpen(false);
    setHighlightIndex(-1);
    if (onSelect) onSelect(opt.filename);
  };

  const handleWheel = (e) => {
    // rate-limit very fast wheel events when changing selection
    const now = Date.now();
    if (now - lastWheelTs.current < 80) return;
    lastWheelTs.current = now;

    if (open) {
      // if menu is open, scroll the visible list (works when hovering button)
      const list = menuRef.current?.querySelector('.playlist-menu-list');
      if (list) {
        list.scrollTop += e.deltaY;
        e.preventDefault();
      }
      return;
    }

    // when closed, use wheel to step through available options (native-select-like)
    if (!options || !options.length) return;
    e.preventDefault();
    const idx = Math.max(0, options.findIndex(o => o.filename === value));
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = Math.min(options.length - 1, Math.max(0, idx + dir));
    if (next !== idx && onSelect) onSelect(options[next].filename);
  };

  return (
    <div className="difficulty-dropdown">
      <button
        ref={btnRef}
        className="beatmap-viewer__difficulty-select"
        onClick={() => setOpen(v => !v)}
        onWheel={handleWheel}
        title={title || selected.version || selected.filename}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        <span className="difficulty-dot" style={{ background: (selected.color || 'var(--accent-color)') }} />
        <span className="difficulty-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.version || selected.filename}</span>
        <svg className="difficulty-caret" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 10l5 5 5-5z" /></svg>
      </button>

      {portalEl && open && ReactDOM.createPortal(
        <div
          ref={menuRef}
          className="playlist-menu"
          onWheel={(e) => {
            const list = menuRef.current?.querySelector('.playlist-menu-list');
            if (list) { list.scrollTop += e.deltaY; e.preventDefault(); }
          }}
          style={{ position: 'fixed', left: menuPos.left, top: menuPos.top, width: menuPos.width, zIndex: 2350 }}
          role="menu"
        >
          <div className="playlist-menu-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {options.map((opt, idx) => (
              <button
                key={opt.filename}
                className={`playlist-menu-item ${opt.filename === value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt)}
                title={opt.version || opt.filename}
                role="menuitem"
                style={idx === highlightIndex ? { background: 'rgba(var(--accent-color-rgb),0.08)' } : undefined}
              >
                <span className="difficulty-dot" style={{ background: (opt.color || 'var(--accent-color)') }} />
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{opt.version || opt.filename}</div>
                <span className="playlist-menu-count" style={{ marginLeft: 'auto' }}>{/* optional meta */}</span>
              </button>
            ))}
          </div>
        </div>,
        portalEl
      )}
    </div>
  );
}

const BeatmapViewer = ({ beatmapData, onReady, onAssetStatusChange }) => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const timelineCanvasRef = useRef(null);
  const timelineWrapperRef = useRef(null);
  const audioRef = useRef(null);
  
  // expose mode now for banner
  const previewMode = beatmapData?.metadata?.mode ?? 0;
  const modeNotSupported = previewMode !== 0;

  // Manual time tracking (beatmap-viewer-web style)
  const _currentTime = useRef(0); // Internal time storage
  const previousTimestamp = useRef(performance.now()); // Last play/pause timestamp
  const isPlayingRef = useRef(false); // Use ref for render loop to avoid closure issues
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [backgroundDim, setBackgroundDim] = useState(0.5);

  // Preview readiness tracking (notify parent via onReady / onAssetStatusChange)
  const [objectsReady, setObjectsReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [bgReady, setBgReady] = useState(false);
  const [previewReadyInternal, setPreviewReadyInternal] = useState(false);
  // refs mirror state for use in callbacks/timeouts (avoid stale closures)
  const objectsReadyRef = useRef(false);
  const audioReadyRef = useRef(false);
  const bgReadyRef = useRef(false);
  const [timelineScale, setTimelineScale] = useState(0.4); // Zoom level for timeline


  const [beatSnapDivisor, setBeatSnapDivisor] = useState(4); // 1/4 by default
  const [showSettings, setShowSettings] = useState(false);
  const [fpsDisplay, setFpsDisplay] = useState(0);
  const [frameTimeDisplay, setFrameTimeDisplay] = useState(0);
  const [currentBPM, setCurrentBPM] = useState(0);
  const [currentSV, setCurrentSV] = useState(1.0);

  // Audio settings
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.5);
  // playback speed for preview
  const [playbackRate, setPlaybackRate] = useState(1.0);
  
  // Background settings (backgroundDim already exists above)
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [breakSection, setBreakSection] = useState(false);
  
  // Gameplay settings
  const [showGrid, setShowGrid] = useState(false);
  
  // Fullscreen setting
  const [fullscreen, setFullscreen] = useState(false);

  // Default combo colors (skin switching removed — use Argon)
  const argonColors = ['#fc6496', '#96dafc', '#fcda96', '#96fc96'];
  const defaultColors = argonColors;
  
  const getComboColor = (index) => {
    if (beatmapData?.metadata?.comboColors?.length > 0) {
      return beatmapData.metadata.comboColors[index % beatmapData.metadata.comboColors.length];
    }
    return defaultColors[index % defaultColors.length];
  };

  // Difficulty picker state (store selected filename, not version label)
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  // Human-friendly label for the currently selected difficulty (used for tooltip)
  const selectedDifficultyLabel = (beatmapData?.availableDifficulties || []).find(d => d.filename === selectedDifficulty)?.version || selectedDifficulty || '';

  // Truncate long labels for native <select> options so the browser popup doesn't expand off-screen.
  // Full text remains available via the `title` attribute on each <option>.
  const _truncateLabel = (s, n = 48) => {
    if (!s) return '';
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }; 
  // Details modal state
  const [showDetails, setShowDetails] = useState(false);

  // helper to find filename for current beatmap metadata version (when available)
  const findFilenameForVersion = (meta) => {
    const avail = beatmapData?.availableDifficulties || [];
    if (!meta || !meta.version) return (avail[0]?.filename || '');
    const found = avail.find(d => d.version === meta.version);
    return found ? found.filename : (avail[0]?.filename || '');
  };

  // Pre-calculate combo info for each object
  const comboInfo = useRef([]);
  const objectIndexRef = useRef({ objects: [], times: [] });

  useEffect(() => {
    if (beatmapData?.metadata?.objects) {
      const objects = beatmapData.metadata.objects;

      // build supplementary event list (slider ticks + spinner end)
      const events = [];
      objects.forEach((obj, idx) => {
        if (obj.type & 2) {
          // slider ticks (precomputed by parser) — include spanIndex so node-specific samples can be selected
          const slides = obj.slides || 1;
          const fullDuration = (obj.endTime - obj.time) || 0;
          const slideDuration = fullDuration / Math.max(1, slides);

          if (Array.isArray(obj.tickTimes) && obj.tickTimes.length) {
            for (const t of obj.tickTimes) {
              const rel = t - obj.time;
              const spanIndex = Math.min(Math.max(0, Math.floor(rel / Math.max(1, slideDuration))), Math.max(0, slides - 1));
              events.push({ time: t, type: 'slidertick', objIndex: idx, spanIndex });
            }
          }

          // slider repeat (node) events and tail (so nodeSamples can be played)
          for (let rep = 0; rep < Math.max(0, (slides - 1)); rep++) {
            const repTime = obj.time + (rep + 1) * slideDuration;
            events.push({ time: repTime, type: 'sliderrepeat', objIndex: idx, spanIndex: rep });
          }

          if (obj.endTime && obj.endTime > obj.time) {
            events.push({ time: obj.endTime, type: 'sliderend', objIndex: idx, spanIndex: Math.max(0, slides - 1) });
          }
        }

        if (obj.type & 8) {
          // spinner end
          if (obj.endTime && obj.endTime > obj.time) events.push({ time: obj.endTime, type: 'spinnerend', objIndex: idx });
        }
      });

      // sort events by time
      events.sort((a, b) => a.time - b.time);

      objectIndexRef.current = {
        objects,
        times: objects.map(obj => obj.time),
        events,
        eventTimes: events.map(e => e.time)
      };

      // expose for debugging in DevTools
      try { window.__bv_objects = objectIndexRef.current; } catch (e) {}
    } else {
      objectIndexRef.current = { objects: [], times: [], events: [], eventTimes: [] };
      try { window.__bv_objects = objectIndexRef.current; } catch (e) {}
    }

    // mark objects readiness for parent loading UI
    try {
      const hasIndex = !!(objectIndexRef.current && Array.isArray(objectIndexRef.current.times));
      console.log('[Preview] objectIndex built — times array?', hasIndex, 'length=', objectIndexRef.current?.times?.length);
      setObjectsReady(hasIndex);
      objectsReadyRef.current = hasIndex;
      if (onAssetStatusChange) onAssetStatusChange({ objects: hasIndex, audio: audioReadyRef.current || audioReady, background: bgReadyRef.current || bgReady });
    } catch (e) { /* ignore */ }
  }, [beatmapData]);

  // Additional safeguard: poll objectIndexRef for readiness in case it gets populated asynchronously
  useEffect(() => {
    if (!beatmapData) return;

    let settled = false;
    const checkObjects = () => {
      const times = objectIndexRef.current?.times;
      const ready = Array.isArray(times);
      console.log('[Preview] polling objects readiness -> ready:', ready, 'timesLen:', times?.length);
      if (ready) {
        settled = true;
        setObjectsReady(true);
        objectsReadyRef.current = true;
        console.log('[Preview] objectsReady => true (polled)');
        if (onAssetStatusChange) onAssetStatusChange({ objects: true, audio: audioReadyRef.current || audioReady, background: bgReadyRef.current || bgReady });
      }
      return ready;
    };

    if (checkObjects()) return undefined;

    const intervalId = setInterval(() => {
      if (checkObjects()) clearInterval(intervalId);
    }, 50);

    const timeoutId = setTimeout(() => {
      if (!settled) {
        console.warn('[Preview] objects readiness timed out after 2s — marking as ready (fallback)');
        setObjectsReady(true);
        if (onAssetStatusChange) onAssetStatusChange({ objects: true, audio: audioReady, background: bgReady });
      }
      clearInterval(intervalId);
    }, 2000);

    return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
  }, [beatmapData]);

  useEffect(() => {
    if (beatmapData?.metadata?.objects) {
      let comboIndex = 0;
      let comboNumber = 1;
      let sliderCount = 0;
      
      comboInfo.current = beatmapData.metadata.objects.map((obj, i) => {
        // Count sliders for debugging
        if (obj.type & 2) {
          sliderCount++;
          if (sliderCount === 1) {
            console.log('[PreviewPlayer] First slider data:', {
              hasCalculatedPath: !!obj.calculatedPath,
              calculatedPathLength: obj.calculatedPath?.length || 0,
              hasCumulativeLength: !!obj.cumulativeLength,
              cumulativeLengthLength: obj.cumulativeLength?.length || 0,
              hasCurvePoints: !!obj.curvePoints,
              curvePointsLength: obj.curvePoints?.length || 0
            });
          }
        }
        
        // New combo detection (bit 2 of type field)
        if (i > 0 && (obj.type & 4)) {
          comboIndex++;
          comboNumber = 1;
        }
        
        const info = {
          color: getComboColor(comboIndex),
          number: comboNumber
        };
        
        comboNumber++;
        return info;
      });
      
      console.log('[PreviewPlayer] Total objects:', beatmapData.metadata.objects.length, 'Sliders:', sliderCount);
    }
  }, [beatmapData]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const volume = Math.max(0, Math.min(1, masterVolume * musicVolume));
    audio.volume = volume;
  }, [masterVolume, musicVolume, audioUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (fullscreen) {
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch((err) => {
          console.error('[Preview] Failed to enter fullscreen:', err);
          setFullscreen(false);
        });
      }
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('[Preview] Failed to exit fullscreen:', err);
      });
    }
  }, [fullscreen]);

  // Set window title to the currently loaded beatmap (so the titlebar shows the map)
  useEffect(() => {
    const baseTitle = beatmapData?.metadata ? `${beatmapData.metadata.title}${beatmapData.metadata.artist ? ' — ' + beatmapData.metadata.artist : ''}` : 'Preview';
    const title = `${baseTitle} (Preview)`;
    try { document.title = title; } catch (e) { /* ignore server-side */ }
    return () => { try { document.title = 'Preview'; } catch (e) {} };
  }, [beatmapData]);

  // Load settings from preview file (preferred) then fallback to localStorage on mount
  useEffect(() => {
    (async () => {
      try {
        let settings = null;

        // Try preview file first (persisted by main process)
        try {
          if (window.electronAPI?.getPreviewData) {
            const previewData = await window.electronAPI.getPreviewData();
            if (previewData && previewData.beatmapViewerSettings) settings = previewData.beatmapViewerSettings;
          }
        } catch (fileErr) {
          console.warn('[Preview] Could not read preview-data file, falling back to localStorage:', fileErr);
        }

        // Fallback to localStorage if no file settings
        if (!settings) {
          try {
            const savedSettings = localStorage.getItem('beatmapViewerSettings');
            if (savedSettings) settings = JSON.parse(savedSettings);
          } catch (lsErr) {
            console.warn('[Preview] Failed to parse localStorage settings:', lsErr);
          }
        }

        if (!settings) return;

        // Apply settings
        if (settings.masterVolume !== undefined) setMasterVolume(settings.masterVolume);
        if (settings.musicVolume !== undefined) setMusicVolume(settings.musicVolume);
        if (settings.backgroundDim !== undefined) setBackgroundDim(settings.backgroundDim);
        if (settings.backgroundBlur !== undefined) setBackgroundBlur(settings.backgroundBlur);
        if (settings.showGrid !== undefined) setShowGrid(settings.showGrid);
        if (settings.timelineScale !== undefined) setTimelineScale(settings.timelineScale);
        if (settings.beatSnapDivisor !== undefined) setBeatSnapDivisor(settings.beatSnapDivisor);
      } catch (err) {
        console.error('[Preview] Failed to load settings:', err);
      }
    })();
  }, []);

  // Save settings to localStorage + preview-data file whenever they change
  useEffect(() => {
    const settings = {
      masterVolume,
      musicVolume,
      backgroundDim,
      backgroundBlur,
      showGrid,
      timelineScale,
      beatSnapDivisor
    };
    
    try {
      localStorage.setItem('beatmapViewerSettings', JSON.stringify(settings));
    } catch (err) {
      console.error('[Preview] Failed to save settings to localStorage:', err);
    }

    // Also persist to preview-data file (main process)
    (async () => {
      try {
        if (window.electronAPI?.savePreviewData) {
          await window.electronAPI.savePreviewData({ beatmapViewerSettings: settings });
        }
      } catch (err) {
        console.warn('[Preview] Failed to save settings to preview-data file:', err);
      }
    })();
  }, [
    masterVolume, musicVolume,
    backgroundDim, backgroundBlur,
    showGrid,
    timelineScale, beatSnapDivisor
  ]);

  // Load assets
  const autoPlayRequestedRef = useRef(false); // used when switching difficulty via the dropdown
  useEffect(() => {
    if (!beatmapData) return;

    // local timer refs for asset fallbacks
    let bgTimer = null;

    // reset readiness when beatmap changes
    setObjectsReady(false);
    setAudioReady(false);
    setBgReady(false);
    setPreviewReadyInternal(false);
    if (onAssetStatusChange) onAssetStatusChange({ objects: false, audio: false, background: false });

    console.log('[PreviewPlayer] Loading assets...');
    console.log('[PreviewPlayer] beatmapData keys:', Object.keys(beatmapData));
    console.log('[PreviewPlayer] audioFilename:', beatmapData.audioFilename);
    console.log('[PreviewPlayer] Has audioBase64:', !!beatmapData.audioBase64);
    console.log('[PreviewPlayer] Has backgroundBase64:', !!beatmapData.backgroundBase64);

    // Convert audio from base64
    if (beatmapData.audioBase64) {
      console.log('[PreviewPlayer] Converting audio from base64...');
      const audioBytes = Uint8Array.from(atob(beatmapData.audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);
      console.log('[PreviewPlayer] Audio URL created:', url);
      setAudioUrl(url);
      // audioReady will be set when <audio> fires 'loadedmetadata'
    } else {
      // no audio => mark ready immediately
      setAudioReady(true);
      if (onAssetStatusChange) onAssetStatusChange({ objects: objectsReady, audio: true, background: bgReady });
    }

    // Convert background from base64
    if (beatmapData.backgroundBase64) {
      console.log('[PreviewPlayer] Converting background from base64...');
      const bgBytes = Uint8Array.from(atob(beatmapData.backgroundBase64), c => c.charCodeAt(0));
      const bgBlob = new Blob([bgBytes], { type: 'image/jpeg' });
      const url = URL.createObjectURL(bgBlob);
      console.log('[PreviewPlayer] Background URL created:', url);
      setBackgroundUrl(url);

      // eager-check that background image loads successfully (with extra safeguards)
      const img = new Image();
      const markBgReady = (reason) => {
        if (!bgReadyRef.current) {
          console.log('[Preview] background ready (reason):', reason);
          bgReadyRef.current = true;
          setBgReady(true);
          // clear fallback timer if running
          if (bgTimer) { clearTimeout(bgTimer); bgTimer = null; }
          if (onAssetStatusChange) onAssetStatusChange({ objects: objectsReadyRef.current || objectsReady, audio: audioReadyRef.current || audioReady, background: true });
        }
      };
      img.onload = () => markBgReady('onload');
      img.onerror = (err) => { console.warn('[Preview] background image failed to load, marking ready (onerror)', err); markBgReady('onerror'); };
      img.src = url;
      // if image was already cached/complete, handle immediately
      if (img.complete) {
        console.log('[Preview] image.complete true — treating as loaded');
        markBgReady('complete');
      }
      // fallback timeout to avoid perpetual "Waiting" (uses ref so closure isn't stale)
      bgTimer = setTimeout(() => {
        if (!bgReadyRef.current) {
          console.warn('[Preview] background load timeout — forcing ready fallback');
          markBgReady('timeout');
        }
      }, 3000);
    } else {
      console.log('[PreviewPlayer] No background in beatmap data');
      setBgReady(true);
      if (onAssetStatusChange) onAssetStatusChange({ objects: objectsReady, audio: audioReady, background: true });
    }

    // Sync selected difficulty filename with incoming beatmap data
    try {
      const fn = findFilenameForVersion(beatmapData?.metadata);
      if (fn) setSelectedDifficulty(fn);
    } catch (e) { console.warn('failed to sync selectedDifficulty', e); }

    // no hitsounds: keep only audio/background cleanup
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
      if (bgTimer) { clearTimeout(bgTimer); bgTimer = null; }
    };
  }, [beatmapData]);

  // hitsounds removed — expose minimal debug state only
  useEffect(() => {
    try { window.__bv_state = { masterVolume, musicVolume }; } catch (e) {}
  }, [masterVolume, musicVolume]);

  // renderer logic moved to `usePlayfieldRenderer` hook (keeps rendering behavior identical)
  usePlayfieldRenderer({
    canvasRef,
    timelineCanvasRef,
    timelineWrapperRef,
    audioRef,
    beatmapData,
    backgroundUrl,
    backgroundDim,
    timelineScale,
    beatSnapDivisor,
    isPlayingRef,
    _currentTimeRef: _currentTime,
    previousTimestampRef: previousTimestamp,
    // new: playback rate affects timing
    playbackRate,
    setIsPlaying,
    setCurrentTime,
    setCurrentBPM,
    setCurrentSV,
    setFpsDisplay,
    setFrameTimeDisplay,
    comboInfoRef: comboInfo,
    objectIndexRef,
    showGrid,
    masterVolume,
  });

  // keep audio element and manual timing in sync with playbackRate
  const prevPlaybackRate = useRef(playbackRate);
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = playbackRate;

    // if we're currently playing, adjust our manual timer so we don't "jump" when rate changes
    if (isPlayingRef.current) {
      const now = performance.now();
      // account for time elapsed at the previous speed
      _currentTime.current += (now - previousTimestamp.current) * prevPlaybackRate.current;
      previousTimestamp.current = now;
    }
    prevPlaybackRate.current = playbackRate;
  }, [playbackRate]);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // reset audio-ready flag until metadata arrives
    setAudioReady(false);
    if (onAssetStatusChange) onAssetStatusChange({ objects: objectsReady, audio: false, background: bgReady });

    audio.src = audioUrl;

    const handleLoadedMetadata = () => {
      if (audioReadyRef.current) return; // already handled
      console.log('[Preview] audio metadata loaded (marking audio ready) — readyState=', audio.readyState);
      setDuration(audio.duration);
      _currentTime.current = 0;
      previousTimestamp.current = performance.now();
      // audio considered ready for preview when metadata is loaded
      setAudioReady(true);
      audioReadyRef.current = true;
      if (onAssetStatusChange) onAssetStatusChange({ objects: objectsReadyRef.current || objectsReady, audio: true, background: bgReadyRef.current || bgReady });
    };

    const handleEnded = () => {
      _currentTime.current += (performance.now() - previousTimestamp.current) * playbackRate;
      isPlayingRef.current = false;
      setIsPlaying(false);
    };

    // If metadata already available (race), call handler immediately; otherwise attach listener
    let audioTimer = null;
    try {
      if (audio.readyState >= 1) {
        // metadata already available
        handleLoadedMetadata();
      } else {
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        // also listen for additional events to improve robustness
        audio.addEventListener('loadeddata', handleLoadedMetadata);
        audio.addEventListener('canplay', handleLoadedMetadata);
      }

      // audio fallback timeout to avoid perpetual waiting
      audioTimer = setTimeout(() => {
        if (!audioReadyRef.current) {
          console.warn('[Preview] audio metadata timeout — forcing audio ready fallback');
          handleLoadedMetadata();
        }
      }, 3000);
    } catch (e) {
      // fallback: attach listener
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    // After assigning src, ensure UI matches actual playback state.
    const syncPlaybackState = async () => {
      try {
        // If playback was requested (user was playing before switch or autoplay flagged), attempt to play
        if (autoPlayRequestedRef.current || isPlayingRef.current) {
          autoPlayRequestedRef.current = false;
          try {
            await audio.play();
            isPlayingRef.current = true;
            setIsPlaying(true);
            return;
          } catch (err) {
            console.warn('[Preview] audio.play() failed after src change:', err);
            isPlayingRef.current = false;
            setIsPlaying(false);
            return;
          }
        }

        // Otherwise, make sure UI reflects audio.paused
        if (!audio.paused) {
          isPlayingRef.current = true;
          setIsPlaying(true);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      } catch (err) {
        console.warn('[Preview] syncPlaybackState error', err);
      }
    };

    // Defer sync to allow browser to process src change
    const syncTimer = setTimeout(syncPlaybackState, 0);

    audio.addEventListener('ended', handleEnded);

    return () => {
      clearTimeout(syncTimer);
      try {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('loadeddata', handleLoadedMetadata);
        audio.removeEventListener('canplay', handleLoadedMetadata);
      } catch (e) {}
      audio.removeEventListener('ended', handleEnded);
      if (audioTimer) { clearTimeout(audioTimer); audioTimer = null; }
    };
  }, [audioUrl]);

  // notify parent when all required assets are ready and expose preview-ready state
  useEffect(() => {
    const needAudio = Boolean(beatmapData?.audioBase64);
    const needBg = Boolean(beatmapData?.backgroundBase64);
    const okAudio = needAudio ? audioReady : true;
    const okBg = needBg ? bgReady : true;
    const okObjects = objectsReady;

    console.log('[Preview] readiness check -> audio:', okAudio, 'background:', okBg, 'objects:', okObjects);
    if (okAudio && okBg && okObjects) {
      if (!previewReadyInternal) {
        console.log('[Preview] all assets ready — setting previewReadyInternal = true and calling onReady(true)');
        setPreviewReadyInternal(true);
        if (onReady) {
          try { onReady(true); } catch (e) { console.error('[Preview] onReady(true) callback threw', e); }
        }
      }
    } else {
      if (previewReadyInternal) {
        console.log('[Preview] some assets no longer ready — setting previewReadyInternal = false and calling onReady(false)');
        setPreviewReadyInternal(false);
        if (onReady) {
          try { onReady(false); } catch (e) { console.error('[Preview] onReady(false) callback threw', e); }
        }
      }
    }
  }, [audioReady, bgReady, objectsReady, beatmapData]);



  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingRef.current) {
      // Pause: save current time before stopping
      _currentTime.current += (performance.now() - previousTimestamp.current) * playbackRate;
      audio.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      // Play: record timestamp and sync audio
      previousTimestamp.current = performance.now();
      audio.currentTime = _currentTime.current / 1000;
      
      try {
        await audio.play();
        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (error) {
        console.error('[PreviewPlayer] Play error:', error);
      }
    }
  };

  // convenience seekers for hotkeys
  const seekBy = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min((audio.duration || 0), (audio.currentTime || 0) + seconds));
    _currentTime.current = newTime * 1000;
    audio.currentTime = newTime;
    previousTimestamp.current = performance.now();
    setCurrentTime(newTime);
  };

  const cycleSpeed = () => {
    const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setPlaybackRate(next);
  };

  // keyboard shortcuts applicable when preview window has focus
  useEffect(() => {
    const onKey = (e) => {
      // ignore when typing into form controls
      if (e.target && ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'Comma':
          e.preventDefault();
          seekBy(-1);
          break;
        case 'Period':
          e.preventDefault();
          seekBy(1);
          break;
        case 'KeyF':
          e.preventDefault();
          setFullscreen(f => !f);
          break;
        case 'KeyS':
          e.preventDefault();
          cycleSpeed();
          break;
        case 'KeyR':
          e.preventDefault();
          setPlaybackRate(1.0);
          break;
        case 'KeyD':
          e.preventDefault();
          setShowDetails(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePlayPause, setFullscreen, playbackRate, setPlaybackRate, setShowDetails]);

  const formatTime = (seconds) => {
    const totalMs = Math.floor(seconds * 1000);
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
  };


  if (!beatmapData) {
    return (
      <div className="beatmap-viewer">
        <div className="beatmap-viewer__error">No beatmap data</div>
      </div>
    );
  }

  // stars removed — fallback to metadata.difficulty for a simple label
  const _diffStars = null;
  const _diffInfo = { color: '#89b4fa', label: (beatmapData?.metadata?.difficulty ?? 'Unknown') }; 

  return (
    <div className="beatmap-viewer">
      {modeNotSupported && (
        <div className="beatmap-viewer__mode-warning">
          Mode: <strong>{MODE_LABELS[previewMode] || `mode ${previewMode}`}</strong><br />
          Preview only supports <strong>standard</strong> mode right now.<br />
          Support for other modes will be added later.
        </div>
      )}

      <div
        className="beatmap-viewer__bg"
        style={{
          backgroundImage: backgroundUrl
            ? `linear-gradient(rgba(0, 0, 0, ${backgroundDim}), rgba(0, 0, 0, ${backgroundDim})), url(${backgroundUrl})`
            : 'none',
          filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : 'none'
        }}
      />

      <div className="beatmap-viewer__content">
        {/* header removed — title moved to window titlebar */}
        <div className="beatmap-viewer__wrapper" ref={wrapperRef}>
          {/* Main Canvas */}
          <canvas ref={canvasRef} className="beatmap-viewer__canvas" />
        </div>

        {/* Floating Difficulty selector + Settings button (left - center) */}
        {beatmapData?.availableDifficulties && beatmapData.availableDifficulties.length > 0 && (
          <div className="beatmap-viewer__difficulty-float-right">
            <InlineDifficultyDropdown
              options={beatmapData.availableDifficulties}
              value={selectedDifficulty}
              onSelect={async (fname) => {
                if (!fname || fname === selectedDifficulty) return;

                // Immediately stop playback and reset position when switching difficulty
                try {
                  const audioEl = audioRef.current;
                  if (audioEl) {
                    try { audioEl.pause(); } catch (e) {}
                    try { audioEl.currentTime = 0; } catch (e) {}
                  }
                } catch (e) { /* ignore */ }

                isPlayingRef.current = false;
                setIsPlaying(false);
                _currentTime.current = 0;
                setCurrentTime(0);

                // ensure no autoplay will occur after load
                autoPlayRequestedRef.current = false;

                // optimistic UI update
                const prev = selectedDifficulty;
                setSelectedDifficulty(fname);

                try {
                  const res = await window.electronAPI.previewLoadDifficulty(beatmapData.folderPath, fname);
                  console.log('[Preview] previewLoadDifficulty result ->', res);
                  if (!res || !res.success) {
                    console.warn('previewLoadDifficulty failed:', res?.error);
                    setSelectedDifficulty(prev);
                  }
                } catch (err) {
                  console.error('previewLoadDifficulty failed', err);
                  setSelectedDifficulty(prev);
                }
              }}
              title={selectedDifficultyLabel}
            />
          </div>
        )}

        <button
          className="beatmap-viewer__settings-button beatmap-viewer__settings-float"
          onClick={() => setShowSettings(true)}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        {/* Timeline (canvas + controls) */}
        <div className="beatmap-viewer__timeline-wrapper" ref={timelineWrapperRef}>
          <BeatmapViewerTimeline
            canvasRef={timelineCanvasRef}
            timelineScale={timelineScale}
            setTimelineScale={setTimelineScale}
            beatSnapDivisor={beatSnapDivisor}
            setBeatSnapDivisor={setBeatSnapDivisor}
            currentTime={currentTime}
            beatmapData={beatmapData}
            duration={duration}
            objects={objectIndexRef.current.objects}
            comboInfo={comboInfo.current}
          />
        </div>

        {/* FPS Counter (bottom-right) */}
        <BeatmapViewerFps fps={fpsDisplay} frameTime={frameTimeDisplay} />

        {/* Controls Bar (Bottom) */}
        <div className="beatmap-viewer__controls">
        {/* Timestamp */}
        <div className="beatmap-viewer__timestamp">
          <p className="beatmap-viewer__timestamp-time">{formatTime(currentTime)}</p>
          <p className="beatmap-viewer__timestamp-bpm">{currentBPM} BPM x{currentSV.toFixed(2)}</p>
        </div>

        {/* Rest of Controls */}
        <div className="beatmap-viewer__controls-rest">
          {/* Play Button */}
          <button
            onClick={handlePlayPause}
            className="beatmap-viewer__play-button"
            title={modeNotSupported ? 'Preview unavailable for this mode' : (isPlaying ? 'Pause' : 'Play')}
            disabled={modeNotSupported}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <BeatmapViewerProgress
            duration={duration}
            currentTime={currentTime}
            beatmapData={beatmapData}
            onSeek={(newTime) => {
              const audio = audioRef.current;
              if (!audio) return;
              _currentTime.current = newTime * 1000;
              audio.currentTime = newTime;
              previousTimestamp.current = performance.now();
              setCurrentTime(newTime);
            }}
          />

          {/* Miscellaneous Controls */}
          <div className="beatmap-viewer__misc-controls">
            <button
              className="beatmap-viewer__replay-button"
              title="Show map details (D)"
              onClick={() => setShowDetails(true)}
            >
              <Info size={14} />
            </button>

            {/* simple speed button that cycles through presets */}
            <button
              className="beatmap-viewer__speed-button"
              title={`Playback speed: ${playbackRate.toFixed(2)}x (click/S to cycle, right-click/R to reset)`}
              onClick={() => {
                const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                const idx = SPEEDS.indexOf(playbackRate);
                const next = SPEEDS[(idx + 1) % SPEEDS.length];
                console.log('[Preview] speed button clicked, changing from', playbackRate, 'to', next);
                setPlaybackRate(next);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                console.log('[Preview] speed reset via context menu');
                setPlaybackRate(1.0);
              }}
            >
              {playbackRate.toFixed(2)}x
            </button>

            <button
              onClick={() => setFullscreen(prev => !prev)}
              className="beatmap-viewer__fullscreen-button"
              title={fullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
        </div>
      </div>

      {showSettings && (
        <BeatmapViewerSettings
          onClose={() => setShowSettings(false)}
          masterVolume={masterVolume} setMasterVolume={setMasterVolume}
          musicVolume={musicVolume} setMusicVolume={setMusicVolume}
          backgroundDim={backgroundDim} setBackgroundDim={setBackgroundDim}
          backgroundBlur={backgroundBlur} setBackgroundBlur={setBackgroundBlur}
          breakSection={breakSection} setBreakSection={setBreakSection}
          showGrid={showGrid} setShowGrid={setShowGrid}
          fullscreen={fullscreen} setFullscreen={setFullscreen}
        />
      )}

      {/* Map details modal (replaces old Restart button) */}
      {showDetails && (
        <PreviewDetailsModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          beatmapData={beatmapData}
          duration={duration}
        />
      )}

      <audio ref={audioRef} />
    </div>
  );
};

export default BeatmapViewer;