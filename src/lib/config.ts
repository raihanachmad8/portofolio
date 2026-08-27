/**
 * Application configuration and URL resolution.
 * @module config
 */

import { PLACEHOLDER_IMAGE } from './utils';

/** Notion integration configuration */
export interface NotionConfig {
  /** Notion API token */
  token: string;
  /** Parent page ID for database creation */
  parentPageId: string;
  /** Profile database ID */
  dbProfile: string;
  /** Projects database ID */
  dbProjects: string;
  /** Skills database ID */
  dbSkills: string;
  /** Experience database ID */
  dbExperience: string;
  /** Blog database ID */
  dbBlog: string;
  /** Ticker database ID */
  dbTicker: string;
  /** Data source: 'notion' or 'local' */
  dataSource: 'notion' | 'local';
  /** Whether to fallback to local data on Notion failure */
  fallbackLocal: boolean;
}

/**
 * Resolves Notion configuration from environment variables.
 * @param env - Environment variables (typically from Astro.locals.runtime.env)
 * @returns NotionConfig object
 */
export function resolveConfig(env: Record<string, string | undefined> = {}): NotionConfig {
  const dataSource = (env.PUBLIC_DATA_SOURCE || 'local') as 'notion' | 'local';
  return {
    token: env.NOTION_TOKEN || '',
    parentPageId: env.NOTION_PARENT_PAGE_ID || '',
    dbProfile: env.NOTION_DB_PROFILE || '',
    dbProjects: env.NOTION_DB_PROJECTS || '',
    dbSkills: env.NOTION_DB_SKILLS || '',
    dbExperience: env.NOTION_DB_EXPERIENCE || '',
    dbBlog: env.NOTION_DB_BLOG || '',
    dbTicker: env.NOTION_DB_TICKER || '',
    dataSource,
    fallbackLocal: dataSource === 'notion' && env.NOTION_FALLBACK_LOCAL === 'true',
  };
}

/**
 * Checks if Notion integration is available.
 * @param config - Notion configuration
 * @returns True if Notion is configured and has a token
 */
export function isNotionAvailable(config: NotionConfig): boolean {
  return config.dataSource === 'notion' && !!config.token;
}

/**
 * Resolves an image URL to a full path.
 * Handles local paths, external URLs, and placeholder fallback.
 * @param path - Image path (local or external URL)
 * @param siteUrl - Site base URL for local paths
 * @returns Full image URL
 */
export function resolveImageUrl(path: string | null | undefined, siteUrl?: string): string {
  if (!path) return PLACEHOLDER_IMAGE;
  if (path.startsWith('http')) return path;
  if (!siteUrl) return path;
  return `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
