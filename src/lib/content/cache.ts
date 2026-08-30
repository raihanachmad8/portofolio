/**
 * Cross-request TTL cache for Notion content.
 *
 * Notion fetches take ~1-2s per database, and a homepage render needs several
 * of them — without caching every request re-fetches everything (~9-11s),
 * which makes section navigation from other pages feel broken. This cache
 * keeps results fresh across requests:
 *  - within TTL (60s): instant serve from cache
 *  - after TTL: serve stale immediately, revalidate in the background
 *  - failed fetches are dropped from the cache so the next request retries
 * Content is locale-agnostic (translations are applied at render), so sharing
 * it across requests is safe.
 */
interface CacheEntry {
  promise: Promise<unknown>;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;

const requestCache = new Map<string, CacheEntry>();

function revalidate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const promise = fn();
  const entry: CacheEntry = { promise, expiresAt: Date.now() + CACHE_TTL_MS };
  requestCache.set(key, entry);
  promise.catch(() => {
    if (requestCache.get(key) === entry) requestCache.delete(key);
  });
  return promise as Promise<T>;
}

export function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = requestCache.get(key);
  if (hit) {
    if (hit.expiresAt > Date.now()) return hit.promise as Promise<T>;
    // Stale entry: serve it now, refresh in the background.
    revalidate(key, fn);
    return hit.promise as Promise<T>;
  }
  return revalidate(key, fn);
}
