/**
 * Notion data fetching functions.
 * Single responsibility: query Notion databases and transform to app types.
 * @module notion-queries
 */

import { createClient, queryDatabase, resolveDatabaseId, findTitle, getText, fetchBlocks } from './client';
import type { NotionConfig } from '../config';
import type { NotionPage } from './types';

/** Helper to create a Notion client from config */
function getClient(config: NotionConfig) {
  return createClient(config.token);
}

/** Helper to extract property value from a page */
function getProp(page: NotionPage, field: string): string {
  return getText(page.properties[field]);
}

/** Helper to extract checkbox value from a page */
function getCheckbox(page: NotionPage, field: string): boolean {
  return getProp(page, field) === 'true';
}

/**
 * Generic type-safe Notion database fetcher.
 * Consolidates duplicate pattern from fetchProjects, fetchExperience, etc.
 * @param config - Notion configuration
 * @param dbType - Database type key
 * @param explicitDbId - Optional explicit database ID (skips discovery)
 * @param transformer - Function to transform NotionPage to desired type
 * @returns Transformed array or null on failure
 */
async function _fetch<T>(
  config: NotionConfig,
  dbType: 'projects' | 'skills' | 'experience' | 'profile',
  explicitDbId: string | undefined,
  transformer: (page: NotionPage) => T
): Promise<T[] | null> {
  if (!config.token) return null;

  try {
    const client = getClient(config);
    const dbId = await resolveDatabaseId(client, dbType, explicitDbId, config.parentPageId);
    const pages = await queryDatabase(client, dbId);
    if (pages.length === 0) return null;
    return pages.map(transformer);
  } catch (e) {
    console.error(`[Notion] _fetch(${dbType}) failed:`, (e as Error).message);
    return null;
  }
}

/**
 * Fetches all projects from Notion.
 * @param config - Notion configuration
 * @returns Array of project objects or null on failure
 */
export async function fetchProjects(config: NotionConfig) {
  return _fetch(config, 'projects', config.dbProjects, (page) => ({
    id: page.id,
    title: findTitle(page),
    slug: getProp(page, 'slug'),
    category: getProp(page, 'category'),
    year: Number(getProp(page, 'year')) || 0,
    has_ui: getCheckbox(page, 'has_ui'),
    description: getProp(page, 'description'),
    stack: getProp(page, 'stack'),
    github_url: getProp(page, 'github_url') || null,
    live_url: getProp(page, 'live_url') || null,
      featured: getCheckbox(page, 'featured'),
      order: Number(getProp(page, 'order')) || 0,
    image_url: getProp(page, 'image_url') || null,
  })).then((r) => r?.sort((a, b) => a.order - b.order) ?? null);
}

/**
 * Fetches the profile from Notion.
 * @param config - Notion configuration
 * @returns Profile object or null on failure
 */
export async function fetchProfile(config: NotionConfig) {
  if (!config.token) return null;

  try {
    const client = getClient(config);
    const dbId = await resolveDatabaseId(client, 'profile', config.dbProfile, config.parentPageId);
    const pages = await queryDatabase(client, dbId);
    if (pages.length === 0) return null;

    const p = pages[0];
    const get = (field: string) => getProp(p, field);
    const getNum = (field: string) => Number(get(field)) || 0;

    // Dynamically discover all fact_N_value/fact_N_label pairs
    const facts: { value: number; label: string }[] = [];
    for (let i = 1; i <= 20; i++) {
      const value = getNum(`fact_${i}_value`);
      const label = get(`fact_${i}_label`);
      if (!label && value === 0) break;
      facts.push({ value, label });
    }

    // Dynamically discover all principle_N_title/principle_N_desc pairs
    const principles: { no: string; title: string; description: string }[] = [];
    for (let i = 1; i <= 20; i++) {
      const title = get(`principle_${i}_title`);
      const description = get(`principle_${i}_desc`);
      if (!title) break;
      principles.push({ no: String(i).padStart(2, '0'), title, description });
    }

    return {
      name: get('full_name') || get('Name'),
      shortName: get('short_name'),
      roleTitle: get('role_title'),
      heroSub: get('hero_sub'),
      email: get('email'),
      github: get('github'),
      linkedin: get('linkedin'),
      website: get('website'),
      cv_url: get('cv_url'),
      location: get('location'),
      aboutLead: get('about_lead'),
      aboutParas: [get('about_para_1'), get('about_para_2')].filter(Boolean),
      marquee: get('marquee').split(',').map((s) => s.trim()).filter(Boolean),
      available: getCheckbox(p, 'available'),
      tickerItems: get('ticker_items').split('\n').filter(Boolean),
      facts,
      principles,
    };
  } catch (e) {
    console.error('[Notion] fetchProfile failed:', (e as Error).message);
    return null;
  }
}

/**
 * Fetches page content blocks from Notion.
 * @param config - Notion configuration
 * @param pageId - Page ID to fetch blocks from
 * @returns Markdown string or empty string
 */
export async function fetchPageBlocks(config: NotionConfig, pageId: string): Promise<string> {
  if (!config.token) return '';
  const client = getClient(config);
  return fetchBlocks(client, pageId);
}

/**
 * Fetches skills grouped by category from Notion.
 * @param config - Notion configuration
 * @returns Skills grouped by category or null on failure
 */
export async function fetchSkills(config: NotionConfig) {
  return _fetch(config, 'skills', config.dbSkills, (page) => ({
    category: getProp(page, 'category').toLowerCase(),
    name: findTitle(page),
    level: Number(getProp(page, 'level')) || 0,
  })).then((items) => {
    if (!items) return null;
    const skills: Record<string, { name: string; level: number }[]> = {
      backend: [], frontend: [], database: [], devops: [],
    };
    const tools: string[] = [];
    for (const item of items) {
      if (item.category === 'tools') {
        tools.push(item.name);
      } else if (skills[item.category]) {
        skills[item.category].push({ name: item.name, level: item.level });
      }
    }
    return { ...skills, tools: { backend: tools, frontend: tools, devops: tools } };
  });
}

/**
 * Fetches experience entries from Notion.
 * @param config - Notion configuration
 * @returns Array of experience objects or null on failure
 */
export async function fetchExperience(config: NotionConfig) {
  return _fetch(config, 'experience', config.dbExperience, (page) => ({
    title: findTitle(page),
    company: getProp(page, 'company'),
    period: getProp(page, 'period'),
    location: getProp(page, 'location'),
    detail: getProp(page, 'detail'),
    now: getCheckbox(page, 'now'),
    order: Number(getProp(page, 'order')) || 0,
  })).then((r) => r?.sort((a, b) => a.order - b.order) ?? null);
}

/**
 * Fetches blog posts from Notion.
 * @param config - Notion configuration
 * @returns Array of blog objects or null on failure
 */
export async function fetchBlog(config: NotionConfig) {
  return _fetch(config, 'blog', config.dbBlog, (page) => ({
    id: page.id,
    title: findTitle(page),
    slug: getProp(page, 'slug'),
    category: getProp(page, 'category'),
    excerpt: getProp(page, 'excerpt'),
    published_date: getProp(page, 'published_date'),
    read_time: Number(getProp(page, 'read_time')) || 5,
    tags: getProp(page, 'tags').split(',').filter(Boolean),
    featured: getCheckbox(page, 'featured'),
    order: Number(getProp(page, 'order')) || 0,
  })).then((r) => r?.sort((a, b) => a.order - b.order) ?? null);
}

/**
 * Fetches ticker items from Notion.
 * @param config - Notion configuration
 * @returns Array of ticker items or null on failure
 */
export async function fetchTicker(config: NotionConfig) {
  return _fetch(config, 'profile', config.dbTicker, (page) => ({
    icon: getProp(page, 'icon'),
    text: getProp(page, 'text'),
    order: Number(getProp(page, 'order')) || 0,
  })).then((r) => r?.sort((a, b) => a.order - b.order) ?? null);
}
