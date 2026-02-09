import https from 'https';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map(); // url -> { response: {statusCode, headers, body}, fetchedAt }
let rateLimitedUntil = 0; // timestamp (ms) until which GitHub requests should be blocked

function isRateLimited() {
  return Date.now() < rateLimitedUntil;
}

export function getRateLimitInfo() {
  return { rateLimitedUntil };
}

export async function githubFetch(url, cacheTTL = DEFAULT_TTL, options = {}) {
  const maxRetries = typeof options.retries === 'number' ? options.retries : 3;
  const baseDelay = typeof options.baseDelay === 'number' ? options.baseDelay : 200; // ms

  // If we recently discovered we're rate limited, short-circuit
  if (isRateLimited()) {
    const reset = Math.ceil(rateLimitedUntil / 1000);
    return { statusCode: 429, headers: { 'x-ratelimit-reset': String(reset) }, body: '' };
  }

  const cached = cache.get(url);
  if (cached && (Date.now() - cached.fetchedAt) < cacheTTL) {
    return cached.response;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'sosu-app' } }, (res) => {
          const headers = res.headers || {};
          const chunks = [];
          res.on('data', chunk => chunks.push(Buffer.from(chunk)));
          res.on('end', () => {
            const bodyBuffer = Buffer.concat(chunks);
            // Prefer returning utf8 string for JSON/HTML endpoints
            const body = bodyBuffer.toString('utf8');
            resolve({ statusCode: res.statusCode, headers, body, bodyBuffer });
          });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy(new Error('Request timed out'));
        });
      });

      const remaining = response.headers && response.headers['x-ratelimit-remaining'];
      const reset = response.headers && response.headers['x-ratelimit-reset'];

      // If GitHub reports we've exhausted the limit, set rateLimitedUntil and return immediately
      if ((response.statusCode === 429) || (response.statusCode === 403 && remaining === '0')) {
        if (reset) {
          rateLimitedUntil = Number(reset) * 1000;
          console.warn('[githubClient] GitHub rate limit reached; pausing requests until', new Date(rateLimitedUntil).toISOString());
        }
        cache.set(url, { response, fetchedAt: Date.now() });
        return response;
      }

      // Retry on 5xx server errors
      if (response.statusCode >= 500 && response.statusCode < 600) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        cache.set(url, { response, fetchedAt: Date.now() });
        return response;
      }

      // Cache and return for successful or other statuses
      cache.set(url, { response, fetchedAt: Date.now() });
      return response;
    } catch (err) {
      // Network/timeout errors: retry with backoff
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}
