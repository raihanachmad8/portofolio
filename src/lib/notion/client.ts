/**
 * Notion client factory and database management.
 * Single responsibility: client creation, database discovery, and caching.
 * @module notion-client
 */

import { Client } from '@notionhq/client';
import type { NotionPage, DbType, DbSchema, NotionDataSource, PropertyValue } from './types';
import { blocksToMarkdown } from './markdown';

/** Timeout for Notion API calls in milliseconds */
const QUERY_TIMEOUT_MS = 10_000;

/** Page size for paginated Notion queries */
const NOTION_PAGE_SIZE = 100;

/** Search page size for database discovery */
const SEARCH_PAGE_SIZE = 10;

/** Database display names */
const DB_NAMES: Record<DbType, string> = {
  profile: 'Portfolio Profile',
  projects: 'Portfolio Projects',
  skills: 'Portfolio Skills',
  experience: 'Portfolio Experience',
};

/** Database property schemas */
const DB_SCHEMAS: Record<DbType, DbSchema> = {
  profile: {
    Name: { title: {} },
    full_name: { rich_text: {} },
    short_name: { rich_text: {} },
    role_title: { rich_text: {} },
    hero_sub: { rich_text: {} },
    email: { email: {} },
    github: { url: {} },
    linkedin: { url: {} },
    website: { url: {} },
    cv_url: { rich_text: {} },
    location: { rich_text: {} },
    about_lead: { rich_text: {} },
    about_para_1: { rich_text: {} },
    about_para_2: { rich_text: {} },
    marquee: { rich_text: {} },
    available: { checkbox: {} },
    ticker_items: { rich_text: {} },
    fact_1_value: { number: { format: 'number' } },
    fact_1_label: { rich_text: {} },
    fact_2_value: { number: { format: 'number' } },
    fact_2_label: { rich_text: {} },
    fact_3_value: { number: { format: 'number' } },
    fact_3_label: { rich_text: {} },
    principle_1_title: { rich_text: {} },
    principle_1_desc: { rich_text: {} },
    principle_2_title: { rich_text: {} },
    principle_2_desc: { rich_text: {} },
    principle_3_title: { rich_text: {} },
    principle_3_desc: { rich_text: {} },
    site_title: { rich_text: {} },
    site_description: { rich_text: {} },
    language: { select: { options: [{ name: 'id' }, { name: 'en' }] } },
    theme: { select: { options: [{ name: 'terminal' }, { name: 'editorial' }, { name: 'gallery' }, { name: 'swiss' }] } },
  },
  projects: {
    Name: { title: {} },
    slug: { rich_text: {} },
    category: { select: { options: [
      { name: 'Full-Stack System' }, { name: 'Backend API' }, { name: 'Microservices Backend' },
      { name: 'Web System' }, { name: 'Backend Platform' }, { name: 'Campus Project' },
      { name: 'Competition Project' }, { name: 'Certification Project' }, { name: 'Thesis Project' },
      { name: 'Internship Training' }, { name: 'Internship Requirement' }, { name: 'Personal Initiative' },
    ]}},
    year: { number: { format: 'number' } },
    has_ui: { checkbox: {} },
    description: { rich_text: {} },
    stack: { rich_text: {} },
    github_url: { url: {} },
    live_url: { url: {} },
    featured: { checkbox: {} },
    order: { number: { format: 'number' } },
    image_url: { rich_text: {} },
  },
  skills: {
    Name: { title: {} },
    category: { select: { options: [{ name: 'Backend' }, { name: 'Frontend' }, { name: 'Database' }, { name: 'DevOps' }] } },
    level: { number: { format: 'number' } },
  },
  experience: {
    Name: { title: {} },
    company: { rich_text: {} },
    period: { rich_text: {} },
    location: { rich_text: {} },
    detail: { rich_text: {} },
    now: { checkbox: {} },
    order: { number: { format: 'number' } },
  },
};

/**
 * Cache for resolved database IDs — module-level singleton to avoid repeated
 * Notion search calls within a single process lifecycle. Mutable by design:
 * database IDs are stable and the cache is write-once per key.
 */
const dbIdCache: Partial<Record<DbType, string>> = {};

/**
 * Creates a new Notion client instance.
 * @param auth - Notion API token
 * @returns Configured Notion Client
 */
export function createClient(auth: string): Client {
  return new Client({ auth });
}

/**
 * Finds or creates a database by type.
 * Caches the result for subsequent calls.
 * @param client - Notion client
 * @param type - Database type
 * @param parentPageId - Parent page ID for creation
 * @returns Database ID
 */
async function ensureDatabase(
  client: Client,
  type: DbType,
  parentPageId: string
): Promise<string> {
  if (dbIdCache[type]) return dbIdCache[type];

  const search = await withTimeout(
    client.search({
      query: DB_NAMES[type],
      filter: { value: 'database', property: 'object' },
      page_size: SEARCH_PAGE_SIZE,
    })
  );

  for (const result of search.results) {
    if (result.object === 'database') {
      const title = extractDatabaseTitle(result);
      if (title === DB_NAMES[type]) {
        dbIdCache[type] = result.id;
        return result.id;
      }
    }
  }

  const db = await withTimeout(
    client.databases.create({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: DB_NAMES[type] } }],
      initial_data_source: {
        properties: DB_SCHEMAS[type] as any,
      },
    })
  );

  dbIdCache[type] = db.id;
  return db.id;
}

/**
 * Extracts the title text from a database object.
 * @param database - Notion database object
 * @returns Title string
 */
function extractDatabaseTitle(database: Record<string, unknown>): string {
  const title = database.title;
  if (Array.isArray(title)) {
    return title.map((t: any) => t.plain_text).join('');
  }
  return '';
}

/**
 * Resolves a database ID, using cache or creating if needed.
 * @param client - Notion client
 * @param type - Database type
 * @param explicitId - Optional explicit ID (skips lookup)
 * @param parentPageId - Parent page ID for creation
 * @returns Database ID
 */
export async function resolveDatabaseId(
  client: Client,
  type: DbType,
  explicitId: string | undefined,
  parentPageId: string
): Promise<string> {
  if (explicitId) return explicitId;
  return ensureDatabase(client, type, parentPageId);
}

/**
 * Queries all pages from a Notion database.
 * @param client - Notion client
 * @param databaseId - Database ID
 * @returns Array of Notion pages
 */
export async function queryDatabase(
  client: Client,
  databaseId: string
): Promise<NotionPage[]> {
  const db = await withTimeout(
    client.databases.retrieve({ database_id: databaseId })
  );
  const dsId = (db as any).data_sources?.[0]?.id;
  if (!dsId) return [];

  const results: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await withTimeout(
      (client as any).dataSources.query({
        data_source_id: dsId,
        start_cursor: cursor,
        page_size: NOTION_PAGE_SIZE,
      })
    );
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

/**
 * Extracts the title from a Notion page.
 * @param page - Notion page
 * @returns Title string
 */
export function findTitle(page: NotionPage): string {
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === 'title') {
      return prop.title?.map((t) => t.plain_text).join('') ?? '';
    }
  }
  return '';
}

/**
 * Extracts text content from a Notion property.
 * @param prop - Notion property object
 * @returns Extracted text value
 */
export function getText(prop: PropertyValue): string {
  if (!prop) return '';

  switch (prop.type) {
    case 'rich_text':
      return prop.rich_text?.map((t) => t.plain_text).join('') ?? '';
    case 'title':
      return prop.title?.map((t) => t.plain_text).join('') ?? '';
    case 'select':
      return prop.select?.name ?? '';
    case 'multi_select':
      return prop.multi_select?.map((t) => t.name).join(',') ?? '';
    case 'number':
      return prop.number == null ? '' : String(prop.number);
    case 'checkbox':
      return prop.checkbox ? 'true' : 'false';
    case 'url':
      return prop.url ?? '';
    case 'email':
      return prop.email ?? '';
    case 'date':
      return prop.date?.start ?? '';
    default:
      return '';
  }
}

/**
 * Wraps a promise with a timeout.
 * @param promise - Promise to wrap
 * @param ms - Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
function withTimeout<T>(promise: Promise<T>, ms = QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Notion API timeout after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Fetches all child blocks from a Notion page.
 * @param client - Notion client
 * @param pageId - Page ID
 * @returns Blocks as markdown string
 */
export async function fetchBlocks(
  client: Client,
  pageId: string
): Promise<string> {
  const results: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    const response = await withTimeout(
      client.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: NOTION_PAGE_SIZE,
      })
    );
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return blocksToMarkdown(results);
}
