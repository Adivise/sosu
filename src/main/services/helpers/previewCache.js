/**
 * In-memory cache for theme previews with TTL support
 */

const previewCache = new Map();

/**
 * Default TTL in milliseconds (1 hour)
 */
const DEFAULT_TTL = 60 * 60 * 1000;

/**
 * Get cached value if it exists and hasn't expired
 * @param {string} key - Cache key
 * @returns {string|null} - Cached value or null
 */
export function getCachedPreview(key) {
  if (!previewCache.has(key)) {
    return null;
  }

  const entry = previewCache.get(key);
  const now = Date.now();

  // Check if cache has expired
  if (now > entry.expiresAt) {
    previewCache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Set a preview in cache with expiration
 * @param {string} key - Cache key
 * @param {string} value - Cache value
 * @param {number} ttl - Time to live in milliseconds (default: 1 hour)
 */
export function setCachedPreview(key, value, ttl = DEFAULT_TTL) {
  const expiresAt = Date.now() + ttl;
  previewCache.set(key, { value, expiresAt });
}

/**
 * Clear all cached previews
 */
export function clearAllPreviews() {
  previewCache.clear();
}
