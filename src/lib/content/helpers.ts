import { resolveConfig, isNotionAvailable, type NotionConfig } from '../config';
import { withCache } from './cache';

export function getConfig(runtimeEnv?: Record<string, string | undefined>): NotionConfig {
  return resolveConfig(runtimeEnv || {});
}

export async function fromNotionOrLocal<T>(
  runtimeEnv: Record<string, string | undefined> | undefined,
  cacheKey: string,
  fetchFn: (config: NotionConfig) => Promise<T | null>,
  localFn: () => T,
): Promise<T> {
  const config = getConfig(runtimeEnv);
  if (isNotionAvailable(config)) {
    try {
      const data = await withCache(cacheKey, () => fetchFn(config));
      if (data) return data;
    } catch (e) {
      console.warn(`[Content] Notion fetch failed for ${cacheKey}:`, (e as Error).message);
    }
    return localFn();
  }
  return localFn();
}
