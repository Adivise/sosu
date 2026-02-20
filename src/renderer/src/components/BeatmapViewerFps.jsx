import React, { useEffect, useRef, useState } from 'react';

const FPS_SMOOTHING = 0.12; // interpolation factor per frame (0-1)
const MS_SMOOTHING = 0.12;

const BeatmapViewerFps = ({ fps = 0, frameTime = 0 }) => {
  const [displayFps, setDisplayFps] = useState(Math.round(fps));
  const [displayMs, setDisplayMs] = useState(Number(frameTime.toFixed(1)));

  const animFps = useRef(displayFps);
  const animMs = useRef(displayMs);
  const rafRef = useRef(null);
  const targetRef = useRef({ fps, frameTime });

  // update targets when props change
  useEffect(() => {
    targetRef.current = { fps, frameTime };
    if (!rafRef.current) {
      let _last = performance.now();
      const loop = () => {
        const { fps: tFps, frameTime: tMs } = targetRef.current;

        // lerp towards target
        animFps.current += (tFps - animFps.current) * FPS_SMOOTHING;
        animMs.current += (tMs - animMs.current) * MS_SMOOTHING;

        // Only update React state if the visible value changed (reduces rerenders)
        const nextF = Math.round(animFps.current);
        const nextM = Number(animMs.current.toFixed(1));
        if (nextF !== displayFps) setDisplayFps(nextF);
        if (nextM !== displayMs) setDisplayMs(nextM);

        // continue loop while there is measurable difference
        const fpsDiff = Math.abs(animFps.current - tFps);
        const msDiff = Math.abs(animMs.current - tMs);
        if (fpsDiff > 0.05 || msDiff > 0.02) {
          rafRef.current = requestAnimationFrame(loop);
        } else {
          // snap to exact target and stop
          animFps.current = tFps;
          animMs.current = tMs;
          setDisplayFps(Math.round(tFps));
          setDisplayMs(Number(tMs.toFixed(1)));
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fps, frameTime]);

  return (
    <div className="beatmap-viewer__fps-counter" aria-hidden>
      <p className="beatmap-viewer__fps-text">{`${displayFps}fps / ${displayMs.toFixed(1)}ms`}</p>
    </div>
  );
};

export default BeatmapViewerFps;