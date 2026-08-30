/**
 * Internationalization (i18n) helper.
 * Provides translation lookup with fallback to English.
 * @module i18n
 */

import en from './en.json';
import id from './id.json';

/** Available languages */
export type Locale = 'en' | 'id';

/** Translation dictionaries */
const dictionaries: Record<Locale, Record<string, unknown>> = { en, id };

/** Default locale */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Get a nested value from an object using dot notation.
 * @param obj - Object to search
 * @param path - Dot-separated path (e.g., 'hero.viewWork')
 * @returns Translated string or path as fallback
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return path;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

/**
 * Create a translation function for a given locale.
 * @param locale - Target locale
 * @returns Translation function
 */
export function createTranslator(locale: Locale) {
  const dict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];

  return function t(key: string): string {
    return getNestedValue(dict as Record<string, unknown>, key);
  };
}

/**
 * Detect locale from Astro request (cookie first, then URL).
 * @param cookie - Raw Cookie header from Astro request
 * @param url - Request URL
 * @returns Detected locale
 */
export function detectLocale(cookie: string | undefined, url: URL): Locale {
  if (cookie) {
    const match = cookie.match(/locale=(en|id)/);
    if (match) return match[1] as Locale;
  }
  if (url.pathname.startsWith('/id/')) return 'id';
  return DEFAULT_LOCALE;
}

/**
 * Build localized URL.
 * @param path - Base path
 * @param locale - Target locale
 * @returns Localized URL path
 */
export function localizedPath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path}`;
}

/**
 * Get Open Graph locale code from internal locale.
 * @param locale - Internal locale
 * @returns OG locale code (e.g., 'en_US', 'id_ID')
 */
export function getOgLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    en: 'en_US',
    id: 'id_ID',
  };
  return localeMap[locale] || 'en_US';
}

/**
 * Convenience helper — detect locale and create translator in one call.
 * Replaces the 3-line boilerplate duplicated across 14+ .astro files.
 *
 * @example
 * ```astro
 * ---
 * import { getLocale } from '@i18n';
 * const { locale, t } = getLocale(Astro);
 * ---
 * ```
 */
export function getLocale(context: { request: Request; url: URL }): {
  locale: Locale;
  t: (key: string) => string;
} {
  const locale = detectLocale(context.request.headers.get('cookie') ?? undefined, context.url);
  return { locale, t: createTranslator(locale) };
}
