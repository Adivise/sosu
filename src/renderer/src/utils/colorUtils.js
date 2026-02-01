import { DEFAULT_EQ_BANDS } from '../components/eqConstants';

// Normalize saved EQ data to current band layout (supports migration from older 10-band data)
export function normalizeEqBands(bands) {
  if (!Array.isArray(bands)) return DEFAULT_EQ_BANDS;
  const byFreq = new Map(
    bands
      .filter((b) => b && typeof b.freq === 'number')
      .map((b) => [b.freq, typeof b.gain === 'number' ? b.gain : 0])
  );

  return DEFAULT_EQ_BANDS.map((band) => {
    const gain = byFreq.get(band.freq);
    if (gain === undefined) return { ...band, gain: 0 };
    const clamped = Math.max(-12, Math.min(12, Number(gain)));
    return { ...band, gain: clamped };
  });
}

// Choose black/white text for best contrast against a given hex color
export function getContrastColor(hex) {
  if (!hex) return '#000';
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#000';
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#000' : '#fff';
}

// Utility function to adjust color brightness
export function adjustBrightness(hex, percent) {
  if (!hex) return hex;
  // Remove # if present
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `#${clean}`;

  // Parse hex to RGB
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  // Adjust brightness using multiplier
  const adjust = percent / 100;
  const newR = Math.round(Math.min(255, Math.max(0, r * adjust)));
  const newG = Math.round(Math.min(255, Math.max(0, g * adjust)));
  const newB = Math.round(Math.min(255, Math.max(0, b * adjust)));

  // Convert back to hex
  return (
    '#' +
    [newR, newG, newB]
      .map((x) => {
        const hx = x.toString(16);
        return hx.length === 1 ? '0' + hx : hx;
      })
      .join('')
  );
}
