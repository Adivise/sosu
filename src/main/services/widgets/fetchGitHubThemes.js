import { githubFetch } from './githubClient.js';

let cachedThemes = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function clearThemeCache() {
  cachedThemes = null;
  cachedAt = 0;
  console.log('[fetchGitHubThemes] Cache cleared');
}

export async function fetchGitHubThemes() {
  // Return cached result when fresh to avoid hitting GitHub rate limits
  if (cachedThemes && (Date.now() - cachedAt) < CACHE_TTL) {
    return cachedThemes;
  }

  const url = 'https://api.github.com/repos/Adivise/sosu-widgets/contents/widgets';

  try {
    const res = await githubFetch(url);
    const { statusCode, headers, body } = res;

    // Check for non-200 status codes and include rate-limit info
    if (statusCode !== 200) {
      const reset = headers && headers['x-ratelimit-reset'];
      const remaining = headers && headers['x-ratelimit-remaining'];
      let msg = `GitHub API returned ${statusCode}`;
      try {
        const b = JSON.parse(body || '{}');
        if (b.message) msg += `: ${b.message}`;
      } catch {}
      if (remaining !== undefined) msg += ` (remaining=${remaining})`;
      if (reset) msg += ` (reset=${new Date(Number(reset) * 1000).toISOString()})`;

      // Cache negative result briefly to avoid hot-looping
      cachedThemes = null;
      cachedAt = Date.now();

      if ((statusCode === 403 && remaining === '0') || statusCode === 429) {
        throw new Error(msg + ' â€” rate limit exceeded');
      }

      throw new Error(msg);
    }

    const items = JSON.parse(body);
    if (!Array.isArray(items)) throw new Error('Invalid GitHub API response');

    const themeDirs = items.filter(item => item.type === 'dir');

    const themes = await Promise.all(themeDirs.map(async (item) => {
      try {
        const metadataUrl = `https://raw.githubusercontent.com/Adivise/sosu-widgets/main/widgets/${item.name}/metadata.json`;
        const metaRes = await githubFetch(metadataUrl);
        let metadata = {};
        if (metaRes.statusCode === 200) {
          try { metadata = JSON.parse(metaRes.body || '{}'); } catch {}
        }

        return {
          name: item.name,
          version: metadata.version || '1.0.0',
          author: metadata.author || 'Unknown',
          resolution: metadata.resolution || '1920x1080',
          authorLinks: metadata.authorLinks || '',
          url: `https://github.com/Adivise/sosu-widgets/raw/main/widgets/${item.name}`,
          downloadUrl: `https://github.com/Adivise/sosu-widgets/archive/refs/heads/main.zip`
        };
      } catch (err) {
        return {
          name: item.name,
          version: '1.0.0',
          url: `https://github.com/Adivise/sosu-widgets/raw/main/widgets/${item.name}`,
          downloadUrl: `https://github.com/Adivise/sosu-widgets/archive/refs/heads/main.zip`
        };
      }
    }));

    // Cache and return
    cachedThemes = themes;
    cachedAt = Date.now();
    return themes;
  } catch (err) {
    throw err;
  }
}
