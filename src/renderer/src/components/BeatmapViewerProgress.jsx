import { useEffect, useRef } from 'react';

const BeatmapViewerProgress = ({
  duration,
  currentTime,
  beatmapData,
  onSeek // (newTimeSeconds) => void
}) => {
  const progressCanvasRef = useRef(null);
  const progressBarRef = useRef(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    const canvas = progressCanvasRef.current;
    if (!canvas || !duration) return;

    const ctx = canvas.getContext('2d');
    const updateProgressCanvas = () => {
      const width = canvas.parentElement?.clientWidth || canvas.width;
      const height = canvas.parentElement?.clientHeight || 36;
      const DPR = Math.max(1, window.devicePixelRatio || 1);

      canvas.width = Math.round(width * DPR);
      canvas.height = Math.round(height * DPR);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      ctx.clearRect(0, 0, width, height);

      const kiaiSections = beatmapData?.metadata?.kiaiSections || [];
      const breakSections = beatmapData?.metadata?.breakSections || [];
      const timingPoints = beatmapData?.metadata?.timingPoints || [];

      const barHeight = 4; // Match progress line height
      const barY = Math.round(height * 0.5 - barHeight / 2);

      const drawSections = (sections, color, alpha) => {
        if (!sections || sections.length === 0) return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;

        for (const section of sections) {
          const startX = (section.startTime / 1000 / duration) * width;
          const endX = (section.endTime / 1000 / duration) * width;
          const clampedStart = Math.max(0, Math.min(width, startX));
          const clampedEnd = Math.max(0, Math.min(width, endX));
          const rectWidth = clampedEnd - clampedStart;
          if (rectWidth > 0) {
            ctx.fillRect(clampedStart, barY + barHeight + 1, rectWidth, barHeight);
          }
        }
      };

      drawSections(breakSections, '#e2e6f1', 0.45);
      drawSections(kiaiSections, '#ffd978', 0.85);

      const timingPointsOnly = timingPoints.filter(
        tp => tp.beatLength > 0 && tp.uninherited !== false
      );
      const difficultyPoints = beatmapData?.metadata?.difficultyPoints || [];

      const pointMap = new Map();
      for (const tp of timingPointsOnly) {
        const key = Math.round(tp.time);
        const entry = pointMap.get(key) || { time: tp.time, hasTiming: false, hasDifficulty: false };
        entry.hasTiming = true;
        pointMap.set(key, entry);
      }
      for (const dp of difficultyPoints) {
        const key = Math.round(dp.time);
        const entry = pointMap.get(key) || { time: dp.time, hasTiming: false, hasDifficulty: false };
        entry.hasDifficulty = true;
        pointMap.set(key, entry);
      }

      const points = Array.from(pointMap.values()).sort((a, b) => a.time - b.time);

      if (points.length > 0) {
        const tickBottom = Math.max(0, barY - 1);
        const tickTop = Math.max(0, tickBottom - 12);

        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1;

        for (const point of points) {
          const x = (point.time / 1000 / duration) * width;
          if (x < 0 || x > width) continue;

          let color = '#17ff51';
          if (point.hasTiming && point.hasDifficulty) color = '#ff9717';
          else if (point.hasTiming) color = '#ff1749';

          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, tickTop);
          ctx.lineTo(x, tickBottom);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    };

    updateProgressCanvas();
    const handleResize = () => updateProgressCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [beatmapData, duration]);

  // Seek helpers
  const seekFromClientX = (clientX) => {
    const progressBar = progressBarRef.current;
    if (!progressBar || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const padding = 30;
    const effectiveWidth = rect.width - (padding * 2);
    const relativeX = clientX - rect.left - padding;
    const percentage = Math.max(0, Math.min(1, relativeX / effectiveWidth));
    const newTime = percentage * duration;
    if (typeof onSeek === 'function') onSeek(newTime);
  };

  const handlePointerDown = (e) => {
    isSeekingRef.current = true;
    seekFromClientX(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isSeekingRef.current) return;
    seekFromClientX(e.clientX);
  };

  const handlePointerUp = (e) => {
    if (isSeekingRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    isSeekingRef.current = false;
  };

  const progressPercent = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <div
      className="beatmap-viewer__progress"
      ref={progressBarRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: 'pointer', touchAction: 'none' }}
    >
      <div className="beatmap-viewer__progress-track">
        <div className="beatmap-viewer__progress-line" />
        <canvas ref={progressCanvasRef} className="beatmap-viewer__progress-canvas" />
        <div
          className="beatmap-viewer__progress-thumb"
          style={{ left: `${progressPercent * 100}%` }}
        />
      </div>
    </div>
  );
};

export default BeatmapViewerProgress;
