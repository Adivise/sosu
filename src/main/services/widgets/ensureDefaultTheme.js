import fs from 'fs';
import path from 'path';
import { widgetThemesPath } from '../../config/paths.js';
import { downloadThemeFromGitHub } from './downloadThemeFromGitHub.js';

export async function ensureDefaultTheme() {
  try {
    if (!fs.existsSync(widgetThemesPath)) {
      fs.mkdirSync(widgetThemesPath, { recursive: true });
    }

    const defaultDir = path.join(widgetThemesPath, 'default');
    const indexPath = path.join(defaultDir, 'index.html');

    // If default theme doesn't exist, download it from GitHub
    if (!fs.existsSync(indexPath)) {
      console.log('[Widget] Default theme not found, downloading from GitHub...');
      try {
        await downloadThemeFromGitHub('default');
        console.log('[Widget] Default theme downloaded successfully');
      } catch (err) {
        console.error('[Widget] Failed to download default theme:', err);
        // Create minimal fallback as last resort
        if (!fs.existsSync(defaultDir)) {
          fs.mkdirSync(defaultDir, { recursive: true });
        }
        const fallback = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>sosu widget</title></head>
<body style="margin:0;padding:24px;font-family:sans-serif;background:#111;color:#fff;text-align:center;padding-top:60px;">
<h2 style="margin:0 0 12px;">⚠️ Default theme not available</h2>
<p style="opacity:0.8;">Please check your internet connection and visit <a href="/widgets" style="color:#667eea;">/widgets</a> to download themes.</p>
</body></html>`;
        fs.writeFileSync(indexPath, fallback, 'utf-8');
        const meta = {
          name: 'Default (Offline)',
          version: '1.0',
          author: 'sosu',
          resolution: '500x150',
          authorLinks: null
        };
        fs.writeFileSync(path.join(defaultDir, 'metadata.json'), JSON.stringify(meta, null, 2), 'utf-8');
      }
    }
  } catch (err) {
    console.error('[Widget] Failed to ensure default theme:', err);
  }
}