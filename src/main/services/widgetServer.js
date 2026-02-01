import http from 'http';
import https from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { shell } from 'electron';
import { widgetThemesPath } from '../config/paths.js';

let APP_VERSION;

let server = null;
let wss = null;
let currentPort = 3737;
let currentNowPlaying = null;

// Ensure default theme exists on disk - auto-download from GitHub if missing
async function ensureDefaultTheme() {
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

// Function to load custom theme
function loadTheme(themeName) {
  const theme = themeName || 'default';
  
  try {
    // Ensure widget themes directory exists
    if (!fs.existsSync(widgetThemesPath)) {
      fs.mkdirSync(widgetThemesPath, { recursive: true });
    }

  const themePath = path.join(widgetThemesPath, theme, 'index.html');
    
    if (fs.existsSync(themePath)) {
      return fs.readFileSync(themePath, 'utf-8');
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

// Function to list available themes
function listThemes() {
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
    
    // Always include 'default' at the beginning if not already present
    if (!themes.includes('default')) {
      themes.unshift('default');
    }
    
    return themes;
  } catch (err) {
    console.error('[Widget] Error listing themes:', err);
    return ['default'];
  }
}

// Read theme metadata from AppData widgets folder (supports mixed key casing)
function getThemeMetadata(name) {
  const metaPath = path.join(widgetThemesPath, name, 'metadata.json');
  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      const meta = JSON.parse(raw);
      const getKey = (k) => meta[k] ?? meta[k[0].toUpperCase() + k.slice(1)] ?? null;
      return {
        name: getKey('name') || name,
        version: getKey('version') || '1.0',
        author: getKey('author') || 'Unknown',
        resolution: getKey('resolution') || '500x150',
        authorLinks: getKey('authorLinks') || null
      };
    }
  } catch (err) {
    console.warn('[Widget] Failed to read metadata for theme', name, err.message);
  }
  return { name, version: '1.0', author: 'Unknown', resolution: '500x150', authorLinks: null };
}

// Fetch available themes from GitHub repo
async function fetchGitHubThemes() {
  return new Promise((resolve, reject) => {
    const url = 'https://api.github.com/repos/Adivise/sosu-widgets/contents/widgets';
    https.get(url, {
      headers: { 'User-Agent': 'sosu-app' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const items = JSON.parse(data);
          if (Array.isArray(items)) {
            const themeDirs = items.filter(item => item.type === 'dir');
            
            // Fetch metadata for each theme
            const themes = await Promise.all(themeDirs.map(async (item) => {
              try {
                // Fetch metadata.json from GitHub
                const metadataUrl = `https://raw.githubusercontent.com/Adivise/sosu-widgets/main/widgets/${item.name}/metadata.json`;
                const metadata = await new Promise((resolve) => {
                  https.get(metadataUrl, (metaRes) => {
                    let metaData = '';
                    metaRes.on('data', chunk => metaData += chunk);
                    metaRes.on('end', () => {
                      try {
                        resolve(JSON.parse(metaData));
                      } catch {
                        resolve({ name: item.name, version: '1.0.0' });
                      }
                    });
                  }).on('error', () => {
                    resolve({ name: item.name, version: '1.0.0' });
                  });
                });
                
                return {
                  name: item.name,
                  version: metadata.version || '1.0.0',
                  author: metadata.author || 'Unknown',
                  resolution: metadata.resolution || '1920x1080',
                  authorLinks: metadata.authorLinks || '',
                  url: `https://github.com/Adivise/sosu-widgets/raw/main/widgets/${item.name}`,
                  downloadUrl: `https://github.com/Adivise/sosu-widgets/archive/refs/heads/main.zip`
                };
              } catch {
                return {
                  name: item.name,
                  version: '1.0.0',
                  url: `https://github.com/Adivise/sosu-widgets/raw/main/widgets/${item.name}`,
                  downloadUrl: `https://github.com/Adivise/sosu-widgets/archive/refs/heads/main.zip`
                };
              }
            }));
            
            resolve(themes);
          } else {
            reject(new Error('Invalid GitHub API response'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Download and install theme from GitHub
async function downloadThemeFromGitHub(themeName) {
  return new Promise(async (resolve, reject) => {
    try {
      const themeDest = path.join(widgetThemesPath, themeName);
      
      // Create theme directory
      if (!fs.existsSync(widgetThemesPath)) {
        fs.mkdirSync(widgetThemesPath, { recursive: true });
      }
      
      if (fs.existsSync(themeDest)) {
        fs.rmSync(themeDest, { recursive: true, force: true });
      }
      fs.mkdirSync(themeDest, { recursive: true });
      
      // Get list of files in theme folder from GitHub API
      const apiUrl = `https://api.github.com/repos/Adivise/sosu-widgets/contents/widgets/${themeName}`;
      
      https.get(apiUrl, {
        headers: { 'User-Agent': 'sosu-app' }
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', async () => {
          try {
            const files = JSON.parse(data);
            
            if (!Array.isArray(files) || files.length === 0) {
              reject(new Error(`Theme "${themeName}" not found in repository`));
              return;
            }
            
            // Download each file
            const downloadPromises = files
              .filter(file => file.type === 'file')
              .map(file => {
                return new Promise((resolveFile, rejectFile) => {
                  const rawUrl = `https://raw.githubusercontent.com/Adivise/sosu-widgets/main/widgets/${themeName}/${file.name}`;
                  const filePath = path.join(themeDest, file.name);
                  
                  https.get(rawUrl, (fileRes) => {
                    const fileStream = fs.createWriteStream(filePath);
                    fileRes.pipe(fileStream);
                    
                    fileStream.on('finish', () => {
                      fileStream.close();
                      resolveFile();
                    });
                    
                    fileStream.on('error', (err) => {
                      fs.unlinkSync(filePath);
                      rejectFile(err);
                    });
                  }).on('error', rejectFile);
                });
              });
            
            await Promise.all(downloadPromises);
            resolve({ success: true, message: `Theme "${themeName}" installed successfully` });
            
          } catch (err) {
            // Cleanup on error
            if (fs.existsSync(themeDest)) {
              fs.rmSync(themeDest, { recursive: true, force: true });
            }
            reject(err);
          }
        });
      }).on('error', (err) => {
        if (fs.existsSync(themeDest)) {
          fs.rmSync(themeDest, { recursive: true, force: true });
        }
        reject(err);
      });
      
    } catch (err) {
      reject(err);
    }
  });
}

export function startServer(port = 3737) {
  return new Promise(async (resolve, reject) => {
    if (server) {
      reject(new Error('Server is already running'));
      return;
    }

    currentPort = port;
    
    // Ensure default theme exists before starting server
    await ensureDefaultTheme();

    server = http.createServer(async (req, res) => {
      // Parse URL to handle query parameters
      const url = new URL(req.url, `http://localhost:${port}`);
      
      // Widget HTML for OBS overlay (requires theme param)
      if (url.pathname === '/widget') {
        const themeParam = url.searchParams.get('theme');
        if (!themeParam) {
          res.writeHead(302, { Location: '/widgets' });
          res.end('Redirecting to /widgets');
          return;
        }
        const themeHTML = loadTheme(themeParam);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(themeHTML);
      }
      // Preview theme from GitHub (for non-installed themes)
      else if (url.pathname === '/preview') {
        const themeParam = url.searchParams.get('theme');
        if (!themeParam) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('Theme parameter required');
          return;
        }
        
        // Fetch theme HTML from GitHub
        const rawUrl = `https://raw.githubusercontent.com/Adivise/sosu-widgets/main/widgets/${themeParam}/index.html`;
        
        https.get(rawUrl, (githubRes) => {
          if (githubRes.statusCode !== 200) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`<html><body style="background:#111;color:#fff;padding:40px;text-align:center;font-family:sans-serif;"><h2>Theme preview not available</h2><p>Theme "${themeParam}" not found on GitHub</p></body></html>`);
            return;
          }
          
          let htmlData = '';
          githubRes.on('data', chunk => htmlData += chunk);
          githubRes.on('end', () => {
            // Replace WebSocket connection to use current server
            const serverHost = req.headers.host || `localhost:${currentPort}`;
            const modifiedHTML = htmlData
              .replace(/new WebSocket\(['"]ws:\/\/['"] \+ window\.location\.host\)/g, `new WebSocket('ws://${serverHost}')`)
              .replace(/new WebSocket\("ws:\/\/" \+ window\.location\.host\)/g, `new WebSocket("ws://${serverHost}")`)
              .replace(/new WebSocket\(`ws:\/\/\$\{window\.location\.host\}`\)/g, `new WebSocket('ws://${serverHost}')`);
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(modifiedHTML);
          });
        }).on('error', (err) => {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<html><body style="background:#111;color:#fff;padding:40px;text-align:center;font-family:sans-serif;"><h2>Error loading preview</h2><p>${err.message}</p></body></html>`);
        });
      }
      // Themes preview and actions
      else if (url.pathname === '/widgets') {
        const action = url.searchParams.get('action');
        const name = url.searchParams.get('name');

        // API: Get available themes from GitHub
        if (url.pathname === '/widgets' && url.searchParams.get('api') === 'github') {
          try {
            const githubThemes = await fetchGitHubThemes();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: true, themes: githubThemes }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // Actions: download from GitHub, open folder, delete theme
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
                
                // If deleting default theme, auto-download it back
                if (name === 'default') {
                  console.log('[Widget] Default theme deleted, re-downloading...');
                  setTimeout(async () => {
                    try {
                      await downloadThemeFromGitHub('default');
                      console.log('[Widget] Default theme re-downloaded');
                    } catch (err) {
                      console.error('[Widget] Failed to re-download default theme:', err);
                    }
                  }, 500);
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

        // HTML preview page
        // Ensure default theme exists before listing
        await ensureDefaultTheme();
        
        const themes = listThemes();
        const base = `http://localhost:${currentPort}`;
        
        // Installed themes cards
        const installedCards = themes.map(t => {
          const m = getThemeMetadata(t);
          const authorLink = m.authorLinks ? `<a href="${m.authorLinks}" target="_blank" rel="noopener">${m.author}</a>` : m.author;
          return `
          <div class="card installed" data-theme="${t}" data-version="${m.version}">
            <div class="card-head">
              <div class="title">${m.name} <span class="badge">Installed</span></div>
              <div class="actions">
                <button class="btn" onclick="copyUrl('${t}')">Copy URL</button>
                <button class="btn" onclick="openFolder('${t}')">Open Folder</button>
                <button class="btn primary" id="update-${t}" onclick="updateTheme('${t}', this)" style="display:none;">Update</button>
                ${t !== 'default' ? `<button class="btn danger" onclick="deleteTheme('${t}')">Delete</button>` : ''}
              </div>
            </div>
            <div class="preview">
              <iframe src="/widget?theme=${t}" frameborder="0"></iframe>
            </div>
            <div class="meta">
              <span class="url">URL: ${base}/widget?theme=${t}</span>
              <span class="res">Resolution: ${m.resolution}</span>
              <span class="ver">Version: ${m.version}</span>
              <span class="author">Author: ${authorLink}</span>
            </div>
          </div>
          `;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>sosu - Widget Themes</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    margin: 0; 
    background: linear-gradient(135deg, #0a0e17 0%, #1a1f2e 100%);
    color: #e8edf4; 
    font-family: 'Segoe UI', Tahoma, sans-serif; 
    min-height: 100vh;
  }
  .wrap { 
    max-width: 1200px; 
    margin: 0 auto; 
    padding: 32px 24px; 
  }
  .header {
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 2px solid rgba(255,255,255,0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-left h1 { 
    font-size: 32px; 
    font-weight: 800;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #fff 0%, #a8b8d8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .subtitle {
    font-size: 15px;
    color: #8b95a8;
    font-weight: 400;
  }
  .header-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .tabs {
    display: flex;
    gap: 8px;
    margin: 32px 0 24px;
    border-bottom: 2px solid rgba(255,255,255,0.08);
    padding-bottom: 0;
  }
  .tab {
    padding: 12px 24px;
    background: transparent;
    border: none;
    color: #8b95a8;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
  }
  .tab:hover {
    color: #d4e0f5;
    background: rgba(255,255,255,0.05);
  }
  .tab.active {
    color: #fff;
    border-bottom-color: #667eea;
  }
  .tab-content {
    display: none;
  }
  .tab-content.active {
    display: block;
  }
  .section-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 20px;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .badge {
    display: inline-block;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 4px;
    background: rgba(102, 126, 234, 0.2);
    color: #8bb3ff;
    margin-left: 8px;
  }
  .loading {
    text-align: center;
    padding: 40px;
    color: #8b95a8;
    font-size: 15px;
  }
  .grid { 
    display: grid; 
    grid-template-columns: 1fr; 
    gap: 24px; 
  }
  @media (min-width: 1100px) { 
    .grid { grid-template-columns: repeat(auto-fit, minmax(850px, 1fr)); } 
  }
  .card { 
    background: rgba(20, 26, 34, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08); 
    border-radius: 16px; 
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
    transition: all 0.3s ease;
    overflow: hidden;
  }
  .card.available {
    background: rgba(20, 26, 34, 0.4);
  }
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
    border-color: rgba(255,255,255,0.12);
  }
  .card-head { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 16px 20px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .title { 
    font-weight: 700; 
    font-size: 18px;
    color: #fff;
    letter-spacing: 0.2px;
    display: flex;
    align-items: center;
  }
  .actions { 
    display: flex; 
    gap: 8px; 
    flex-wrap: wrap;
  }
  .btn { 
    background: linear-gradient(135deg, #1e2936 0%, #2a3544 100%);
    border: 1px solid rgba(255,255,255,0.1); 
    color: #d4e0f5; 
    padding: 8px 14px; 
    border-radius: 8px; 
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }
  .btn:hover { 
    background: linear-gradient(135deg, #2a3544 0%, #353f52 100%);
    border-color: rgba(255,255,255,0.18);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .btn:active {
    transform: translateY(0);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: rgba(102, 126, 234, 0.3);
    color: #fff;
  }
  .btn.primary:hover {
    background: linear-gradient(135deg, #7c8ef5 0%, #8a5db8 100%);
    border-color: rgba(102, 126, 234, 0.5);
  }
  .btn.danger { 
    background: linear-gradient(135deg, #3a1e22 0%, #4a2428 100%);
    border-color: rgba(255,77,77,0.3); 
    color: #ffcdd2; 
  }
  .btn.danger:hover { 
    background: linear-gradient(135deg, #4a2428 0%, #5a2a2e 100%);
    border-color: rgba(255,77,77,0.5);
  }
  .preview { 
    padding: 20px;
    background: rgba(0,0,0,0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 280px;
  }
  .preview iframe { 
    width: 100%;
    max-width: 750px;
    height: 250px; 
    background: transparent;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  .preview-placeholder {
    color: #8b95a8;
    font-size: 15px;
    text-align: center;
  }
  .meta { 
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    padding: 16px 20px;
    font-size: 13px; 
    background: rgba(0,0,0,0.15);
  }
  .meta > span {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .meta-label {
    color: #8b95a8;
    font-weight: 600;
  }
  .meta-value {
    color: #d4e0f5;
  }
  .url { 
    grid-column: 1 / -1;
    background: rgba(14, 19, 25, 0.6);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; 
    padding: 10px 12px;
    font-family: 'Consolas', monospace;
    font-size: 13px;
    color: #a8d4ff;
    word-break: break-all;
  }
  .author a {
    color: #6ba3ff;
    text-decoration: none;
    transition: color 0.2s;
  }
  .author a:hover {
    color: #8bb9ff;
    text-decoration: underline;
  }
  .toast { 
    position: fixed; 
    right: 24px; 
    bottom: 24px; 
    background: linear-gradient(135deg, #1e2936 0%, #2a3544 100%);
    color: #dff1ff; 
    padding: 12px 20px; 
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 12px; 
    display: none;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    animation: slideIn 0.3s ease;
    z-index: 1000;
  }
  @keyframes slideIn {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-left">
        <h1>Widget Themes</h1>
        <div class="subtitle">Download, preview, and manage your OBS widget themes</div>
      </div>
      <div class="header-right">
        <button class="btn primary" onclick="window.open('https://github.com/Adivise/sosu-widgets', '_blank')">
          Browse on GitHub
        </button>
      </div>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="switchTab('installed')">📦 Installed Themes</button>
      <button class="tab" onclick="switchTab('available')">🌐 Available Themes</button>
    </div>
    
    <div id="tab-installed" class="tab-content active">
      <div class="grid" id="installed-themes">${installedCards}</div>
    </div>
    
    <div id="tab-available" class="tab-content">
      <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
        <button class="btn" onclick="loadAvailableThemes()">🔄 Refresh</button>
      </div>
      <div id="available-themes" class="loading">Loading available themes from GitHub...</div>
    </div>
  </div>
  <div id="toast" class="toast">Copied!</div>
  <script>
    const base = '${base}';
    const installedThemes = ${JSON.stringify(themes)};
    
    function switchTab(tab) {
      // Update tab buttons
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      
      // Update tab content
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      
      // Load available themes when switching to that tab
      if (tab === 'available' && !window.availableThemesLoaded) {
        loadAvailableThemes();
      }
    }
    
    // Check for theme updates on page load
    checkThemeUpdates();
    
    function showToast(msg){ 
      const t=document.getElementById('toast'); 
      t.textContent=msg; 
      t.style.display='block'; 
      setTimeout(()=>t.style.display='none', 2000); 
    }
    
    async function copyUrl(name){ 
      const url = base + '/widget?theme=' + name; 
      try { 
        await navigator.clipboard.writeText(url); 
        showToast('✓ Copied URL'); 
      } catch(e){ 
        console.error(e); 
      }
    }
    
    async function openFolder(name){ 
      const r = await fetch('/widgets?action=open&name=' + encodeURIComponent(name)); 
      const j = await r.json(); 
      showToast(j.success ? '✓ Opened folder' : '✗ ' + (j.error||'Failed')); 
    }
    
    async function downloadTheme(name, btn){ 
      if(btn) btn.disabled = true;
      if(btn) btn.textContent = 'Downloading...';
      showToast('⏳ Downloading ' + name + '...');
      
      const r = await fetch('/widgets?action=download&name=' + encodeURIComponent(name)); 
      const j = await r.json(); 
      
      if(btn) btn.disabled = false;
      if(btn) btn.textContent = 'Download';
      
      showToast(j.success ? '✓ Installed' : '✗ ' + (j.error||'Failed')); 
      
      if(j.success) {
        setTimeout(()=>location.reload(), 1000);
      }
    }
    
    async function updateTheme(name, btn){ 
      if(btn) btn.disabled = true;
      if(btn) btn.textContent = 'Updating...';
      showToast('⏳ Updating ' + name + '...');
      
      const r = await fetch('/widgets?action=download&name=' + encodeURIComponent(name)); 
      const j = await r.json(); 
      
      if(btn) btn.disabled = false;
      if(btn) btn.textContent = 'Update';
      
      showToast(j.success ? '✓ Updated' : '✗ ' + (j.error||'Failed')); 
      
      if(j.success) {
        setTimeout(()=>location.reload(), 1000);
      }
    }
    
    async function deleteTheme(name){ 
      if(!confirm('Delete theme "' + name + '"?')) return; 
      const r = await fetch('/widgets?action=delete&name=' + encodeURIComponent(name)); 
      const j = await r.json(); 
      showToast(j.success ? '✓ Deleted' : '✗ ' + (j.error||'Failed')); 
      if(j.success) setTimeout(()=>location.reload(), 800); 
    }
    
    async function checkThemeUpdates() {
      try {
        const r = await fetch('/widgets?api=github');
        const data = await r.json();
        
        if(!data.success || !data.themes) return;
        
        const githubThemes = data.themes;
        const installedCards = document.querySelectorAll('.card.installed');
        
        installedCards.forEach(card => {
          const themeName = card.dataset.theme;
          const localVersion = card.dataset.version;
          const githubTheme = githubThemes.find(t => t.name === themeName);
          
          if(githubTheme && githubTheme.version && localVersion !== githubTheme.version) {
            const updateBtn = document.getElementById('update-' + themeName);
            if(updateBtn) {
              updateBtn.style.display = 'inline-block';
              updateBtn.title = 'Update from v' + localVersion + ' to v' + githubTheme.version;
            }
          }
        });
      } catch(err) {
        console.error('Failed to check theme updates:', err);
      }
    }
    
    async function checkThemeUpdates() {
      try {
        const r = await fetch('/widgets?api=github');
        const data = await r.json();
        
        if(!data.success || !data.themes) return;
        
        const githubThemes = data.themes;
        const installedCards = document.querySelectorAll('.card.installed');
        
        installedCards.forEach(card => {
          const themeName = card.dataset.theme;
          const localVersion = card.dataset.version;
          const githubTheme = githubThemes.find(t => t.name === themeName);
          
          if(githubTheme && githubTheme.version && localVersion !== githubTheme.version) {
            const updateBtn = document.getElementById('update-' + themeName);
            if(updateBtn) {
              updateBtn.style.display = 'inline-block';
              updateBtn.title = 'Update from v' + localVersion + ' to v' + githubTheme.version;
            }
          }
        });
      } catch(err) {
        console.error('Failed to check theme updates:', err);
      }
    }
    
    async function loadAvailableThemes() {
      const container = document.getElementById('available-themes');
      container.innerHTML = '<div class="loading">Loading available themes from GitHub...</div>';
      
      try {
        const r = await fetch('/widgets?api=github');
        const data = await r.json();
        
        if(!data.success || !data.themes || data.themes.length === 0) {
          container.innerHTML = '<div class="loading">No themes available</div>';
          window.availableThemesLoaded = true;
          return;
        }
        
        const availableThemes = data.themes.filter(t => !installedThemes.includes(t.name));
        
        if(availableThemes.length === 0) {
          container.innerHTML = '<div class="loading">All available themes are already installed ✓</div>';
          window.availableThemesLoaded = true;
          return;
        }
        
        const grid = document.createElement('div');
        grid.className = 'grid';
        
        availableThemes.forEach(theme => {
          const card = document.createElement('div');
          card.className = 'card available';
          card.innerHTML = \`
            <div class="card-head">
              <div class="title">\${theme.name}</div>
              <div class="actions">
                <button class="btn primary" onclick="downloadTheme('\${theme.name}', this)">Download</button>
                <button class="btn" onclick="window.open('https://github.com/Adivise/sosu-widgets/tree/main/widgets/\${theme.name}', '_blank')">View on GitHub</button>
              </div>
            </div>
            <div class="preview">
              <iframe src="/preview?theme=\${theme.name}" frameborder="0"></iframe>
            </div>
            <div class="meta">
              <span>Download to use this widget in OBS</span>
            </div>
          \`;
          grid.appendChild(card);
        });
        
        container.innerHTML = '';
        container.appendChild(grid);
        window.availableThemesLoaded = true;
      } catch(err) {
        container.innerHTML = '<div class="loading">✗ Failed to load themes: ' + err.message + '</div>';
      }
    }
  </script>
</body></html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } 
      // JSON API - Now Playing Data
      else if (url.pathname === '/json') {
        // Return current playing song data as raw JSON
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        });
        
        if (currentNowPlaying && currentNowPlaying.title) {
          const isPaused = !!currentNowPlaying.paused;
          const responseData = {
            status: isPaused ? 'paused' : 'playing',
            song: {
              title: currentNowPlaying.title,
              artist: currentNowPlaying.artist,
              album: currentNowPlaying.album || null,
              duration: currentNowPlaying.duration || 0,
              currentTime: currentNowPlaying.currentTime || 0,
              imageFile: currentNowPlaying.imageFile || null,
              paused: isPaused
            },
            progress: {
              current: currentNowPlaying.currentTime || 0,
              total: currentNowPlaying.duration || 0,
              percentage: currentNowPlaying.duration > 0 
                ? Math.round((currentNowPlaying.currentTime / currentNowPlaying.duration) * 100) 
                : 0
            },
            timestamp: Date.now()
          };
          res.end(JSON.stringify(responseData, null, 2));
        } else {
          res.end(JSON.stringify({
            status: 'idle',
            song: null,
            progress: null,
            timestamp: Date.now()
          }, null, 2));
        }
      } 
      // Server Status
      else if (url.pathname === '/status') {
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          server: 'sosu-widget-server',
          version: APP_VERSION,
          status: 'online',
          port: currentPort,
          uptime: process.uptime(),
          connectedClients: wss ? wss.clients.size : 0,
          hasActiveSong: !!(currentNowPlaying && currentNowPlaying.title),
          timestamp: Date.now()
        }, null, 2));
      } 
      // Documentation
      else if (url.pathname === '/docs') {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>sosu Widget API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0a0e14;
      --card: #151a21;
      --border: rgba(255,255,255,0.08);
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #58a6ff;
      --accent-hover: #79c0ff;
      --success: #3fb950;
      --purple: #bc8cff;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 0;
      margin: 0;
    }
    .header {
      background: linear-gradient(135deg, rgba(88, 166, 255, 0.1), rgba(188, 140, 255, 0.1));
      border-bottom: 1px solid var(--border);
      padding: 32px 24px;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    .title {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
      background: linear-gradient(135deg, var(--accent), var(--purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: var(--muted);
      font-size: 16px;
    }
    .content {
      padding: 32px 24px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .icon {
      font-size: 24px;
    }
    .endpoint {
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      transition: all 0.2s;
    }
    .endpoint:hover {
      border-color: var(--accent);
      transform: translateX(4px);
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .method {
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .method.get { background: rgba(63, 185, 80, 0.2); color: var(--success); border: 1px solid var(--success); }
    .endpoint-path {
      font-family: 'Consolas', monospace;
      font-size: 16px;
      font-weight: 600;
      color: var(--accent);
    }
    .endpoint-desc {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 12px;
    }
    .code-block {
      background: rgba(0,0,0,0.4);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      font-family: 'Consolas', monospace;
      font-size: 13px;
      color: var(--text);
      overflow-x: auto;
      position: relative;
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(88, 166, 255, 0.2);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      background: var(--accent);
      color: #000;
    }
    .ws-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .info-card {
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .info-label {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .info-value {
      font-family: 'Consolas', monospace;
      color: var(--accent);
      font-size: 14px;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(188, 140, 255, 0.2);
      border: 1px solid var(--purple);
      color: var(--purple);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      margin-left: 8px;
    }
    a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      color: var(--accent-hover);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1 class="title">🎵 sosu Widget API</h1>
      <p class="subtitle">Real-time now-playing data for OBS, StreamLabs, and custom integrations</p>
    </div>
  </div>

  <div class="content">
    <div class="section">
      <h2 class="section-title"><span class="icon">🚀</span> Quick Start</h2>
      <p style="color: var(--muted); margin-bottom: 16px;">
        Add a Browser Source to OBS with one of these URLs. Server must be running (port ${currentPort}).
      </p>
      <div class="code-block">
        <button class="copy-btn" onclick="copy('http://localhost:${currentPort}/widget?theme=default')">Copy</button>
        http://localhost:${currentPort}/widget?theme=default
      </div>
      <p style="color: var(--muted); margin-top: 12px; font-size: 14px;">
        Browse and download more themes at <a href="/widgets">/widgets</a>
      </p>
    </div>

    <div class="section">
      <h2 class="section-title"><span class="icon">📡</span> HTTP Endpoints</h2>
      
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/json</span>
        </div>
        <p class="endpoint-desc">Get current song data as JSON</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${currentPort}/json')">Copy</button>
          http://localhost:${currentPort}/json
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/widget</span>
          <span class="badge">?theme=NAME</span>
        </div>
        <p class="endpoint-desc">Display widget overlay for OBS (specify theme parameter)</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${currentPort}/widget?theme=minimal')">Copy</button>
          http://localhost:${currentPort}/widget?theme=minimal
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/image</span>
        </div>
        <p class="endpoint-desc">Get current song's album art image</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${currentPort}/image')">Copy</button>
          http://localhost:${currentPort}/image
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/widgets</span>
        </div>
        <p class="endpoint-desc">Browse, preview, and download widget themes</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${currentPort}/widgets')">Copy</button>
          http://localhost:${currentPort}/widgets
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/status</span>
        </div>
        <p class="endpoint-desc">Check server status and uptime</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${currentPort}/status')">Copy</button>
          http://localhost:${currentPort}/status
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title"><span class="icon">⚡</span> WebSocket Protocol</h2>
      <p style="color: var(--muted); margin-bottom: 16px;">
        Connect via WebSocket for real-time updates. Data is pushed ~every second while music plays.
      </p>
      
      <div class="ws-info">
        <div class="info-card">
          <div class="info-label">WebSocket URL</div>
          <div class="info-value">ws://localhost:${currentPort}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Protocol</div>
          <div class="info-value">JSON messages</div>
        </div>
        <div class="info-card">
          <div class="info-label">Update Rate</div>
          <div class="info-value">~1 message/sec</div>
        </div>
      </div>

      <p style="color: var(--muted); margin: 16px 0 12px; font-weight: 600;">Example Message:</p>
      <div class="code-block" style="padding-right: 60px;">
        <button class="copy-btn" onclick="copy(exampleJson)">Copy</button>
        <pre style="margin:0; white-space: pre-wrap;">{
  "title": "Song Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "duration": 180.0,
  "currentTime": 45.5,
  "imageFile": "/path/to/image.jpg",
  "paused": false
}</pre>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title"><span class="icon">🎨</span> Creating Custom Themes</h2>
      <p style="color: var(--muted); margin-bottom: 12px;">
        Build your own widget themes! Check the developer guide:
      </p>
      <div class="code-block">
        <button class="copy-btn" onclick="copy('https://github.com/Adivise/sosu-widgets')">Copy</button>
        https://github.com/Adivise/sosu-widgets
      </div>
    </div>
  </div>

  <script>
    const exampleJson = \`{
  "title": "Song Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "duration": 180.0,
  "currentTime": 45.5,
  "imageFile": "/path/to/image.jpg",
  "paused": false
}\`;

    function copy(text) {
      navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = 'rgba(63, 185, 80, 0.3)';
        btn.style.borderColor = '#3fb950';
        btn.style.color = '#3fb950';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } 
      // Image serving - current playing song's album art
      else if (url.pathname === '/image') {
        // Serve current playing song's image
        const imagePath = currentNowPlaying?.imageFile;
        
        if (!imagePath) {
          res.writeHead(404);
          res.end('No image available');
          return;
        }

        // Check if file exists
        if (!fs.existsSync(imagePath)) {
          res.writeHead(404);
          res.end('Image file not found');
          return;
        }

        // Determine content type based on file extension
        const ext = path.extname(imagePath).toLowerCase();
        const contentTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.bmp': 'image/bmp'
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';

        try {
          const imageData = fs.readFileSync(imagePath);
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(imageData);
        } catch (err) {
          console.error('[Widget] Error reading image:', err);
          res.writeHead(500);
          res.end('Error reading image');
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Create WebSocket server
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      console.log('[Widget] Client connected');
      
      // Send current now playing data immediately
      if (currentNowPlaying) {
        ws.send(JSON.stringify(currentNowPlaying));
      }

      ws.on('close', () => {
        console.log('[Widget] Client disconnected');
      });
    });

    server.on('error', (err) => {
      console.error('[Widget] Server error:', err);
      reject(err);
    });

    server.listen(port, () => {
      console.log(`[Widget] Server started on http://localhost:${port}`);
      resolve({ port, url: `http://localhost:${port}` });
      // Auto-open themes page on start
      try {
        shell.openExternal(`http://localhost:${port}/widgets`);
      } catch (e) {
        console.error('[Widget] Failed to open themes page:', e);
      }
    });
  });
}

export function stopServer() {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }

    // Close all WebSocket connections
    if (wss) {
      wss.clients.forEach(client => {
        client.close();
      });
      wss.close();
      wss = null;
    }

    server.close(() => {
      console.log('[Widget] Server stopped');
      server = null;
      resolve();
    });
  });
}

export function updateNowPlaying(data) {
  // Merge partial updates into the current state so widgets can receive lightweight updates
  if (data === null) {
    currentNowPlaying = null;
  } else {
    currentNowPlaying = Object.assign({}, currentNowPlaying || {}, data);
  }

  // Broadcast to all connected WebSocket clients the merged state
  if (wss) {
    const message = JSON.stringify(currentNowPlaying);
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

export function isServerRunning() {
  return server !== null;
}

export function getServerUrl() {
  if (!server) return null;
  return `http://localhost:${currentPort}`;
}

export function setAppVersion(version) {
  APP_VERSION = version;
  console.log('[Widget] App version set to:', version);
}
