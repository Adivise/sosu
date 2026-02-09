import fs from 'fs';
import path from 'path';
import { shell } from 'electron';
import { widgetThemesPath } from '../config/paths.js';
import { ensureDefaultTheme, listThemes, getThemeMetadata, fetchGitHubThemes, downloadThemeFromGitHub } from './widgets/index.js';
import { getRateLimitInfo } from './widgets/githubClient.js';
import { renderInstalledCard } from './helpers/cardRenderer.js';

export async function handleWidgets(req, res, url, currentPort) {
  const action = url.searchParams.get('action');
  const name = url.searchParams.get('name');

  // API: fetch available themes from GitHub
  if (url.searchParams.get('api') === 'github') {
    try {
      const githubThemes = await fetchGitHubThemes();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, themes: githubThemes }));
    } catch (err) {
      if (err.message && /rate limit/i.test(err.message)) {
        const rl = getRateLimitInfo();
        const retryAfter = rl.rateLimitedUntil ? Math.max(1, Math.ceil((rl.rateLimitedUntil - Date.now())/1000)) : 60;
        res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter), 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: 'GitHub rate limit reached', retryAfter }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    }
    return;
  }

  // Actions: download/open/delete
  if (action && name) {
    try {
      const themeDir = path.join(widgetThemesPath, name);

      if (action === 'download') {
        const result = await downloadThemeFromGitHub(name);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(result));
        return;
      }

      if (action === 'open') {
        const result = await shell.openPath(themeDir);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: !result, message: result || 'Opened folder', path: themeDir }));
        return;
      }

      if (action === 'delete') {
        if (fs.existsSync(themeDir)) {
          fs.rmSync(themeDir, { recursive: true, force: true });

          if (name === 'default') {
            setTimeout(async () => { try { await downloadThemeFromGitHub('default'); } catch (e) { console.error('[Widget] Re-download failed', e); } }, 500);
          }

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, message: 'Theme deleted', name }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Theme not found' }));
        }
        return;
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Render HTML page from template
  try {
    await ensureDefaultTheme();
    const themes = listThemes();
    const base = `http://localhost:${currentPort}`;

    // Generate installed theme cards using helper
    const installedCards = themes
      .map(themeName => {
        const metadata = getThemeMetadata(themeName);
        return renderInstalledCard(themeName, metadata, base);
      })
      .join('\n');

    const tplPath = path.join(process.cwd(), 'src', 'main', 'services', 'templates', 'widgets.html');
    if (!fs.existsSync(tplPath)) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Widgets template not found'); return; }

    let tpl = fs.readFileSync(tplPath, 'utf8');
    tpl = tpl.replace('{{INSTALLED_CARDS}}', installedCards)
             .replace('{{BASE}}', base)
             .replace('{{INSTALLED_THEMES_JSON}}', JSON.stringify(themes))
             .replace('{{DATE_NOW}}', String(Date.now()));

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(tpl);
    return;
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Widgets render error');
    return;
  }
}
