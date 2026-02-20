import { useEffect } from 'react';
import { Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { renderTimeline } from '../utils/timelineRenderer';

const BeatmapViewerTimeline = ({
  canvasRef,
  timelineScale,
  setTimelineScale,
  beatSnapDivisor,
  setBeatSnapDivisor,
  currentTime, // seconds
  beatmapData,
  duration, // seconds
  objects = [],
  comboInfo = []
}) => {
  useEffect(() => {
    const tcanvas = canvasRef?.current;
    if (!tcanvas || !objects || objects.length === 0 || !beatmapData?.metadata?.timingPoints || !duration) return;

    const tctx = tcanvas.getContext('2d');
    renderTimeline(tctx, tcanvas.clientWidth || 0, tcanvas.clientHeight || 80, {
      currentTime,
      timelineScale,
      beatSnapDivisor,
      beatmapData,
      duration,
      objects,
      comboInfo
    });

  }, [canvasRef, currentTime, timelineScale, beatSnapDivisor, beatmapData, duration, objects, comboInfo]);

  return (
    <>
      <canvas ref={canvasRef} className="beatmap-viewer__timeline-canvas" />

      <div className="beatmap-viewer__timeline-controls">
        <div className="beatmap-viewer__control-section beatmap-viewer__zoom-section">
          <button
            onClick={() => setTimelineScale(prev => Math.min(1.4, prev + 0.1))}
            className="beatmap-viewer__control-button"
            title="Zoom In"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setTimelineScale(prev => Math.max(0.4, prev - 0.1))}
            className="beatmap-viewer__control-button"
            title="Zoom Out"
          >
            <Minus size={14} />
          </button>
        </div>

        <div className="beatmap-viewer__control-section beatmap-viewer__beatsnap-section">
          <p className="beatmap-viewer__control-label">Beat Snap Divisor</p>
          <div className="beatmap-viewer__control-row">
            <button
              onClick={() => setBeatSnapDivisor(prev => {
                if (prev === 16) return 12;
                if (prev === 12) return 9;
                return Math.max(1, prev - 1);
              })}
              className="beatmap-viewer__control-button"
              title="Decrease Beat Snap"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="beatmap-viewer__control-value">1/{beatSnapDivisor}</span>
            <button
              onClick={() => setBeatSnapDivisor(prev => {
                if (prev === 9) return 12;
                if (prev === 12) return 16;
                return Math.min(16, prev + 1);
              })}
              className="beatmap-viewer__control-button"
              title="Increase Beat Snap"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BeatmapViewerTimeline;
