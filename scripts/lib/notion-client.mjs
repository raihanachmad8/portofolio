/**
 * Notion client factory and helpers.
 * Single source of truth for client creation, env parsing, and common API patterns.
 * Replaces duplicated client creation in migrate.mjs, sync.mjs, verify.mjs.
 *
 * @module scripts/lib/notion-client
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, LogLevel } from '@notionhq/client';

const ENV_PATH = resolve(process.cwd(), '.env');

const PLACEHOLDER_PATTERNS = [
  /^secret_x+/i,
  /^x{8,}$/i,
  /^your[-_]/i,
  /your_id/i,
  /your_hook_id/i,
  /example/i,
];

/**
 * Read .env file into a key-value object.
 * @param {string} [envPath] - Path to .env file
 * @returns {Record<string, string>}
 */
export function readEnvFile(envPath = ENV_PATH) {
  if (!existsSync(envPath)) return {};

  const content = readFileSync(envPath, 'utf8');
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

/**
 * Check if an env value is usable (not empty, not a placeholder).
 * @param {string} value
 * @returns {boolean}
 */
export function hasUsableEnvValue(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Normalize a Notion database/page ID (extract from URL if needed).
 * @param {string} value
 * @returns {string}
 */
export function normalizeNotionId(value) {
  if (!value) return '';
  const trimmed = value.trim();
  const fromUrl = trimmed.match(/[0-9a-fA-F]{32}/)?.[0] ?? trimmed;
  return fromUrl.replace(/-/g, '');
}

/**
 * Create a validated Notion client from env.
 * @param {Record<string, string>} [env] - Environment variables (reads .env if not provided)
 * @returns {Client}
 * @throws {Error} If NOTION_TOKEN is missing or placeholder
 */
export function createNotionClient(env = readEnvFile()) {
  const token = env.NOTION_TOKEN?.trim();
  if (!hasUsableEnvValue(token)) {
    throw new Error('NOTION_TOKEN is missing or still a placeholder in .env');
  }

  return new Client({ auth: token, logLevel: LogLevel.ERROR });
}

/**
 * Update .env file with new values.
 * @param {Record<string, string>} updates
 * @param {string} [envPath]
 */
export function updateEnvValues(updates, envPath = ENV_PATH) {
  const existingContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const lines = existingContent ? existingContent.split(/\r?\n/) : [];
  const nextLines = [...lines];

  for (const [key, value] of Object.entries(updates)) {
    const normalizedValue = String(value ?? '');
    const index = nextLines.findIndex((line) => line.startsWith(`${key}=`));

    if (index >= 0) {
      nextLines[index] = `${key}=${normalizedValue}`;
    } else {
      if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') nextLines.push('');
      nextLines.push(`${key}=${normalizedValue}`);
    }
  }

  writeFileSync(envPath, nextLines.join('\n'));
}

/**
 * Resolve the data_source_id for a Notion database.
 * @param {Client} notion
 * @param {string} databaseId
 * @returns {Promise<string>}
 */
export async function resolveDataSourceId(notion, databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const ds = db.data_sources?.[0];
  if (!ds?.id) throw new Error(`No data source found for database ${databaseId}`);
  return ds.id;
}

/**
 * Query all pages from a Notion database (handles pagination).
 * @param {Client} notion
 * @param {string} databaseId
 * @returns {Promise<Array>}
 */
export async function queryAllPages(notion, databaseId) {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const results = [];
  let cursor = undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });

    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

/**
 * Extract plain text from a Notion property value.
 * @param {object} property
 * @returns {string}
 */
export function getPlainText(property) {
  if (!property) return '';
  if (property.type === 'title') return property.title?.map((item) => item.plain_text).join('') ?? '';
  if (property.type === 'rich_text') return property.rich_text?.map((item) => item.plain_text).join('') ?? '';
  if (property.type === 'select') return property.select?.name ?? '';
  if (property.type === 'multi_select') return property.multi_select?.map((item) => item.name).join(',') ?? '';
  if (property.type === 'number') return property.number == null ? '' : String(property.number);
  if (property.type === 'checkbox') return property.checkbox ? 'true' : 'false';
  if (property.type === 'url') return property.url ?? '';
  if (property.type === 'email') return property.email ?? '';
  if (property.type === 'phone_number') return property.phone_number ?? '';
  if (property.type === 'date') return property.date?.start ?? '';
  return '';
}

/**
 * Format a status line for console output.
 * @param {string} label
 * @param {boolean} ok
 * @returns {string}
 */
export function formatStatus(label, ok) {
  return `${ok ? 'ok   ' : 'fail '} ${label}`;
}

/**
 * Find the title property value from a Notion page.
 * @param {object} page
 * @returns {string}
 */
export function findTitle(page) {
  for (const [, prop] of Object.entries(page.properties || {})) {
    if (prop.type === 'title') {
      return prop.title?.map((t) => t.plain_text).join('') ?? '';
    }
  }
  return '';
}

/**
 * Extract a property value from a Notion page.
 * @param {object} page
 * @param {string} field
 * @returns {string}
 */
export function getProp(page, field) {
  return getPlainText(page.properties?.[field]);
}

/**
 * Extract a checkbox property value from a Notion page.
 * @param {object} page
 * @param {string} field
 * @returns {boolean}
 */
export function getCheckbox(page, field) {
  return getProp(page, field) === 'true';
}

/**
 * Convert Notion rich_text annotations to markdown.
 * @param {object} block - A Notion block with rich_text
 * @returns {string}
 */
export function getBlockText(block) {
  if (!block?.rich_text) return '';
  return block.rich_text.map((t) => {
    let s = t.plain_text || '';
    if (t.annotations?.bold) s = '**' + s + '**';
    if (t.annotations?.italic) s = '*' + s + '*';
    if (t.annotations?.code) s = '`' + s + '`';
    return s;
  }).join('');
}

// ─── Notion Property Builders ────────────────────────────────────────────────

/** @param {string} content */
export function toTitleProperty(content) {
  return { title: toRichTextArray(content) };
}

/** @param {string} content */
export function toRichTextProperty(content) {
  return { rich_text: toRichTextArray(content) };
}

const NOTION_RICH_TEXT_CHUNK_SIZE = 1900;

/** @param {string} content */
export function toRichTextArray(content) {
  const text = String(content ?? '').trim();
  if (!text) return [];

  const chunks = [];
  for (let index = 0; index < text.length; index += NOTION_RICH_TEXT_CHUNK_SIZE) {
    chunks.push({
      type: 'text',
      text: { content: text.slice(index, index + NOTION_RICH_TEXT_CHUNK_SIZE) },
    });
  }

  return chunks;
}

/** @param {boolean} value */
export function toCheckboxProperty(value) {
  return { checkbox: Boolean(value) };
}

/** @param {number} value */
export function toNumberProperty(value) {
  return { number: Number.isFinite(value) ? value : null };
}

/** @param {string} value */
export function toUrlProperty(value) {
  return { url: value || null };
}

/** @param {string} value */
export function toSelectProperty(value) {
  return { select: value ? { name: value } : null };
}

/** @param {string[]} values */
export function toMultiSelectProperty(values) {
  return { multi_select: (values ?? []).filter(Boolean).map((value) => ({ name: value })) };
}

/** @param {string} value */
export function toDateProperty(value) {
  return { date: value ? { start: value } : null };
}
