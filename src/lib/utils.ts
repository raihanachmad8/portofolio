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

/**
 * Retrieves Cloudflare Workers runtime environment variables from Astro context.
 * In Cloudflare Pages with SSR, environment variables are available at:
 * context.locals.runtime.env
 *
 * @param context - Astro API context
 * @returns Runtime environment object or undefined
 * @throws Warning if runtime.env is not available (dev mode is OK, production is a problem)
 */
export function getRuntimeEnv(context: APIContext): Record<string, any> | undefined {
  const runtime = (context.locals as any)?.runtime;
  
  if (!runtime) {
    // In local dev, this is expected - env vars come from .env files
    if (import.meta.env.DEV) {
      return undefined;
    }
    console.warn('[SSR] Runtime not found in context.locals - this may cause issues in production');
    return undefined;
  }
  
  if (!runtime.env) {
    console.error('[SSR] runtime.env not found - environment variables may not be bound correctly');
    console.error('[SSR] Check Cloudflare Pages dashboard → Settings → Environment Variables');
    return undefined;
  }
  
  return runtime.env;
}

/**
 * Validates required Notion environment variables are present.
 * Useful for debugging SSR issues related to missing config.
 *
 * @param env - Environment object (from getRuntimeEnv or import.meta.env)
 * @returns Object indicating which vars are missing
 */
export function validateNotionEnv(env: Record<string, any> = {}): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    'NOTION_TOKEN',
    'NOTION_DB_PROFILE',
    'NOTION_DB_PROJECTS',
    'NOTION_DB_SKILLS',
    'NOTION_DB_EXPERIENCE',
  ];
  
  const missing = required.filter((key) => !env[key]);
  
  if (missing.length > 0) {
    console.error('[Notion Config] Missing required environment variables:', missing);
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
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
