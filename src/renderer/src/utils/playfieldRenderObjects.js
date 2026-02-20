import { CIRCLE_HIT_DURATION } from './playfieldDrawUtils';
import { drawCircle } from './playfieldDrawCircle';
import { drawSlider } from './playfieldDrawSlider';
import { drawSpinner } from './playfieldDrawSpinner';

/**
 * Draw a single hit object (circle or slider) on the playfield canvas.
 * This extracts the previous `renderObject` implementation into a reusable module.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} obj - hitobject from beatmap
 * @param {number} idx - object index
 * @param {object} opts - rendering context/options
 *   - currentMs, comboInfo, circleRadius, strokeWidth, fontSize,
 *     playfieldX, playfieldY, playfieldWidth, playfieldHeight
 */
export function renderHitObject(ctx, obj, idx, opts = {}) {
  const {
    currentMs,
    comboInfo = [],
    circleRadius = 32,
    strokeWidth: _strokeWidth = 4,
    fontSize = 12,
    playfieldX = 0,
    playfieldY = 0,
    playfieldWidth = 512,
    playfieldHeight = 384,
      // timing/approach params (from beatmap AR)
    preempt = 1200,
    fadeIn = 800
  } = opts;

  const _timeDiff = obj.time - currentMs;
  const isSlider = obj.type & 2;
  const _sliderDuration = isSlider
    ? Math.max(200, (obj.endTime && obj.endTime > obj.time) ? (obj.endTime - obj.time) : (obj.length ? obj.length * 2 : 200))
    : 0;

  // Visible window per-object (supports circles, sliders, spinners):
  // - appear at (obj.time - preempt)
  // - remain through obj.endTime (if present)
  // - fade out after obj.endTime for CIRCLE_HIT_DURATION
  const visibleStart = obj.time - preempt;
  const visibleEnd = (obj.endTime || obj.time) + CIRCLE_HIT_DURATION;
  if (currentMs < visibleStart || currentMs > visibleEnd) return;

  const combo = comboInfo[idx] || { color: '#ffffff', number: 1 };
  const _color = combo.color;
  const number = combo.number;

  // Opacity behavior:
  // - fade in from (obj.time - preempt) over `fadeIn`
  // - remain fully visible through obj.endTime (for sliders this includes full duration)
  // - fade out after obj.endTime over CIRCLE_HIT_DURATION
  const getObjectOpacity = (o, timeMs) => {
    const appearStart = o.time - preempt;
    if (timeMs < appearStart) return 0;
    if (timeMs > (o.endTime || o.time)) {
      const over = timeMs - (o.endTime || o.time);
      return Math.max(0, 1 - over / CIRCLE_HIT_DURATION);
    }
    // fade-in progress
    return Math.max(0, Math.min(1, (timeMs - appearStart) / fadeIn));
  };

  const alpha = getObjectOpacity(obj, currentMs);

  // Delegate to specialized drawer modules (keeps renderHitObject small & testable)
  if (isSlider && (obj.curvePoints || (obj.calculatedPath && obj.calculatedPath.length))) {
    // pass `combo` as the third arg and `opts` (including number) as the fourth arg
    drawSlider(ctx, obj, combo, { currentMs, circleRadius, fontSize, playfieldX, playfieldY, playfieldWidth, playfieldHeight, preempt, fadeIn, alpha, number });
    return;
  }

  // Spinner
  if (obj.type & 8) {
    drawSpinner(ctx, obj, combo, { currentMs, circleRadius, playfieldX, playfieldY, playfieldWidth, playfieldHeight, preempt, fadeIn, alpha });
    return;
  }

  // Regular hit circle
  drawCircle(ctx, obj, { color: combo.color, number: combo.number }, { currentMs, circleRadius, fontSize, playfieldX, playfieldY, playfieldWidth, playfieldHeight, preempt, fadeIn, alpha });
}
