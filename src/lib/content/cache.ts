const requestCache = new Map<string, Promise<unknown>>();

export function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key) as Promise<T>;
  }
  const promise = fn();
  requestCache.set(key, promise);
  promise.finally(() => requestCache.delete(key));
  return promise;
}
