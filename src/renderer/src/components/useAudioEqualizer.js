// useAudioEqualizer.js
import { useEffect, useRef, useCallback } from 'react';

/**
 * Robust WebAudio EQ hook
 * - audioRef: ref to <audio> element
 * - eqBands: array [{ freq, gain, Q? }]
 * - onSetup(optional): callback(filterNodes[]) after setup
 *
 * Returns: [setBandGain, getFilterNodes]
 */
export default function useAudioEqualizer({ audioRef, eqBands = [], onSetup } = {}) {
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const filterNodesRef = useRef([]);
  const lastAudioElementRef = useRef(null);

  // helper to create/resume AudioContext
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContextRef.current = new AudioCtx();
    }
    return audioContextRef.current;
  }, []);

  // build filter nodes and connect chain - NOT useCallback so it always uses latest eqBands
  const buildFiltersAndConnect = (audioEl, forceNewSource = false) => {
    const context = ensureAudioContext();
    if (!context || !audioEl) return;

    // Check if audio element changed or we need to force new source
    const audioElChanged = lastAudioElementRef.current !== audioEl;
    const needNewSource = audioElChanged || forceNewSource || !sourceNodeRef.current;

    if (needNewSource && sourceNodeRef.current) {
      // Disconnect old source
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }

    // Create source if needed
    if (!sourceNodeRef.current) {
      try {
        sourceNodeRef.current = context.createMediaElementSource(audioEl);
        lastAudioElementRef.current = audioEl;
      } catch (err) {
        console.warn('[EQ] createMediaElementSource failed:', err);
        // If source wasn't created, we can't proceed
        if (!sourceNodeRef.current) {
          return;
        }
      }
    }

    // Disconnect previous filters safely
    try {
      if (filterNodesRef.current.length) {
        filterNodesRef.current.forEach((n) => {
          try { n.disconnect(); } catch (e) {}
        });
      }
    } catch (e) {}

    // Create new filters from CURRENT eqBands
    const filters = eqBands.map((band) => {
      const f = context.createBiquadFilter();
      f.type = 'peaking';
      // Support both 'freq' and 'frequency' property names
      if (typeof band.freq === 'number') f.frequency.value = band.freq;
      else if (typeof band.frequency === 'number') f.frequency.value = band.frequency;
      else f.frequency.value = 1000;
      f.Q.value = typeof band.Q === 'number' ? band.Q : (band.q || 1);
      f.gain.value = typeof band.gain === 'number' ? band.gain : 0;
      return f;
    });

    filterNodesRef.current = filters;

    // Connect chain: source -> f0 -> f1 -> ... -> destination
    try {
      if (sourceNodeRef.current) {
        let prev = sourceNodeRef.current;
        filters.forEach((f) => {
          prev.connect(f);
          prev = f;
        });
        prev.connect(context.destination);
      }
    } catch (err) {
      console.error('[EQ] Error connecting filter chain:', err);
    }

    if (onSetup) {
      try { onSetup(filters); } catch (e) {}
    }
  };

  // update existing filters' gain values when eqBands change
  useEffect(() => {
    if (!filterNodesRef.current || !filterNodesRef.current.length) {
      // If filters do not exist yet, attempt to build if audio is ready
      const audio = audioRef?.current;
      if (audio) {
        buildFiltersAndConnect(audio);
      }
      return;
    }

    // Update existing filter nodes or rebuild if mismatch length
    if (filterNodesRef.current.length === eqBands.length) {
      filterNodesRef.current.forEach((filter, idx) => {
        const g = eqBands[idx]?.gain ?? 0;
        try {
          filter.gain.value = g;
        } catch (e) {}
      });
    } else {
      // lengths differ — rebuild chain to ensure alignment
      const audio = audioRef?.current;
      if (audio) buildFiltersAndConnect(audio);
    }
  }, [eqBands, audioRef, buildFiltersAndConnect]);

  // Listen for audio element events (play/canplay/loadedmetadata) to setup and resume context
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const trySetupAndResume = () => {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      
      buildFiltersAndConnect(audio, false);
      
      // Try to resume if suspended
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };

    // Attach listeners - use 'loadeddata' instead of 'loadedmetadata' to ensure audio is ready
    audio.addEventListener('play', trySetupAndResume);
    audio.addEventListener('loadeddata', trySetupAndResume);

    // If audio is already ready/playing, attempt immediate setup
    if (!audio.paused || audio.readyState >= 2) {
      trySetupAndResume();
    }

    return () => {
      audio.removeEventListener('play', trySetupAndResume);
      audio.removeEventListener('loadeddata', trySetupAndResume);
    };
    // Re-attach listeners when eqBands change to use latest values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef, eqBands, ensureAudioContext]);

  // utility to set a single band gain immediately
  const setBandGain = useCallback((idx, gain) => {
    if (filterNodesRef.current && filterNodesRef.current[idx]) {
      try {
        filterNodesRef.current[idx].gain.value = gain;
      } catch (e) {
        // ignore set errors
      }
    }
  }, []);

  // return setter and a getter for debug if needed
  const getFilterNodes = useCallback(() => filterNodesRef.current, []);

  return [setBandGain, getFilterNodes];
}