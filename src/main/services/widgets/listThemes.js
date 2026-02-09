import fs from 'fs';
import path from 'path';
import { widgetThemesPath } from '../../config/paths.js';

export function listThemes() {
  try {
    if (!fs.existsSync(widgetThemesPath)) {
      return ['default'];
    }

    const themes = [];
    const items = fs.readdirSync(widgetThemesPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const indexPath = path.join(widgetThemesPath, item.name, 'index.html');
        if (fs.existsSync(indexPath)) {
          themes.push(item.name);
        }
      }
    }

    if (!themes.includes('default')) {
      themes.unshift('default');
    }

    return themes;
  } catch (err) {
    console.error('[Widget] Error listing themes:', err);
    return ['default'];
  }
}