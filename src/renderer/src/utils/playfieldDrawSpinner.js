import { toScreen, SPINNER_SIZE, SPINNER_CENTER_SIZE } from './playfieldDrawUtils';

export function drawSpinner(ctx, obj, combo, opts = {}) {
  const {
    currentMs = 0,
    circleRadius = 32,
    playfieldX = 0,
    playfieldY = 0,
    playfieldWidth = 512,
    playfieldHeight = 384,
    preempt: _preempt = 1200,
    fadeIn: _fadeIn = 800,
    alpha = 1
  } = opts;

  const duration = Math.max(1, (obj.endTime && obj.endTime > obj.time) ? (obj.endTime - obj.time) : 1000);
  const remaining = Math.max(0, (obj.endTime || obj.time) - currentMs);
  let scale = Math.max(0, Math.min(1, remaining / duration));
  scale = Math.sqrt(scale);

  const pos = toScreen(obj.x, obj.y, playfieldX, playfieldY, playfieldWidth, playfieldHeight);
  const spinnerStrokeW = Math.max(3, circleRadius * 0.12);

  ctx.globalAlpha = Math.max(0.08, alpha);
  ctx.lineWidth = spinnerStrokeW;
  ctx.strokeStyle = `rgba(255,255,255,${Math.max(0.12, alpha)})`;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, SPINNER_SIZE * scale, 0, Math.PI * 2);
  ctx.stroke();

  // center small ring
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, SPINNER_CENTER_SIZE, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${Math.max(0.12, alpha)})`;
  ctx.lineWidth = Math.max(2, spinnerStrokeW * 0.6);
  ctx.stroke();

  ctx.globalAlpha = 1;
}
