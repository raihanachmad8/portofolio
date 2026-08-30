import type { APIContext } from 'astro';
import { SITE_CONFIG } from './constants';

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getRuntimeEnv(context: APIContext) {
  return (context.locals as Record<string, unknown>)?.runtime?.env;
}

// Re-export from constants for backward compatibility
export const DEFAULT_THEME = SITE_CONFIG.theme.default;
export const PLACEHOLDER_IMAGE = SITE_CONFIG.images.placeholder;
export const SITE_URL = SITE_CONFIG.url;
export const OG_DEFAULT_IMAGE = SITE_CONFIG.images.og;
export const PROFILE_IMAGE = SITE_CONFIG.images.profile;
export const PROFILE_FORMAL_IMAGE = SITE_CONFIG.images.profileFormal;
export const FEATURED_POST_LIMIT = SITE_CONFIG.content.featuredPostsLimit;

export function resolveImageUrl(path: string | null | undefined, siteUrl?: string): string {
  if (!path) return PLACEHOLDER_IMAGE;
  if (path.startsWith('http')) return path;
  if (!siteUrl) return path;
  return `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const SECTIONS = [
  { id: 'work', tag: '01', label: 'Works' },
  { id: 'about', tag: '02', label: 'About' },
  { id: 'skills', tag: '03', label: 'Skills' },
  { id: 'journey', tag: '04', label: 'Experience' },
  { id: 'blog', tag: '05', label: 'Blog' },
  { id: 'contact', tag: '06', label: 'Contact' },
] as const;
