import { drawFilledTriangle } from './playfieldDrawUtils';

/**
 * Draw slider repeat / reverse indicator (end circle + arrow + repeat count)
 * - endPos / secondLast should be in screen coords
 */
export function drawReverseSlider(ctx, endPos, secondLast, slides, circleRadius, color, alpha = 1) {
  const circleSize = circleRadius * (1 - 0.15 / 2); // match CIRCLE_BORDER_WIDTH from original
  const borderW = circleRadius * 0.15; // CIRCLE_BORDER_WIDTH

  ctx.globalAlpha = alpha;
  ctx.fillStyle = color || '#ffffff';
  ctx.beginPath();
  ctx.arc(endPos.x, endPos.y, circleSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = borderW;
  ctx.stroke();

  const dx = endPos.x - secondLast.x;
  const dy = endPos.y - secondLast.y;
  // compute rotation so the local left-pointing triangle points *back* along the path
  const angle = Math.atan2(dy, dx); // rotate by path angle — local (-x) becomes path-PI (i.e. backwards)

  // Draw a filled triangle using shared helper (keeps playfield & timeline consistent)
  const triW = Math.max(8, Math.floor(circleRadius * 0.9));
  const triH = Math.max(8, Math.floor(circleRadius * 0.7));
  drawFilledTriangle(ctx, endPos.x, endPos.y, triW, triH, angle, 'rgba(255,255,255,0.95)');

  // NOTE: repeat-count text intentionally removed on playfield (user requested)

}
