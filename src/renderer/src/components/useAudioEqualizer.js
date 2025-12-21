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

  // helper to create/resume AudioContext
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContextRef.current = new AudioCtx();
    }
    return audioContextRef.current;
  }, []);

  // build filter nodes and connect chain
  const buildFiltersAndConnect = useCallback(
    (audioEl) => {
      const context = ensureAudioContext();
      if (!context || !audioEl) return;

      // Create source only once (MediaElementSource can't be created twice for same element)
      if (!sourceNodeRef.current) {
        try {
          sourceNodeRef.current = context.createMediaElementSource(audioEl);
        } catch (err) {
          // If this fails, most likely a previous source exists; keep going
          console.warn('createMediaElementSource failed (maybe already created):', err);
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

      // Create new filters from eqBands
      const filters = eqBands.map((band) => {
        const f = context.createBiquadFilter();
        f.type = 'peaking';
        if (typeof band.frequency === 'number') f.frequency.value = band.frequency;
        else f.frequency.value = band.freq || 1000;
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
        } else {
          // fallback: connect nothing if source not available
          console.warn('Source node not available when connecting filters.');
        }
      } catch (err) {
        console.error('Error connecting filter chain:', err);
      }

      if (onSetup) {
        try { onSetup(filters); } catch (e) {}
      }
    },
    [ensureAudioContext, eqBands, onSetup]
  );

  // update existing filters' gain values when eqBands change
  useEffect(() => {
    if (!filterNodesRef.current || !filterNodesRef.current.length) {
      // If filters do not exist yet, attempt to build if audio is ready
      const audio = audioRef?.current;
      if (audio) buildFiltersAndConnect(audio);
      return;
    }

    // Update existing filter nodes or rebuild if mismatch length
    if (filterNodesRef.current.length === eqBands.length) {
      filterNodesRef.current.forEach((filter, idx) => {
        const g = eqBands[idx]?.gain ?? 0;
        try {
          filter.gain.value = g;
        } catch (e) {
          // ignore if node not ready
        }
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
      // Build chain if not yet built
      if (!filterNodesRef.current || filterNodesRef.current.length !== eqBands.length) {
        buildFiltersAndConnect(audio);
      }
      // Try to resume if suspended (many browsers require user gesture)
      if (ctx.state === 'suspended') {
        ctx.resume().catch((err) => {
          // resume may fail without user gesture — that's fine; user gesture (play) will retry
          // console.warn('AudioContext resume failed:', err);
        });
      }
    };

    // Attach listeners
    audio.addEventListener('play', trySetupAndResume);
    audio.addEventListener('canplay', trySetupAndResume);
    audio.addEventListener('loadedmetadata', trySetupAndResume);

    // If audio is already ready/playing, attempt immediate setup
    if (!audio.paused || audio.readyState >= 2) {
      trySetupAndResume();
    }

    return () => {
      audio.removeEventListener('play', trySetupAndResume);
      audio.removeEventListener('canplay', trySetupAndResume);
      audio.removeEventListener('loadedmetadata', trySetupAndResume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef, eqBands.length, ensureAudioContext, buildFiltersAndConnect]);

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