import { drawFilledTriangle } from './playfieldDrawUtils';

/**
 * Centralized timeline canvas renderer.
 * - Extracted from `BeatmapViewerTimeline.jsx` + `usePlayfieldRenderer.js` to avoid duplication.
 * - Expects CSS-sized width/height (not DPR-scaled) and a normal 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} tctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {object} opts
 * @param {number} opts.currentTime   Seconds
 * @param {number} opts.timelineScale
 * @param {number} opts.beatSnapDivisor
 * @param {object} opts.beatmapData
 * @param {number} opts.duration      Seconds
 * @param {Array}  opts.objects       Hit objects
 * @param {Array}  opts.comboInfo     Combo info array (optional)
 */
export function renderTimeline(tctx, canvasWidth, canvasHeight, opts = {}) {
  const {
    currentTime = 0,
    timelineScale = 1,
    beatSnapDivisor = 4,
    beatmapData = null,
    duration = 0,
    objects = [],
    comboInfo = []
  } = opts;

  if (!tctx || !objects || objects.length === 0 || !beatmapData?.metadata?.timingPoints || !duration) return;

  const timelineHeight = canvasHeight || 80;
  const timelineY = 0;
  const timelineWidth = canvasWidth || 0;

  // Clear overlay first (wrapper provides translucent background — no canvas fill)
  tctx.clearRect(0, 0, timelineWidth, timelineHeight);

  const currentMs = currentTime * 1000;
  const centerX = timelineWidth / 2;

  const beatLineColors = {
    1: '#ffffff',
    2: '#ff0000',
    3: '#b706b7',
    4: '#3276e6',
    5: '#e6e605',
    6: '#843e84',
    8: '#e6e605',
    12: '#e6e605',
    16: '#e6e605'
  };

  // derive accent color from CSS variable so timeline visuals match UI accent
  const _getAccent = () => {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#b565e1';
    } catch (e) {
      return '#b565e1';
    }
  };
  const accentColor = _getAccent();

  const hexToRgba = (hex, alpha = 1) => {
    if (!hex) return null;
    let h = hex.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const accentRgba = hexToRgba(accentColor, 0.9) || '#b565e1';

  const timelineRange = (timelineWidth / 2) * (1 / timelineScale) + 120;
  const startBound = currentMs - timelineRange;
  const endBound = currentMs + timelineRange;

  const timingPoints = (beatmapData.metadata.timingPoints || [])
    .filter(tp => tp.beatLength > 0 && tp.uninherited !== false)
    .sort((a, b) => a.time - b.time);

  // Find current timing point (uninherited only)
  let currentTimingPoint = timingPoints[0];
  for (const tp of timingPoints) {
    if (tp.time <= currentMs) {
      currentTimingPoint = tp;
    } else break;
  }

  if (currentTimingPoint && currentTimingPoint.beatLength > 0) {
    const beatLength = currentTimingPoint.beatLength;
    const startTime = currentTimingPoint.time;
    const timeSignature = currentTimingPoint.timeSignature || 4;

    const nearestBeat = startTime + beatLength * Math.ceil((currentMs - startTime) / beatLength);

    tctx.lineWidth = 1;

    const drawBeatLine = (time) => {
      const x = centerX + (time - currentMs) * timelineScale;

      // Check if it's a whole beat
      const isWholeBeat = Math.round(time - (Math.round((time - startTime) / beatLength) * beatLength + startTime)) === 0;

      // Check if it's a dominant beat (start of measure)
      const isDominant = isWholeBeat && Math.round((time - startTime) / beatLength) % timeSignature === 0;

      let color = '#ffffff';
      let lineHeight = 52; // slightly longer lines
      let startY = timelineY + (timelineHeight - lineHeight) / 2; // Centered

      if (!isWholeBeat) {
        const nearestWholeBeat = Math.floor((time - startTime) / beatLength) * beatLength + startTime;
        const distance = time - nearestWholeBeat;
        const idx = Math.round(distance / (beatLength / beatSnapDivisor));

        // Calculate denominator using GCD
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const denominator = beatSnapDivisor / gcd(beatSnapDivisor, idx);

        color = beatLineColors[denominator] || '#929292';
        lineHeight = isDominant ? 52 : 40; // increase non-dominant length
        startY = timelineY + (timelineHeight - lineHeight) / 2;
      } else {
        lineHeight = isDominant ? 52 : 40;
        startY = timelineY + (timelineHeight - lineHeight) / 2;
      }

      tctx.strokeStyle = color;
      tctx.beginPath();
      tctx.moveTo(x, startY);
      tctx.lineTo(x, startY + lineHeight);
      tctx.stroke();
    };

    // Draw forward
    let currentPoint = nearestBeat;
    while (currentPoint <= endBound) {
      drawBeatLine(currentPoint);
      currentPoint += beatLength / beatSnapDivisor;
    }

    // Draw backward
    currentPoint = nearestBeat - beatLength / beatSnapDivisor;
    while (currentPoint >= startBound) {
      drawBeatLine(currentPoint);
      currentPoint -= beatLength / beatSnapDivisor;
    }
  }

  // Draw BPM and SV labels at control point positions
  const timingPointsOnly = timingPoints;
  const difficultyPoints = beatmapData?.metadata?.difficultyPoints || [];

  const controlPointMap = new Map();

  for (const tp of timingPointsOnly) {
    if (tp.time >= startBound && tp.time <= endBound) {
      const key = Math.round(tp.time);
      const entry = controlPointMap.get(key) || { time: tp.time, bpm: null, sv: null };
      if (tp.beatLength > 0) {
        entry.bpm = Math.round(60000 / tp.beatLength);
      }
      controlPointMap.set(key, entry);
    }
  }

  for (const dp of difficultyPoints) {
    if (dp.time >= startBound && dp.time <= endBound && Number.isFinite(dp.sliderVelocity)) {
      const key = Math.round(dp.time);
      const entry = controlPointMap.get(key) || { time: dp.time, bpm: null, sv: null };
      entry.sv = dp.sliderVelocity;
      controlPointMap.set(key, entry);
    }
  }

  // Draw labels for each control point
  tctx.font = 'bold 11px Arial';
  const labelPadding = 8;
  const labelHeight = 18;

  const labels = [];

  for (const point of controlPointMap.values()) {
    const x = centerX + (point.time - currentMs) * timelineScale;
    if (x < 50 || x > timelineWidth - 50) continue;

    if (point.bpm !== null) {
      labels.push({ x, text: `${point.bpm}BPM`, color: '#e15565', time: point.time });
    }
    if (point.sv !== null && Math.abs(point.sv - 1.0) > 0.001) {
      labels.push({ x, text: `${point.sv.toFixed(2)}x`, color: accentRgba, time: point.time });
    }
  }

  for (const label of labels) {
    const isBPM = label.text.includes('BPM');

    if (isBPM) {
      tctx.font = 'bold 11px Arial';
      const textWidth = tctx.measureText(label.text).width;
      const labelWidth = textWidth + labelPadding * 2;
      const labelX = label.x - labelWidth / 2;
      const labelY = timelineY + timelineHeight - labelHeight;

      tctx.globalAlpha = 0.3;
      tctx.strokeStyle = '#ffffff';
      tctx.lineWidth = 1;
      tctx.beginPath();
      tctx.moveTo(label.x, timelineY);
      tctx.lineTo(label.x, labelY);
      tctx.stroke();

      tctx.globalAlpha = 1;
      tctx.fillStyle = label.color;
      tctx.fillRect(labelX, labelY, labelWidth, labelHeight);

      tctx.fillStyle = '#ffffff';
      tctx.textAlign = 'center';
      tctx.textBaseline = 'middle';
      tctx.fillText(label.text, label.x, labelY + labelHeight / 2);
      tctx.textAlign = 'left';
    } else {
      tctx.globalAlpha = 0.3;
      tctx.strokeStyle = '#ffffff';
      tctx.lineWidth = 1;
      tctx.beginPath();
      tctx.moveTo(label.x, timelineY + labelHeight);
      tctx.lineTo(label.x, timelineY + timelineHeight);
      tctx.stroke();

      tctx.globalAlpha = 1;
      tctx.fillStyle = label.color;
      tctx.textAlign = 'center';
      tctx.textBaseline = 'top';
      tctx.fillText(label.text, label.x, timelineY + 3);
      tctx.textAlign = 'left';
    }
  }

  // Draw hit objects as circles on timeline
  tctx.globalAlpha = 0.9;
  const objectRadius = 20;
  const barHeight = objectRadius * 2;

  const times = objects.map(o => o.time);
  const findFirstIndex = (target) => {
    let lo = 0;
    let hi = times.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const findLastIndex = (target) => {
    let lo = 0;
    let hi = times.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const TIMELINE_BUFFER_MS = 5000; // preload 5s before/after visible window for long objects (spinners/sliders)
  let timelineStartIndex = findFirstIndex(startBound - TIMELINE_BUFFER_MS);
  let timelineEndIndex = findLastIndex(endBound + TIMELINE_BUFFER_MS);

  // Include objects that started earlier but are still active into the visible window
  while (timelineStartIndex > 0) {
    const prev = objects[timelineStartIndex - 1];
    const prevEnd = (prev && (prev.endTime || prev.time)) || 0;
    if (prevEnd >= (startBound - TIMELINE_BUFFER_MS)) timelineStartIndex--; else break;
  }

  for (let i = timelineEndIndex - 1; i >= timelineStartIndex; i--) {
    const obj = objects[i];
    const startTime = obj.time;
    const endTime = obj.endTime || startTime;
    const objDuration = endTime - startTime;

    const x = centerX + (startTime - currentMs) * timelineScale;
    const endX = centerX + (endTime - currentMs) * timelineScale;

    const isVisible = (x + objectRadius > 0 && x - objectRadius < timelineWidth) ||
                      (endX + objectRadius > 0 && endX - objectRadius < timelineWidth) ||
                      (x < 0 && endX > timelineWidth);

    if (!isVisible) continue;

    const color = comboInfo[i]?.color || '#ffffff';
    const centerY = timelineY + timelineHeight / 2;

    // TOP-BAR MARKERS: small neutral markers (osu!-style — no colored accents)
    const topMarkerY = timelineY + 4; // small inset from top
    const topMarkerH = 6;
    if (obj.type & 8) {
      const mx = Math.round(centerX + (startTime - currentMs) * timelineScale);
      if (mx > 0 && mx < timelineWidth) {
        tctx.fillStyle = '#cdd6f4';
        tctx.fillRect(mx - 1, topMarkerY + 1, 2, topMarkerH - 2);
      }
    }
    // note: reverse-slider top marker intentionally removed (use end-circle arrow instead)


    if (objDuration > 50) {
      const barStartX = Math.max(0, x);
      const barEndX = Math.min(timelineWidth, endX);
      const barWidth = barEndX - barStartX;
      if (barWidth > 0) {
        tctx.globalAlpha = 0.7;
        tctx.fillStyle = color;
        tctx.fillRect(barStartX, centerY - barHeight / 2, barWidth, barHeight);
        tctx.globalAlpha = 0.9;
      }

      if (endX >= objectRadius && endX <= timelineWidth - objectRadius) {
        // Don't draw an end circle for spinners — skip if spinner
        if (!(obj.type & 8)) {
          tctx.fillStyle = color;
          tctx.beginPath();
          tctx.arc(endX, centerY, objectRadius, 0, Math.PI * 2);
          tctx.fill();

          tctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          tctx.lineWidth = 2;
          tctx.stroke();
        }
        // Reverse slider (repeat) — draw repeat ticks along bar + repeat count at end
        if (obj.slides && obj.slides > 1) {
          const repeats = obj.slides - 1;
          // brighter ticks + larger height for visibility
          tctx.strokeStyle = 'rgba(255,255,255,0.95)';
          tctx.lineWidth = 2.5;
          const tickH = Math.max(8, barHeight / 2.5);
          for (let r = 1; r <= repeats; r++) {
            const rt = startTime + (r / obj.slides) * (endTime - startTime);
            const rx = centerX + (rt - currentMs) * timelineScale;
            if (rx < 0 || rx > timelineWidth) continue;
            tctx.beginPath();
            tctx.moveTo(rx, centerY - tickH / 2);
            tctx.lineTo(rx, centerY + tickH / 2);
            tctx.stroke();
          }
            // Draw large left-pointing triangle (use shared helper)
            const triW = Math.max(8, Math.floor(objectRadius * 0.9));
            const triH = Math.max(8, Math.floor(objectRadius * 0.7));
            drawFilledTriangle(tctx, endX, centerY, triW, triH, Math.PI, 'rgba(255,255,255,0.95)');

            // draw repeat count as text under end circle (restored)
            tctx.globalAlpha = 1;
            tctx.fillStyle = '#ffffff';
            tctx.font = `bold ${Math.floor(objectRadius * 0.65)}px Arial`;
            tctx.textAlign = 'center';
            tctx.textBaseline = 'top';
            tctx.fillText(`${repeats}x`, endX, centerY + objectRadius + 6);

          //console.log('[Timeline] reverse slider idx=', i, 'slides=', obj.slides);
        }
      }
    }

    if (x >= objectRadius && x <= timelineWidth - objectRadius) {
      tctx.fillStyle = color;
      tctx.beginPath();
      tctx.arc(x, centerY, objectRadius, 0, Math.PI * 2);
      tctx.fill();

      tctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      tctx.lineWidth = 2;
      tctx.stroke();

        // Draw combo number for regular objects; for spinners show a small 'spokes' icon instead
        const comboNumber = comboInfo[i]?.number || 1;
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';

        if (obj.type & 8) {
          // Spinner: draw a subtle nested inner circle inside the object circle (no number)
          const innerR = Math.max(6, Math.round(objectRadius * 0.45));
          tctx.fillStyle = 'rgb(255, 255, 255)';
          tctx.beginPath();
          tctx.arc(x, centerY, innerR, 0, Math.PI * 2);
          tctx.fill();

          // subtle inner ring highlight for contrast
          tctx.strokeStyle = 'rgba(255,255,255,0.08)';
          tctx.lineWidth = 1;
          tctx.beginPath();
          tctx.arc(x, centerY, innerR + 1, 0, Math.PI * 2);
          tctx.stroke();
        } else {
          // Regular objects: show combo number inside the circle
          tctx.font = `bold ${objectRadius}px Arial`;
          tctx.fillStyle = '#ffffff';
          tctx.fillText(comboNumber.toString(), x, centerY);
        }
    }
  }

  tctx.globalAlpha = 1;

  // Draw center line (playback position)
  tctx.strokeStyle = '#cdd6f4';
  tctx.lineWidth = 2;
  tctx.beginPath();
  tctx.moveTo(centerX, timelineY);
  tctx.lineTo(centerX, timelineY + timelineHeight);
  tctx.stroke();

  tctx.fillStyle = '#cdd6f4';
  tctx.beginPath();
  tctx.moveTo(centerX - 3, timelineY);
  tctx.lineTo(centerX, timelineY + 3);
  tctx.lineTo(centerX + 3, timelineY);
  tctx.fill();

  tctx.beginPath();
  tctx.moveTo(centerX - 3, timelineY + timelineHeight);
  tctx.lineTo(centerX, timelineY + timelineHeight - 3);
  tctx.lineTo(centerX + 3, timelineY + timelineHeight);
  tctx.fill();
}
