import { toScreen, drawPath, getFollowPosition, getHitScale, colorToRgba, CIRCLE_BORDER_WIDTH, FOLLOW_CIRCLE_FACTOR, FOLLOW_CIRCLE_WIDTH, APPROACH_CIRCLE_SIZE, drawApproachRing } from './playfieldDrawUtils';
import { drawReverseSlider } from './playfieldDrawReverseSlider';

/**
 * Draw a slider (path + inner/outer stroke + follower + repeats)
 */
export function drawSlider(ctx, obj, combo, opts = {}) {
    const {
        currentMs = 0,
        circleRadius = 32,
        playfieldX = 0,
        playfieldY = 0,
        playfieldWidth = 512,
        playfieldHeight = 384,
        preempt = 1200,
        fadeIn = 800,
        alpha = 1
    } = opts;

    // Build points (cumulativeLength available on obj but not used for drawing here)
    let points;
    if (obj.calculatedPath && obj.calculatedPath.length > 0) {
        points = obj.calculatedPath.map(p => ({ x: obj.x + p.x, y: obj.y + p.y }));
    } else {
        points = [{ x: obj.x, y: obj.y }, ...(obj.curvePoints || [])];
    }

    // Convert to screen coords
    const screenPoints = points.map(p => toScreen(p.x, p.y, playfieldX, playfieldY, playfieldWidth, playfieldHeight));

    // Draw slider body
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // outer white stroke
    ctx.globalAlpha = 1; // opacity baked into strokeStyle below
    ctx.beginPath();
    drawPath(ctx, screenPoints);
    ctx.lineWidth = circleRadius * 2;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.stroke();

    // glass-style dark slider body (soft halo + darker core + subtle top highlight)
    const darkCoreAlpha = Math.max(0.36, alpha * 0.6);
    const coreColor = `rgba(11,18,32,${darkCoreAlpha})`;

    // soft blurred halo behind the path
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    drawPath(ctx, screenPoints);
    ctx.lineWidth = circleRadius * 2 * (1 - CIRCLE_BORDER_WIDTH) + 8;
    ctx.strokeStyle = `rgba(11,18,32,${Math.max(0.18, darkCoreAlpha * 0.5)})`;
    ctx.stroke();
    ctx.restore();

    // main dark core
    ctx.beginPath();
    drawPath(ctx, screenPoints);
    ctx.lineWidth = circleRadius * 2 * (1 - CIRCLE_BORDER_WIDTH);
    ctx.strokeStyle = coreColor;
    ctx.stroke();

    // thin glossy highlight along the top of the slider path
    ctx.beginPath();
    drawPath(ctx, screenPoints);
    ctx.lineWidth = Math.max(1, Math.round(circleRadius * 0.12));
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    // thin centerline using combo color for recognizability
    ctx.beginPath();
    drawPath(ctx, screenPoints);
    ctx.lineWidth = Math.max(1, Math.round(circleRadius * 0.22));
    ctx.strokeStyle = colorToRgba(combo?.color || '#ffffff', Math.min(1, alpha));
    ctx.stroke();

    // slider timing + follower
    const sliderDuration = Math.max(200, (obj.endTime && obj.endTime > obj.time) ? (obj.endTime - obj.time) : (obj.length ? obj.length * 2 : 200));
    const timeDiff = obj.time - currentMs;
    const numSlides = obj.slides || 1;

    if (timeDiff <= 0 && timeDiff >= -sliderDuration) {
      const rawProgress = Math.abs(timeDiff) / sliderDuration;
      const totalProgress = rawProgress * numSlides;
      const currentSlide = Math.floor(totalProgress);
      const slideProgress = totalProgress - currentSlide;
      const _ballProgress = Math.max(0, Math.min(1, currentSlide % 2 === 0 ? slideProgress : 1 - slideProgress));

      const worldBall = getFollowPosition(obj, currentMs);
      const ballPos = toScreen(worldBall[0], worldBall[1], playfieldX, playfieldY, playfieldWidth, playfieldHeight);

      const followCircleSize = circleRadius * (1 - CIRCLE_BORDER_WIDTH / 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = circleRadius * CIRCLE_BORDER_WIDTH;
      ctx.beginPath();
      ctx.arc(ballPos.x, ballPos.y, followCircleSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = FOLLOW_CIRCLE_WIDTH;
      ctx.beginPath();
      ctx.arc(ballPos.x, ballPos.y, followCircleSize * FOLLOW_CIRCLE_FACTOR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }

// Draw end circle / reverse arrow / repeat count
if (obj.slides && obj.slides > 1) {
    const endPos = screenPoints[screenPoints.length - 1];
    const secondLast = screenPoints[Math.max(0, screenPoints.length - 2)];
    drawReverseSlider(ctx, endPos, secondLast, obj.slides, circleRadius, combo?.color, alpha);
}

// Start / approach circle (use osu.js-style preempt/fadeIn behavior)
const startPos = toScreen(obj.x, obj.y, playfieldX, playfieldY, playfieldWidth, playfieldHeight);
const approachT = Math.max(0, Math.min(1, (obj.time - currentMs) / preempt));
const approachScale = 1 + approachT * APPROACH_CIRCLE_SIZE;
const approachOpacity = Math.max(0, (currentMs - (obj.time - preempt)) / fadeIn);

// apply same hit-scale used by drawCircle so start circle animates correctly
const hitScale = getHitScale(obj.time, currentMs);
const circleSize = circleRadius * (1 - CIRCLE_BORDER_WIDTH / 2) * hitScale;

if (approachT > 0) {
    drawApproachRing(ctx, startPos.x, startPos.y, circleRadius, approachScale, approachOpacity);
    const borderW = circleRadius * CIRCLE_BORDER_WIDTH;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = combo?.color || '#ffffff';
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, circleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = borderW;
    ctx.stroke();

    if (obj.time - currentMs > -50) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(circleRadius * 0.5 * 1.0)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((opts.number || '')?.toString?.() || '', startPos.x, startPos.y);
    }

    ctx.globalAlpha = 1;
}}