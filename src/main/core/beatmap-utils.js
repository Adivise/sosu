/**
 * Shared beatmap parsing utilities used across core modules.
 * - Extracts timing points / breaks
 * - Builds difficulty points from timing
 * - Computes kiai sections
 * - Helper to find audio files in a folder file list
 * - Parse combo colours from raw .osu content
 */

export function parseTimingPoints(content) {
  const timingPoints = [];
  const lines = content.split(/\r?\n/);
  let inTimingPoints = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    if (trimmed.startsWith('[')) {
      inTimingPoints = trimmed === '[TimingPoints]';
      if (!inTimingPoints && timingPoints.length > 0) break;
      continue;
    }

    if (!inTimingPoints) continue;

    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length < 2) continue;

    const time = parseFloat(parts[0]);
    const beatLength = parseFloat(parts[1]);
    const meters = parts.length >= 3 ? parseInt(parts[2], 10) : undefined;
    const sampleSet = parts.length >= 4 ? parseInt(parts[3], 10) : undefined;
    const sampleIndex = parts.length >= 5 ? parseInt(parts[4], 10) : undefined;
    const sampleVolume = parts.length >= 6 ? parseInt(parts[5], 10) : undefined;
    const uninherited = parts.length >= 7 ? parseInt(parts[6], 10) === 1 : true;
    const effects = parts.length >= 8 ? parseInt(parts[7], 10) : 0;

    if (!Number.isFinite(time) || !Number.isFinite(beatLength)) continue;

    timingPoints.push({
      time,
      beatLength,
      meters,
      sampleSet,
      sampleIndex,
      sampleVolume,
      uninherited,
      effects,
      kiai: (effects & 1) === 1
    });
  }

  return timingPoints;
}

export function parseBreakSections(content) {
  const breaks = [];
  const lines = content.split(/\r?\n/);
  let inEvents = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    if (trimmed.startsWith('[')) {
      inEvents = trimmed === '[Events]';
      if (!inEvents && breaks.length > 0) break;
      continue;
    }

    if (!inEvents) continue;

    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length < 3) continue;

    const eventType = parseInt(parts[0], 10);
    if (eventType !== 2) continue;

    const startTime = parseInt(parts[1], 10);
    const endTime = parseInt(parts[2], 10);

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) continue;
    if (endTime <= startTime) continue;

    breaks.push({ startTime, endTime });
  }

  return breaks;
}

export function buildDifficultyPointsFromTiming(points) {
  return (points || [])
    .filter(tp => tp.uninherited === false && tp.beatLength < 0)
    .map(tp => ({
      time: tp.time,
      sliderVelocity: Math.max(0.1, Math.min(10, -100 / tp.beatLength))
    }));
}

export function computeKiaiSections(timingPoints = [], lastObjectEndTime = 0) {
  const sections = [];
  if (!timingPoints || timingPoints.length === 0) return sections;

  const sortedPoints = [...timingPoints].sort((a, b) => a.time - b.time);
  let kiaiOn = false;
  let kiaiStart = 0;

  for (const tp of sortedPoints) {
    const tpKiai = !!tp.kiai;
    if (tpKiai === kiaiOn) continue;

    if (tpKiai) {
      kiaiStart = tp.time;
    } else if (tp.time > kiaiStart) {
      sections.push({ startTime: kiaiStart, endTime: tp.time });
    }

    kiaiOn = tpKiai;
  }

  if (kiaiOn) {
    const endTime = Math.max(kiaiStart, lastObjectEndTime);
    if (endTime > kiaiStart) sections.push({ startTime: kiaiStart, endTime });
  }

  return sections;
}

export function findAudioFilename(files = [], preferred = null) {
  if (!Array.isArray(files) || files.length === 0) return null;
  const supportedExts = ['.mp3', '.ogg', '.wav', '.flac'];

  if (preferred) {
    const found = files.find(f => f.toLowerCase() === preferred.toLowerCase());
    if (found) return found;
  }

  const fallback = files.find(f => supportedExts.some(ext => f.toLowerCase().endsWith(ext)));
  return fallback || null;
}

export function parseComboColors(content) {
  const comboColors = [];
  const lines = content.split(/\r?\n/);
  let inColours = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('[')) {
      inColours = trimmed === '[Colours]';
      if (!inColours && comboColors.length > 0) break;
      continue;
    }

    if (!inColours) continue;

    const match = trimmed.match(/Combo(\d+)\s*:\s*(\d+),(\d+),(\d+)/);
    if (match) comboColors.push(`rgb(${match[2]},${match[3]},${match[4]})`);
  }

  return comboColors;
}
