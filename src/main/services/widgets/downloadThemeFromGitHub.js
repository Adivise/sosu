import https from 'https';
import fs from 'fs';
import path from 'path';
import { widgetThemesPath } from '../../config/paths.js';
import { githubFetch, getRateLimitInfo } from './githubClient.js';

export async function downloadThemeFromGitHub(themeName) {
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

      // Helper: call GitHub contents API for a given repo path (rate-limit-aware)
      async function listApi(repoPath) {
        const apiUrl = `https://api.github.com/repos/Adivise/sosu-widgets/contents/${repoPath}`;
        const apiRes = await githubFetch(apiUrl);
        if (apiRes.statusCode !== 200) {
          throw new Error(`GitHub API returned ${apiRes.statusCode}`);
        }
        try {
          return JSON.parse(apiRes.body || '[]');
        } catch (err) {
          throw err;
        }
      }

      async function collectFiles(repoPath) {
        const items = await listApi(repoPath);
        if (!Array.isArray(items)) return [];
        let out = [];
        for (const item of items) {
          if (item.type === 'file') {
            out.push({ path: item.path, download_url: item.download_url });
          } else if (item.type === 'dir') {
            out.push(...await collectFiles(item.path));
          }
        }
        return out;
      }

      const repoRoot = `widgets/${themeName}`;

      // Short-circuit if GitHub is rate-limited
      const rl = getRateLimitInfo();
      if (rl.rateLimitedUntil && Date.now() < rl.rateLimitedUntil) {
        const retryAfter = Math.max(1, Math.ceil((rl.rateLimitedUntil - Date.now())/1000));
        reject(new Error(`GitHub rate limit in effect. Retry after ${retryAfter} seconds.`));
        return;
      }

      const files = await collectFiles(repoRoot);

      if (!files || files.length === 0) {
        if (fs.existsSync(themeDest)) {
          fs.rmSync(themeDest, { recursive: true, force: true });
        }
        reject(new Error(`Theme "${themeName}" not found in repository or contains no files`));
        return;
      }

      // Helper: download a raw file with retry/backoff (handles transient network errors)
      async function downloadFileWithRetries(rawUrl, filePath, retries = 3, baseDelay = 200) {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            await new Promise((resolve, reject) => {
              const req = https.get(rawUrl, (fileRes) => {
                if (fileRes.statusCode !== 200) {
                  reject(new Error(`Failed to download ${rawUrl} (${fileRes.statusCode})`));
                  return;
                }

                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                const fileStream = fs.createWriteStream(filePath);
                fileRes.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                  resolve();
                });
                fileStream.on('error', (err) => {
                  try { fs.unlinkSync(filePath); } catch (e) {}
                  reject(err);
                });
              });

              req.on('error', reject);
              req.setTimeout(20000, () => req.destroy(new Error('Request timed out')));
            });

            // success
            return;
          } catch (err) {
            // Do not retry on explicit rate-limit errors (message set earlier by pre-check)
            const isTransient = /timed out|ECONNRESET|EAI_AGAIN|502|503|504|500/.test(err.message || '');
            if (attempt < retries && isTransient) {
              const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            throw err;
          }
        }
      }

      const downloadPromises = files.map(f => {
        return (async () => {
          const rel = f.path.split('/').slice(2).join('/');
          const filePath = path.join(themeDest, rel);
          const rawUrl = f.download_url || `https://raw.githubusercontent.com/Adivise/sosu-widgets/main/${f.path}`;
          await downloadFileWithRetries(rawUrl, filePath);
        })();
      });

      await Promise.all(downloadPromises);
      resolve({ success: true, message: `Theme "${themeName}" installed successfully` });
    } catch (err) {
      try {
        const themeDest = path.join(widgetThemesPath, themeName);
        if (fs.existsSync(themeDest)) {
          fs.rmSync(themeDest, { recursive: true, force: true });
        }
      } catch (e) {}
      reject(err);
    }
  });
}