import { DEFAULT_EQ_BANDS } from './eqConstants';

export const EQ_PRESETS = [
  { 
    name: 'Default', 
    bands: DEFAULT_EQ_BANDS.map(b => ({ ...b, gain: 0 })) 
  },
  { 
    name: 'Bass Boost', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [6, 6, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0][i] })) 
  },
  { 
    name: 'Treble Boost', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 6.5, 7, 7, 7][i] })) 
  },
  { 
    name: 'V-Shape', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [6, 5, 4, 2, 0, -2, -3, -2, 0, 2, 4, 5, 6, 6, 6][i] })) 
  },
  { 
    name: 'Vocal Boost', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [0, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0, 0, 0][i] })) 
  },
  { 
    name: 'Rock', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [4, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 5, 5, 5, 5][i] })) 
  },
  { 
    name: 'Pop', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [3, 3, 2, 1, 0, 0, 1, 2, 3, 4, 4, 4, 4, 4, 4][i] })) 
  },
  { 
    name: 'Classical', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [2, 2, 1, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 2][i] })) 
  },
  { 
    name: 'Electronic', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [6, 6, 5, 3, 1, 0, 0, 1, 2, 3, 5, 6, 6, 6, 6][i] })) 
  },
  { 
    name: 'Hip-Hop', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [7, 6, 5, 3, 1, 0, 0, 1, 2, 3, 4, 5, 5, 5, 5][i] })) 
  },
  { 
    name: 'Jazz', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [2, 2, 1, 0, 0, 0, 1, 2, 3, 3, 3, 3, 2, 2, 2][i] })) 
  },
  { 
    name: 'Acoustic', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [2, 2, 1, 0, 1, 2, 3, 3, 3, 2, 2, 2, 2, 2, 2][i] })) 
  },
  { 
    name: 'Lounge', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [-2, -2, -1, 0, 1, 2, 2, 1, 0, -1, -1, -1, -1, -1, -1][i] })) 
  },
  { 
    name: 'Metal', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [6, 6, 5, 3, 1, -1, -2, 0, 2, 4, 6, 7, 7, 7, 7][i] })) 
  },
  { 
    name: 'R&B', 
    bands: DEFAULT_EQ_BANDS.map((b, i) => ({ ...b, gain: [4, 4, 3, 2, 1, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3][i] })) 
  },
];
