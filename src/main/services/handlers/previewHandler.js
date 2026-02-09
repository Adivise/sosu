import https from 'https';
import { getCachedPreview, setCachedPreview } from '../helpers/previewCache.js';

/**
 * Handles preview requests for non-installed themes from GitHub
 * @param {string} themeName - The theme name to preview
 * @param {object} req - HTTP request object
 * @param {object} res - HTTP response object
 * @param {number} currentPort - Current server port
 */
export async function handlePreview(themeName, req, res, currentPort) {
  if (!themeName) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('Theme parameter required');
    return;
  }
  
  // Check cache first
  const cachedHTML = getCachedPreview(themeName);
  if (cachedHTML) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(cachedHTML);
    return;
  }

  // Fetch theme HTML from GitHub
  const rawUrl = `https://raw.githubusercontent.com/Adivise/sosu-widgets/main/widgets/${themeName}/index.html`;
  
  https.get(rawUrl, (githubRes) => {
    if (githubRes.statusCode !== 200) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="background:#111;color:#fff;padding:40px;text-align:center;font-family:sans-serif;"><h2>Theme preview not available</h2><p>Theme "${themeName}" not found on GitHub</p></body></html>`);
      return;
    }
    
    let htmlData = '';
    githubRes.on('data', chunk => htmlData += chunk);
    githubRes.on('end', async () => {
      try {
        const modifiedHTML = await processPreviewHTML(htmlData, themeName, req, currentPort);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(modifiedHTML);
        setCachedPreview(themeName, modifiedHTML);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<html><body style="background:#111;color:#fff;padding:40px;text-align:center;font-family:sans-serif;"><h2>Error processing preview</h2><p>${error.message}</p></body></html>`);
      }
    });
  }).on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<html><body style="background:#111;color:#fff;padding:40px;text-align:center;font-family:sans-serif;"><h2>Error loading preview</h2><p>${err.message}</p></body></html>`);
  });
}

/**
 * Process and modify the preview HTML to work with local WebSocket server
 * @param {string} htmlData - Raw HTML from GitHub
 * @param {string} themeName - Theme name
 * @param {object} req - HTTP request object
 * @param {number} currentPort - Current server port
 * @returns {Promise<string>} Modified HTML
 */
async function processPreviewHTML(htmlData, themeName, req, currentPort) {
  const serverHost = req.headers.host || `localhost:${currentPort}`;
  const rawBase = `https://raw.githubusercontent.com/Adivise/sosu-widgets/main/widgets/${themeName}`;

  // Replace WebSocket connections to use current server
  let modifiedHTML = htmlData
    .replace(/new WebSocket\(['"]ws:\/\/["'] \+ window\.location\.host\)/g, `new WebSocket('ws://${serverHost}')`)
    .replace(/new WebSocket\("ws:\/\/" \+ window\.location\.host\)/g, `new WebSocket("ws://${serverHost}")`)
    .replace(/new WebSocket\(`ws:\/\/\$\{window\.location\.host\}`\)/g, `new WebSocket('ws://${serverHost}')`)
    .replace(/(href|src)=["'](?!https?:\/\/|\/)([^"']+)["']/g, (m, attr, file) => `${attr}="${rawBase}/${file}"`);

  // Inject WebSocket host patch
  const wsPatch = createWebSocketPatch(serverHost);
  modifiedHTML = modifiedHTML.replace(/<body([^>]*)>/i, `<body$1><script>${wsPatch}<\/script>`);

  // Try to inline common assets
  modifiedHTML = await inlineThemeAssets(modifiedHTML, rawBase);

  return modifiedHTML;
}

/**
 * Create WebSocket connection patch script
 * @param {string} serverHost - Server host with port
 * @returns {string} Patch script
 */
function createWebSocketPatch(serverHost) {
  return `(function(){try{var _Orig=window.WebSocket;var server='${serverHost}';window.WebSocket=function(url,protocols){try{if(typeof url==='string' && (url.indexOf('ws://')===0||url.indexOf('wss://')===0)){ try{ var u = new URL(url); u.host = server; return new _Orig(u.toString(), protocols); } catch(e){ var idx = url.indexOf('://'); if(idx !== -1){ var proto = url.slice(0, idx); var rest = url.slice(idx+3); var slash = rest.indexOf('/'); var path = slash !== -1 ? rest.slice(slash) : ''; var fixed = proto + '://' + server + path; return new _Orig(fixed, protocols); } } } }catch(e){} return new _Orig(url,protocols);};window.WebSocket.prototype=_Orig.prototype;}catch(e){} })();`;
}

/**
 * Attempt to inline CSS and JS assets from GitHub
 * @param {string} html - HTML content
 * @param {string} rawBase - Base URL for raw GitHub content
 * @returns {Promise<string>} HTML with inlined assets
 */
async function inlineThemeAssets(html, rawBase) {
  try {
    const fetchText = (url) => new Promise((resolve, reject) => {
      // Check cache for this specific asset
      const cacheKey = `asset:${url}`;
      const cached = getCachedPreview(cacheKey);
      if (cached) {
        resolve(cached);
        return;
      }

      https.get(url, (r) => {
        if (r.statusCode !== 200) return reject(new Error(`Failed to fetch ${url}`));
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => {
          setCachedPreview(cacheKey, data, 60 * 60 * 1000); // Cache for 1 hour
          resolve(data);
        });
      }).on('error', reject);
    });

    // Inline CSS if present
    try {
      const cssText = await fetchText(rawBase + '/style.css');
      html = html.replace(/<link[^>]+href=["'][^"']*style\.css["'][^>]*>/i, `<style>${cssText}</style>`);
    } catch (e) { 
      // Ignore missing CSS
    }

    // Inline JS if present
    try {
      const jsText = await fetchText(rawBase + '/script.js');
      html = html.replace(/<script\s+[^>]*src=["'][^"']*script\.js["'][^>]*>\s*<\/script>/i, `<script>${jsText}</script>`);
    } catch (e) { 
      // Ignore missing JS
    }
  } catch (e) {
    console.error('[Widget] Failed to inline theme assets', e);
  }

  return html;
}

