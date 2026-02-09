import fs from 'fs';
import path from 'path';
import { widgetThemesPath } from '../../config/paths.js';

export function loadTheme(themeName) {
  const theme = themeName || 'default';

  try {
    if (!fs.existsSync(widgetThemesPath)) {
      fs.mkdirSync(widgetThemesPath, { recursive: true });
    }

    const themePath = path.join(widgetThemesPath, theme, 'index.html');

    if (fs.existsSync(themePath)) {
      let html = fs.readFileSync(themePath, 'utf-8');

      // Rewrite relative asset URLs (href/src) to be served from /theme/<name>/
      html = html.replace(/(href|src)=["'](?!https?:\/\/|\/)([^"']+)["']/g, (m, attr, file) => {
        return `${attr}="/theme/${theme}/${file}"`;
      });

      return html;
    } else {
      console.error(`[Widget] Theme "${theme}" not found at: ${themePath}`);
      return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Theme Not Found</title></head>
<body style="margin:0;padding:40px;font-family:sans-serif;background:#1a1a1a;color:white;text-align:center;">
<h1>🎵 Theme Not Found</h1>
<p>Theme "${theme}" does not exist.</p>
<p style="opacity:0.7;font-size:14px;">Expected location: ${themePath}</p>
<p style="margin-top:30px;"><a href="/widgets" style="color:#667eea;">View available themes</a></p>
</body></html>`;
    }
  } catch (err) {
    console.error(`[Widget] Error loading theme "${theme}":`, err);
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Error</title></head>
<body style="margin:0;padding:40px;font-family:sans-serif;background:#1a1a1a;color:white;text-align:center;">
<h1>⚠️ Error Loading Theme</h1>
<p>${err.message}</p>
</body></html>`;
  }
}