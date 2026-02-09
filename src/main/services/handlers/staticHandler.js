import fs from 'fs';
import path from 'path';
import { widgetThemesPath } from '../../config/paths.js';

/**
 * Serve static files (JS, CSS, theme assets)
 */

/**
 * Serve favicon
 * @param {object} res - HTTP response object
 */
export function serveFavicon(res) {
  const iconPath = path.join(process.cwd(), 'resources', 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 
    'Content-Type': 'image/x-icon',
    'Cache-Control': 'public, max-age=86400' 
  });
  res.end(fs.readFileSync(iconPath));
}

/**
 * Serve widgets client-side JavaScript
 * @param {object} res - HTTP response object
 */
export function serveWidgetsJS(res) {
  const scriptPath = path.join(process.cwd(), 'src', 'main', 'services', 'widgets.js');
  if (!fs.existsSync(scriptPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 
    'Content-Type': 'application/javascript', 
    'Cache-Control': 'public, max-age=3600' 
  });
  res.end(fs.readFileSync(scriptPath, 'utf-8'));
}

/**
 * Serve widgets CSS stylesheet
 * @param {object} res - HTTP response object
 */
export function serveWidgetsCSS(res) {
  const cssPath = path.join(process.cwd(), 'src', 'main', 'services', 'templates', 'widgets.css');
  if (!fs.existsSync(cssPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 
    'Content-Type': 'text/css', 
    'Cache-Control': 'public, max-age=3600' 
  });
  res.end(fs.readFileSync(cssPath, 'utf8'));
}

/**
 * Serve docs CSS stylesheet
 * @param {object} res - HTTP response object
 */
export function serveDocsCSS(res) {
  const cssPath = path.join(process.cwd(), 'src', 'main', 'services', 'templates', 'docs.css');
  if (!fs.existsSync(cssPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 
    'Content-Type': 'text/css', 
    'Cache-Control': 'public, max-age=3600' 
  });
  res.end(fs.readFileSync(cssPath, 'utf8'));
}

/**
 * Serve theme asset files (e.g., /theme/default/style.css)
 * @param {object} url - Parsed URL object
 * @param {object} res - HTTP response object
 */
export function serveThemeAsset(url, res) {
  try {
    // Parse path: /theme/<name>/file/path...
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 3) {
      res.writeHead(400);
      res.end('Bad theme asset request');
      return;
    }

    const themeName = parts[1];
    const fileParts = parts.slice(2);
    const assetPath = path.join(widgetThemesPath, themeName, ...fileParts);

    // Prevent path traversal
    const normalizedBase = path.join(widgetThemesPath, themeName);
    if (!assetPath.startsWith(normalizedBase)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(assetPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const contentType = getContentType(assetPath);
    res.writeHead(200, { 
      'Content-Type': contentType, 
      'Cache-Control': 'public, max-age=3600' 
    });
    res.end(fs.readFileSync(assetPath));
  } catch (err) {
    console.error('[Widget] Theme asset error', err);
    res.writeHead(500);
    res.end('Theme asset error');
  }
}

/**
 * Serve current song's album art image
 * @param {object} currentNowPlaying - Current now playing data object
 * @param {object} res - HTTP response object
 */
export function serveImage(currentNowPlaying, res) {
  const imagePath = currentNowPlaying?.imageFile;
  
  if (!imagePath) {
    res.writeHead(404);
    res.end('No image available');
    return;
  }

  if (!fs.existsSync(imagePath)) {
    res.writeHead(404);
    res.end('Image file not found');
    return;
  }

  const contentType = getContentType(imagePath);
  
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
}

/**
 * Get content type based on file extension
 * @param {string} filePath - Path to file
 * @returns {string} Content type
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    '.json': 'application/json'
  };
  return types[ext] || 'application/octet-stream';
}

