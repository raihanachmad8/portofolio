/**
 * Shared utility functions and constants.
 * @module utils
 */

/**
 * Formats a date string to a readable format.
 * @param d - ISO date string
 * @returns Formatted date (e.g., "Aug 26, 2026")
 */
export function fmtDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Extracts runtime environment from Astro context.
 * @param Astro - Astro global context
 * @returns Runtime environment variables
 */
export function getRuntimeEnv(Astro: Record<string, unknown>) {
  return (Astro.locals as Record<string, unknown>)?.runtime?.env;
}

/** Default theme name */
export const DEFAULT_THEME = 'gallery';

/** Placeholder image path for missing images */
export const PLACEHOLDER_IMAGE = '/images/placeholder.svg';

/** Site section definitions */
export const SECTIONS = [
  { id: 'work', tag: '01', label: 'Works' },
  { id: 'about', tag: '02', label: 'About' },
  { id: 'skills', tag: '03', label: 'Skills' },
  { id: 'journey', tag: '04', label: 'Experience' },
  { id: 'blog', tag: '05', label: 'Blog' },
  { id: 'contact', tag: '06', label: 'Contact' },
] as const;
