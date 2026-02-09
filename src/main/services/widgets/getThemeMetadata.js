import fs from 'fs';
import path from 'path';
import { widgetThemesPath } from '../../config/paths.js';

export function getThemeMetadata(name) {
  const metaPath = path.join(widgetThemesPath, name, 'metadata.json');
  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      const meta = JSON.parse(raw);
      const getKey = (k) => meta[k] ?? meta[k[0].toUpperCase() + k.slice(1)] ?? null;
      return {
        name: getKey('name') || name,
        version: getKey('version') || '1.0.0',
        author: getKey('author') || 'Unknown',
        resolution: getKey('resolution') || '500x150',
        authorLinks: getKey('authorLinks') || null
      };
    }
  } catch (err) {
    console.warn('[Widget] Failed to read metadata for theme', name, err.message);
  }
  return { name, version: '1.0.0', author: 'Unknown', resolution: '500x150', authorLinks: null };
}