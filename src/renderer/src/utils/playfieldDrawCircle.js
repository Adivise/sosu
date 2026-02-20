import { toScreen, getHitScale, CIRCLE_BORDER_WIDTH, APPROACH_CIRCLE_SIZE, drawApproachRing } from './playfieldDrawUtils';

/**
 * Draw a regular hit circle (approach ring + main circle + number)
 */
export function drawCircle(ctx, obj, combo, opts = {}) {
  const {
    currentMs = 0,
    circleRadius = 32,
    fontSize = 12,
    playfieldX = 0,
    playfieldY = 0,
    playfieldWidth = 512,
    playfieldHeight = 384,
    preempt = 1200,
    fadeIn = 800,
    alpha = 1
  } = opts;

  const color = combo?.color || '#ffffff';
  const number = combo?.number || 1;

  const pos = toScreen(obj.x, obj.y, playfieldX, playfieldY, playfieldWidth, playfieldHeight);
  const x = pos.x;
  const y = pos.y;

  // approach ring
  const approachT = Math.max(0, Math.min(1, (obj.time - currentMs) / preempt));
  const approachScale = 1 + approachT * APPROACH_CIRCLE_SIZE;
  const approachOpacity = Math.max(0, (currentMs - (obj.time - preempt)) / fadeIn);
  if (approachT > 0) {
    drawApproachRing(ctx, x, y, circleRadius, approachScale, approachOpacity);
  }

  // Apply osu.js hit-scale on main circle
  const hitScale = getHitScale(obj.time, currentMs);
  const circleSize = circleRadius * (1 - CIRCLE_BORDER_WIDTH / 2) * hitScale;
  const borderW = circleRadius * CIRCLE_BORDER_WIDTH;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, circleSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = borderW;
  ctx.stroke();

  // Show combo number for the circle (match original behavior: visible while object is visible, not only just before hit)
  const timeDiff = obj.time - currentMs;
  if (timeDiff > -50) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), x, y);
  }

  ctx.globalAlpha = 1;
}
