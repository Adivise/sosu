/**
 * Pure helpers for playfield drawing logic.
 * - Keep pure / testable pieces extracted from the render loop.
 */

// Rendering constants shared by playfield drawers
export const CIRCLE_BORDER_WIDTH = 0.15;
export const CIRCLE_HIT_FACTOR = 1.33;
export const CIRCLE_HIT_DURATION = 150;
export const APPROACH_CIRCLE_WIDTH = 0.09;
export const APPROACH_CIRCLE_SIZE = 4;
export const FOLLOW_CIRCLE_FACTOR = 2;
export const FOLLOW_CIRCLE_WIDTH = 3;
export const SPINNER_SIZE = 180;
export const SPINNER_CENTER_SIZE = 10;

/** Convert various color formats to `rgba(r,g,b,a)` */
export function colorToRgba(col, alpha = 1) {
  if (!col) return `rgba(255,255,255,${alpha})`;
  if (col.startsWith('rgba(')) {
    const parts = col.replace(/^rgba\(|\)$/g, '').split(',').slice(0, 3).join(',');
    return `rgba(${parts},${alpha})`;
  }
  if (col.startsWith('rgb(')) return col.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
  const hex = col.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function getHitScale(objTime, time) {
  if (time <= objTime) return 1;
  const t = (time - objTime) / CIRCLE_HIT_DURATION;
  return 1 - t + t * CIRCLE_HIT_FACTOR;
}

/**
 * Convert osu! playfield coordinates to screen coordinates.
 * @param {number} osuX
 * @param {number} osuY
 * @param {number} playfieldX
 * @param {number} playfieldY
 * @param {number} playfieldWidth
 * @param {number} playfieldHeight
 * @returns {{x:number,y:number}}
 */
export function toScreen(osuX, osuY, playfieldX, playfieldY, playfieldWidth, playfieldHeight) {
  return {
    x: playfieldX + (osuX / 512) * playfieldWidth,
    y: playfieldY + (osuY / 384) * playfieldHeight
  };
}

/**
 * Draw a path (array of {x,y}) on provided context. Preserves original behaviour.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number}[]} points
 */
export function drawPath(ctx, points) {
  if (!points || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

/**
 * Draw an approach circle/ring used by both hit circles and sliders.
 * - x,y are screen coordinates
 * - approachScale is the computed scale factor for the approach ring
 * - approachOpacity controls ring alpha
 */
export function drawApproachRing(ctx, x, y, circleRadius, approachScale, approachOpacity) {
  if (approachOpacity <= 0) return;
  ctx.lineWidth = circleRadius * APPROACH_CIRCLE_WIDTH;
  ctx.strokeStyle = `rgba(255,255,255,${approachOpacity})`; // approach ring intentionally white
  ctx.beginPath();
  ctx.arc(x, y, circleRadius * approachScale, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw a filled isosceles triangle centered at (cx,cy).
 * - width/height are in pixels, angle is rotation in radians (0 = pointing right)
 */
export function drawFilledTriangle(ctx, cx, cy, width, height, angle = Math.PI, fillStyle = 'rgba(255,255,255,0.95)') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = fillStyle;
  const halfW = Math.round(width * 0.5);
  const halfH = Math.round(height * 0.5);
  ctx.beginPath();
  ctx.moveTo(-halfW, 0); // tip pointing left in local coords
  ctx.lineTo(halfW, -halfH);
  ctx.lineTo(halfW, halfH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a reverse-arrow (used on playfield & timeline).
 * - angle: direction the arrow points (radians). On playfield it's aligned to the path,
 *   on timeline we pass a fixed left-pointing angle if needed.
 * - alpha: opacity for the stroke
 * - strokeWidth is optional; if omitted it's derived from circleRadius.
 */
export function drawReverseArrow(ctx, cx, cy, circleRadius, angle = Math.PI, alpha = 1, strokeWidth) {
  const arrowSize = circleRadius * 0.6;
  const arrowAngle = Math.PI / 6;
  const strokeW = strokeWidth !== undefined ? strokeWidth : Math.max(1, Math.round(circleRadius * 0.12));

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const half = arrowSize * 0.5;
  const sx = cx + Math.cos(angle) * half;
  const sy = cy + Math.sin(angle) * half;
  const ex = cx - Math.cos(angle) * half;
  const ey = cy - Math.sin(angle) * half;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);

  const finLen = arrowSize * 0.45;
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - Math.cos(angle - arrowAngle) * finLen, ey - Math.sin(angle - arrowAngle) * finLen);
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - Math.cos(angle + arrowAngle) * finLen, ey - Math.sin(angle + arrowAngle) * finLen);
  ctx.stroke();
}

// --- Port of osu.js follow-position helpers (adapted to our object shape) ---
const lerp = (t, a, b) => (1 - t) * a + t * b;
const lerper = t => (a, b) => lerp(t, a, b);
const zip = (fn, ...arrs) => {
  const len = Math.max(...(arrs.map(e => e.length)));
  const result = [];
  for (let i = 0; i < len; i += 1) result.push(fn(...arrs.map(e => e[i])));
  return result;
};
const lerperVector = t => (a, b) => zip(lerper(t), a, b);

const bezierAt = (t, points) => {
  if (points.length === 1) return points[0];
  const starts = points.slice(0, -1);
  const ends = points.slice(1);
  return bezierAt(t, zip(lerperVector(t), starts, ends));
};

/**
 * Compute follow position (slider ball / follow circle) for a slider object.
 * - Accepts our parser object shape (obj.x,obj.y,obj.curveType,obj.curvePoints,obj.calculatedPath,obj.cumulativeLength,obj.length,obj.time,obj.endTime,obj.slides)
 * - Returns absolute playfield coordinates [x,y]
 */
export function getFollowPosition(obj, timeMs) {
  // Start position
  let x = obj.x;
  let y = obj.y;

  // Slider duration (ms) — total duration across all repeats
  const duration = (obj.endTime && obj.endTime > obj.time) ? (obj.endTime - obj.time) : Math.max(200, (obj.length || 0) * 2);
  const slides = Math.max(1, obj.slides || 1);
  const elapsed = Math.max(0, Math.min(duration, timeMs - obj.time));
  const rawProgress = (elapsed / duration) * slides; // 0 .. slides
  const currentSlide = Math.floor(rawProgress);
  const slideProgress = rawProgress - currentSlide;
  const t = (currentSlide % 2 === 0) ? slideProgress : 1 - slideProgress;

  // If we have a precomputed path + cumulative lengths, use distance sampling (best accuracy)
  if (obj.calculatedPath && obj.calculatedPath.length > 0 && obj.cumulativeLength && obj.cumulativeLength.length > 0 && obj.length > 0) {
    const targetDist = t * obj.length;
    const cum = obj.cumulativeLength;
    let segmentIndex = 0;
    while (segmentIndex < cum.length && cum[segmentIndex] < targetDist) segmentIndex++;
    const pts = obj.calculatedPath.map(p => ({ x: obj.x + p.x, y: obj.y + p.y }));
    if (segmentIndex === 0) return [pts[0].x, pts[0].y];
    if (segmentIndex >= cum.length) return [pts[pts.length - 1].x, pts[pts.length - 1].y];
    const d0 = cum[segmentIndex - 1];
    const d1 = cum[segmentIndex];
    const w = (d1 - d0) < 0.001 ? 0 : (targetDist - d0) / (d1 - d0);
    const p0 = pts[segmentIndex - 1];
    const p1 = pts[segmentIndex];
    return [p0.x + (p1.x - p0.x) * w, p0.y + (p1.y - p0.y) * w];
  }

  // No precomputed path — fallback to control points math (port of osu.js logic)
  const type = (obj.curveType || 'L');
  if (type === 'L') {
    // Linear: move from start toward first control point by distance proportion
    const cp = (obj.curvePoints && obj.curvePoints.length > 0) ? obj.curvePoints[0] : null;
    if (cp) {
      const cx = cp.x !== undefined ? cp.x : cp[0];
      const cy = cp.y !== undefined ? cp.y : cp[1];
      const dx = cx - x;
      const dy = cy - y;
      const length = Math.hypot(dx, dy) || 1;
      const x2 = x + dx * ((obj.length || length) / length);
      const y2 = y + dy * ((obj.length || length) / length);
      x = x * (1 - t) + x2 * t;
      y = y * (1 - t) + y2 * t;
    }
  } else if (type === 'B') {
    // Bezier: create sampled bezierPoints and walk distance
    const points = [];
    // Build buffer of points: start + control points (curvePoints may be absolute coords)
    if (obj.curvePoints && obj.curvePoints.length > 0) {
      for (let i = 0; i < obj.curvePoints.length; i++) {
        const cur = obj.curvePoints[i];
        points.push([cur.x !== undefined ? cur.x : cur[0], cur.y !== undefined ? cur.y : cur[1]]);
      }
    }
    // Prepend start
    let buffer = [[x, y]];
    const divisions = Math.min(64, Math.ceil(500 / Math.max(1, (points.length || 1))));
    const bezierPoints = [];
    for (let i = 0; i < points.length; i += 1) {
      const cur = points[i];
      const [cx, cy] = cur;
      const [px, py] = buffer[buffer.length - 1];
      if (cx === px && cy === py) {
        for (let j = 0; j <= divisions; j += 1) bezierPoints.push(bezierAt(j / divisions, buffer));
        buffer = [[cx, cy]];
      } else {
        buffer.push([cx, cy]);
      }
    }
    for (let j = 0; j <= divisions; j += 1) bezierPoints.push(bezierAt(j / divisions, buffer));

    // Walk along bezierPoints to find t*distance position
    let totalLen = 0;
    const segs = [];
    for (let i = 1; i < bezierPoints.length; i++) {
      const [x1, y1] = bezierPoints[i - 1];
      const [x2, y2] = bezierPoints[i];
      const len = Math.hypot(x2 - x1, y2 - y1);
      segs.push(len);
      totalLen += len;
    }
    const target = t * (obj.length || totalLen);
    let acc = 0;
    for (let i = 1; i < bezierPoints.length; i++) {
      const segLen = segs[i - 1];
      const [x1, y1] = bezierPoints[i - 1];
      const [x2, y2] = bezierPoints[i];
      if (acc + segLen >= target) {
        const w = segLen > 0 ? (target - acc) / segLen : 0;
        return [x1 + (x2 - x1) * w, y1 + (y2 - y1) * w];
      }
      acc += segLen;
    }
    // fallback to last point
    const last = bezierPoints[bezierPoints.length - 1];
    return [last[0], last[1]];
  } else if (type === 'P') {
    // Perfect (arc) between start (A), points[0] (B) and points[1] (C)
    const points = obj.curvePoints || [];
    if (points.length >= 2) {
      const B = points[0];
      const C = points[1];
      const A = { x, y };
      const Bx = B.x !== undefined ? B.x : B[0];
      const By = B.y !== undefined ? B.y : B[1];
      const Cx = C.x !== undefined ? C.x : C[0];
      const Cy = C.y !== undefined ? C.y : C[1];

      const yDeltaA = By - A.y;
      const xDeltaA = Bx - A.x;
      const yDeltaB = Cy - By;
      const xDeltaB = Cx - Bx;

      const aSlope = yDeltaA / xDeltaA;
      const bSlope = yDeltaB / xDeltaB;
      const centerX = (aSlope * bSlope * (A.y - C.y) + bSlope * (A.x + Bx)
        - aSlope * (Bx + Cx)) / (2 * (bSlope - aSlope));
      const centerY = -1 * (centerX - (A.x + Bx) / 2) / aSlope + (A.y + By) / 2;
      const radius = Math.sqrt((centerX - x) * (centerX - x) + (centerY - y) * (centerY - y));
      const angleA = Math.atan2(A.y - centerY, A.x - centerX);
      const angleC = Math.atan2(Cy - centerY, Cx - centerX);

      const anticlockwise = (xDeltaB * yDeltaA - xDeltaA * yDeltaB) > 0;
      const startAngle = angleA;
      let endAngle = angleC;
      if (!anticlockwise && (endAngle - startAngle) < 0) endAngle += 2 * Math.PI;
      if (anticlockwise && (endAngle - startAngle) > 0) endAngle -= 2 * Math.PI;
      return [centerX + radius * Math.cos(startAngle + (endAngle - startAngle) * t), centerY + radius * Math.sin(startAngle + (endAngle - startAngle) * t)];
    }
  }

  return [x, y];
}
