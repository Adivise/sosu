import { useEffect, useRef } from 'react';
import { toScreen } from '../utils/playfieldDrawUtils';
import { renderHitObject } from '../utils/playfieldRenderObjects';
import { renderTimeline } from '../utils/timelineRenderer';

// usePlayfieldRenderer: encapsulates the canvas render loop previously inside BeatmapViewer
// - Accepts refs and setters from the parent component
// - Keeps behavior identical to the original render useEffect
export default function usePlayfieldRenderer(opts = {}) {
  const {
    canvasRef,
    timelineCanvasRef,
    timelineWrapperRef,
    headerRef,
    audioRef,
    beatmapData,
    backgroundUrl,
    backgroundDim,
    timelineScale,
    beatSnapDivisor,
    isPlayingRef,
    _currentTimeRef,
    previousTimestampRef,
    // new: playback rate multiplier for manual timekeeping
    playbackRate = 1,
    setIsPlaying,
    setCurrentTime,
    setCurrentBPM,
    setCurrentSV,
    setFpsDisplay,
    setFrameTimeDisplay,
    comboInfoRef,
    objectIndexRef,
    showGrid,
    // engine audio settings
    masterVolume,
  } = opts;

  // Internal refs for rendering metrics / animation frame
  const animationFrameRef = useRef(null);
  const renderStart = useRef(0);
  const lastFrame = useRef(performance.now());
  const fpsQueue = useRef([]);
  const msQueue = useRef([]);
  const fps = useRef(0);
  const frameTime = useRef(0);
  const maxFps = useRef(0);
  const fpsDisplayRef = useRef(0);
  const frameTimeDisplayRef = useRef(0);
  const lastStateUpdate = useRef(0);
  const lastMetricsUpdate = useRef(0);


  // Helpers (copied from original component for identical behaviour)
  const getCurrentBPM = (currentMs = (_currentTimeRef && _currentTimeRef.current) || 0) => {
    if (!beatmapData?.metadata?.timingPoints || beatmapData.metadata.timingPoints.length === 0) {
      return 0;
    }

    const timingPoints = beatmapData.metadata.timingPoints
      .filter(tp => tp.beatLength > 0 && tp.uninherited !== false)
      .sort((a, b) => a.time - b.time);

    if (timingPoints.length === 0) return 0;

    let currentTimingPoint = null;
    for (const tp of timingPoints) {
      if (tp.time <= currentMs) {
        currentTimingPoint = tp;
      } else break;
    }

    if (!currentTimingPoint) currentTimingPoint = timingPoints[0];

    return currentTimingPoint && currentTimingPoint.beatLength > 0
      ? Math.round(60000 / currentTimingPoint.beatLength)
      : 0;
  };

  const getCurrentSV = (currentMs = (_currentTimeRef && _currentTimeRef.current) || 0) => {
    if (!beatmapData?.metadata) return 1.0;

    let currentSV = 1.0;

    if (beatmapData.metadata.difficultyPoints?.length) {
      for (const dp of beatmapData.metadata.difficultyPoints) {
        if (dp.time > currentMs) break;
        if (Number.isFinite(dp.sliderVelocity)) {
          currentSV = dp.sliderVelocity;
        }
      }
      return currentSV;
    }

    if (beatmapData.metadata.timingPoints?.length) {
      for (const tp of beatmapData.metadata.timingPoints) {
        if (tp.time > currentMs) break;
        if (tp.uninherited === false && tp.beatLength < 0) {
          currentSV = Math.max(0.1, Math.min(10, -100 / tp.beatLength));
        }
      }
    }

    return currentSV;
  };

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return undefined;


    const ctx = canvas.getContext('2d');
    const wrapper = canvas.parentElement;


    // DPR-aware sizing for main + timeline overlay
    const resizeCanvas = () => {

      const cssW = wrapper.clientWidth;
      const cssH = wrapper.clientHeight;
      const DPR = Math.max(1, window.devicePixelRatio || 1);

      canvas.width = Math.round(cssW * DPR);
      canvas.height = Math.round(cssH * DPR);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const tcanvas = timelineCanvasRef?.current;
      const twEl = timelineWrapperRef?.current;
      const timelineCssW = (twEl && twEl.clientWidth) ? twEl.clientWidth : cssW;
      if (tcanvas) {
        const tHeight = 80;
        tcanvas.width = Math.round(timelineCssW * DPR);
        tcanvas.height = Math.round(tHeight * DPR);
        tcanvas.style.width = timelineCssW + 'px';
        tcanvas.style.height = tHeight + 'px';
        const tctx = tcanvas.getContext('2d');
        tctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }

      // Attach timeline directly under header
      const hdr = headerRef?.current;
      const tw = timelineWrapperRef?.current;
      const root = document.querySelector('.beatmap-viewer');
      if (hdr && tw && root) {
        const hdrRect = hdr.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const topPx = Math.max(0, Math.round(hdrRect.bottom - rootRect.top));
        tw.style.top = `${topPx}px`;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const repositionTimeline = () => {
      const hdr = headerRef?.current;
      const tw = timelineWrapperRef?.current;
      const root = document.querySelector('.beatmap-viewer');
      if (hdr && tw && root) {
        const hdrRect = hdr.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const topPx = Math.max(0, Math.round(hdrRect.bottom - rootRect.top));
        tw.style.top = `${topPx}px`;
      }
    };

    window.addEventListener('resize', repositionTimeline);
    window.addEventListener('scroll', repositionTimeline, true);

    let isActive = true;

    // Background image handling
    const bgImage = new Image();
    if (backgroundUrl) {
      bgImage.onload = () => {};
      bgImage.onerror = () => {};
      bgImage.src = backgroundUrl;
    }

    // Binary-search helpers for visible range
    const findFirstIndex = (times, target) => {
      let lo = 0;
      let hi = times.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    const findLastIndex = (times, target) => {
      let lo = 0;
      let hi = times.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    // Track last time we checked/played hits (avoids duplicate plays when looping)
    const lastPlayedMs = { value: 0 }; // small mutable holder (kept in closure)

    // Main render loop (ported from original component)
    const render = () => {
      if (!isActive) return;

      renderStart.current = performance.now();
      const deltaTime = renderStart.current - lastFrame.current;

      if (deltaTime < 200) {
        const currentFps = 1000 / deltaTime;
        fpsQueue.current.push(currentFps);
        while (fpsQueue.current.length > 100) fpsQueue.current.shift();

        if (fpsQueue.current.length > 0) {
          const weightedSum = fpsQueue.current.reduce((accm, curr, idx) => accm + curr * ((idx + 1) / fpsQueue.current.length), 0);
          const divisor = ((1 / fpsQueue.current.length + 1) * (fpsQueue.current.length / 2));
          fps.current = weightedSum / divisor;
          if (fps.current > maxFps.current) maxFps.current = Math.round(fps.current);
        }
      }

      lastFrame.current = renderStart.current;

      const audio = audioRef?.current;
      if (!audio) return;

      // Manual time tracking (adjusted by playback rate)
      let currentMs;
      if (isPlayingRef?.current) {
        currentMs = _currentTimeRef.current + (performance.now() - previousTimestampRef.current) * playbackRate;
        if (currentMs >= audio.duration * 1000) {
          currentMs = audio.duration * 1000;
          _currentTimeRef.current = currentMs;
          isPlayingRef.current = false;
          if (setIsPlaying) setIsPlaying(false);
          audio.pause();
        }
      } else {
        currentMs = _currentTimeRef.current;
      }

      // hitsounds removed — keep timing bookkeeping but do not play any audio.
      try {
        const times = objectIndexRef?.current?.times || [];
        if (currentMs < lastPlayedMs.value) lastPlayedMs.value = currentMs;

        if (times.length && currentMs > lastPlayedMs.value + 1) {
          const startIdx = findFirstIndex(times, Math.floor(lastPlayedMs.value) + 1);
          const endIdx = findLastIndex(times, Math.floor(currentMs));
          for (let i = startIdx; i < endIdx; i++) {
            const obj = objectIndexRef.current.objects[i];
            if (!obj) continue;
            // advance lastPlayedMs so other systems remain consistent
            lastPlayedMs.value = Math.max(lastPlayedMs.value, obj.time || 0);
          }
        }

        // keep processing events to maintain timing state, but do not play audio
        const events = objectIndexRef?.current?.events || [];
        const etimes = objectIndexRef?.current?.eventTimes || [];
        if (etimes.length && currentMs > lastPlayedMs.value + 1) {
          const estart = findFirstIndex(etimes, Math.floor(lastPlayedMs.value) + 1);
          const eend = findLastIndex(etimes, Math.floor(currentMs));
          for (let ei = estart; ei < eend; ei++) {
            const ev = events[ei];
            if (!ev) continue;
            const obj = objectIndexRef.current.objects[ev.objIndex];
            if (!obj) continue;
            lastPlayedMs.value = Math.max(lastPlayedMs.value, ev.time || 0);
          }
        }

        lastPlayedMs.value = currentMs;
      } catch (err) {
        // swallow errors so rendering never breaks
        if (typeof console !== 'undefined' && console.debug) console.debug('[usePlayfieldRenderer] hitsound playback removed — internal timing error', err?.message || err);
      }
      if (renderStart.current - lastStateUpdate.current > 16) {
        if (setCurrentTime) setCurrentTime(currentMs / 1000);
        lastStateUpdate.current = renderStart.current;
      }

      // Update BPM/SV for display
      const bpm = getCurrentBPM(currentMs);
      const sv = getCurrentSV(currentMs);
      if (setCurrentBPM) setCurrentBPM(bpm);
      if (setCurrentSV) setCurrentSV(sv);
      // Clear main canvas
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Compute playfield layout
      const playfieldGap = 10;
      const availableHeight = cssHeight - playfieldGap;
      const playfieldAspect = 512 / 384;
      const availableAspect = cssWidth / availableHeight;
      let playfieldWidth, playfieldHeight, playfieldX, playfieldY;

      if (availableAspect > playfieldAspect) {
        playfieldHeight = availableHeight;
        playfieldWidth = playfieldHeight * playfieldAspect;
      } else {
        playfieldWidth = cssWidth;
        playfieldHeight = playfieldWidth / playfieldAspect;
      }

      const PLAYFIELD_SCALE = 0.65;
      playfieldWidth = Math.round(playfieldWidth * PLAYFIELD_SCALE);
      playfieldHeight = Math.round(playfieldHeight * PLAYFIELD_SCALE);

      playfieldX = (cssWidth - playfieldWidth) / 2;
      const _centerDesired = Math.round((cssHeight - playfieldHeight) / 2);
      // slightly less downward nudge so the playfield sits a bit higher
      const PLAYFIELD_NUDGE_PCT = 0.00;
      const _nudge = Math.round(playfieldHeight * PLAYFIELD_NUDGE_PCT);
      playfieldY = Math.max(0, _centerDesired + _nudge);

      const playfieldRadius = 10;
      const drawRoundedRect = (x, y, width, height, radius) => {
        const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.arcTo(x + width, y, x + width, y + r, r);
        ctx.lineTo(x + width, y + height - r);
        ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
        ctx.lineTo(x + r, y + height);
        ctx.arcTo(x, y + height, x, y + height - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      };

      // draw playfield border each frame (focus outlines were the real culprit)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      drawRoundedRect(playfieldX, playfieldY, playfieldWidth, playfieldHeight, playfieldRadius);
      ctx.stroke();

      // Grid
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        const gridSize = 32;
        for (let x = 0; x <= 512; x += gridSize) {
          const screenX = playfieldX + (x / 512) * playfieldWidth;
          ctx.beginPath();
          ctx.moveTo(screenX, playfieldY);
          ctx.lineTo(screenX, playfieldY + playfieldHeight);
          ctx.stroke();
        }
        for (let y = 0; y <= 384; y += gridSize) {
          const screenY = playfieldY + (y / 384) * playfieldHeight;
          ctx.beginPath();
          ctx.moveTo(playfieldX, screenY);
          ctx.lineTo(playfieldX + playfieldWidth, screenY);
          ctx.stroke();
        }
        const _centerX = Math.round(playfieldX + playfieldWidth / 2);
        const _centerY = Math.round(playfieldY + playfieldHeight / 2);
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(_centerX - 10, _centerY);
        ctx.lineTo(_centerX + 10, _centerY);
        ctx.moveTo(_centerX, _centerY - 10);
        ctx.lineTo(_centerX, _centerY + 10);
        ctx.stroke();
        ctx.restore();
      }

      // `toScreen` moved to `utils/playfieldDrawUtils.js` — use imported helper instead.

      // Circle radius respects beatmap CS (parity with osu.js `calculateRadius`)
      const CS = (beatmapData?.metadata?.cs !== undefined) ? Number(beatmapData.metadata.cs) : 5;
      const baseRadius = 32 * (1 - 0.7 * (CS - 5) / 5);
      const circleRadius = (playfieldWidth / 512) * baseRadius;
      const strokeWidth = Math.max(2, circleRadius * 0.1);
      const fontSize = Math.max(12, circleRadius * 0.5);

      // Compute AR-based approach timing (match osu.js behavior)
      const AR = (beatmapData?.metadata?.ar !== undefined) ? Number(beatmapData.metadata.ar) : 5;
      const preempt = AR <= 5 ? 1200 + 600 * (5 - AR) / 5 : 1200 - 750 * (AR - 5) / 5;
      const fadeIn = AR <= 5 ? 800 + 400 * (5 - AR) / 5 : 800 - 500 * (AR - 5) / 5;

      const { objects, times } = objectIndexRef.current || { objects: [], times: [] };

      const visibleStart = currentMs - 5000;
      const visibleEnd = currentMs + 3000;
      const startIndex = findFirstIndex(times, visibleStart);
      const endIndex = findLastIndex(times, visibleEnd);

      // Include objects that started earlier but are still active into the visible window
      // (fixes sliders disappearing on playfield while timeline still shows them)
      let _startIndex = startIndex;
      while (_startIndex > 0) {
        const prev = objects[_startIndex - 1];
        const prevEnd = (prev && (prev.endTime || prev.time)) || 0;
        if (prevEnd >= visibleStart) _startIndex--; else break;
      }
      // use adjusted start index for rendering passes below
      const renderStartIndex = _startIndex;

      // Follow points — adopt osu.js behaviour (line segments that fade in/out using preempt)
      if (objects.length > 0 && comboInfoRef.current.length > 0) {
        const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
        const lerp = (t, a, b) => a + (b - a) * t;

        for (let i = startIndex; i < endIndex - 1; i++) {
          const previous = objects[i];
          const next = objects[i + 1];

          // only draw follow point when the next object is *not* the start of a new combo
          const nextComboNumber = comboInfoRef.current[i + 1]?.number ?? 0;
          if (nextComboNumber === 1) continue;

          // visible window uses previous *anchor* (slider -> endTime, circle -> time)
          const prevAnchor = (previous.type & 2) && previous.endTime ? previous.endTime : previous.time;
          if (!((prevAnchor - preempt) <= currentMs && currentMs <= next.time)) continue;

          const prevPosRaw = previous.endPos ? previous.endPos : { x: previous.x, y: previous.y };
          const nextPosRaw = { x: next.x, y: next.y };

          const p1 = toScreen(prevPosRaw.x, prevPosRaw.y, playfieldX, playfieldY, playfieldWidth, playfieldHeight);
          const p2 = toScreen(nextPosRaw.x, nextPosRaw.y, playfieldX, playfieldY, playfieldWidth, playfieldHeight);

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 2 * circleRadius) continue;

          const ax = p1.x + (dx / dist) * circleRadius;
          const ay = p1.y + (dy / dist) * circleRadius;
          const bx = p2.x - (dx / dist) * circleRadius;
          const by = p2.y - (dy / dist) * circleRadius;

          const denom = Math.max(1, next.time - prevAnchor);
          const t = (next.time - currentMs) / denom;
          const t2 = clamp(t * 4 - 3, 0, 1);
          const t1 = clamp((prevAnchor - currentMs) / preempt * 4 - 2, 0, 1);

          ctx.lineWidth = 3;
          // avoid rounded end caps which produce a small bright dot where the line meets the circle
          ctx.lineCap = 'butt';
          // restored: stronger white follow‑point like original
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.moveTo(lerp(t2, bx, ax), lerp(t2, by, ay));
          ctx.lineTo(lerp(t1, bx, ax), lerp(t1, by, ay));
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
      }

      // Hit objects rendering (two-pass)
      if (objects.length > 0 && comboInfoRef.current.length > 0) {

        // Hit-object rendering moved to `utils/playfieldRenderObjects.js` — handled by `renderHitObject`.

        // Render passes (sliders then circles)
        for (let i = endIndex - 1; i >= renderStartIndex; i--) {
          const obj = objects[i];
          if (obj.type & 2) {
            renderHitObject(ctx, obj, i, {
              currentMs,
              comboInfo: comboInfoRef.current,
              circleRadius,
              strokeWidth,
              fontSize,
              playfieldX,
              playfieldY,
              playfieldWidth,
              playfieldHeight,
              preempt,
              fadeIn
            });
          }
        }
        for (let i = endIndex - 1; i >= renderStartIndex; i--) {
          const obj = objects[i];
          if (!(obj.type & 2)) {
            renderHitObject(ctx, obj, i, {
              currentMs,
              comboInfo: comboInfoRef.current,
              circleRadius,
              strokeWidth,
              fontSize,
              playfieldX,
              playfieldY,
              playfieldWidth,
              playfieldHeight,
              preempt,
              fadeIn
            });
          }
        }
      }


      // Timeline overlay rendering (keeps original behaviour)
      const tcanvas = timelineCanvasRef?.current;
      if (tcanvas && objects.length > 0 && beatmapData.metadata?.timingPoints && audio.duration > 0) {
        const tctx = tcanvas.getContext('2d');
        renderTimeline(tctx, tcanvas.clientWidth || cssWidth, tcanvas.clientHeight || 80, {
          currentTime: currentMs / 1000,
          timelineScale,
          beatSnapDivisor,
          beatmapData,
          duration: audio.duration,
          objects,
          comboInfo: comboInfoRef.current
        });
      }

      // Frame time metrics (post-render)
      const deltaMS = performance.now() - renderStart.current;
      msQueue.current.push(deltaMS);
      while (msQueue.current.length > 100) msQueue.current.shift();
      if (msQueue.current.length > 0) {
        const weightedSum = msQueue.current.reduce((accm, curr, idx) => accm + curr * ((idx + 1) / msQueue.current.length), 0);
        const divisor = ((1 / msQueue.current.length + 1) * (msQueue.current.length / 2));
        frameTime.current = weightedSum / divisor;
      }

      const smoothing = 0.01;
      fpsDisplayRef.current = fpsDisplayRef.current ? fpsDisplayRef.current + (fps.current - fpsDisplayRef.current) * smoothing : fps.current;
      frameTimeDisplayRef.current = frameTimeDisplayRef.current ? frameTimeDisplayRef.current + (frameTime.current - frameTimeDisplayRef.current) * smoothing : frameTime.current;
      if (renderStart.current - lastMetricsUpdate.current > 100) {
        if (setFpsDisplay) setFpsDisplay(fpsDisplayRef.current);
        if (setFrameTimeDisplay) setFrameTimeDisplay(frameTimeDisplayRef.current);
        lastMetricsUpdate.current = renderStart.current;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    }; // end render

    render();

    return () => {
      isActive = false;
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('resize', repositionTimeline);
      window.removeEventListener('scroll', repositionTimeline, true);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  // re-run render effect when playbackRate changes so the closure sees the new value
  }, [
    canvasRef,
    timelineCanvasRef,
    timelineWrapperRef,
    headerRef,
    audioRef,
    beatmapData,
    backgroundUrl,
    backgroundDim,
    timelineScale,
    beatSnapDivisor,
    isPlayingRef,
    _currentTimeRef,
    previousTimestampRef,
    // newly added
    playbackRate,
    setIsPlaying,
    setCurrentTime,
    setCurrentBPM,
    setCurrentSV,
    setFpsDisplay,
    setFrameTimeDisplay,
    comboInfoRef,
    objectIndexRef,
    showGrid,
    masterVolume
  ]);
}
