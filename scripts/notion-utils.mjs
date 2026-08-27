import fs from 'node:fs';
import path from 'node:path';
import { Client, LogLevel } from '@notionhq/client';

const ENV_PATH = path.resolve(process.cwd(), '.env');
const PLACEHOLDER_PATTERNS = [
  /^secret_x+/i,
  /^x{8,}$/i,
  /^your[-_]/i,
  /your_id/i,
  /your_hook_id/i,
  /example/i,
];

/**
 * Parses YAML frontmatter from MDX/MD content.
 * @param {string} content - File content with frontmatter
 * @returns {{ metadata: Record<string, string>, body: string }}
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { metadata: {}, body: content };

  const metadata = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();
    // Remove surrounding quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (key) metadata[key] = val;
  }

  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim();
  return { metadata, body };
}

export function readEnvFile(envPath = ENV_PATH) {
  if (!fs.existsSync(envPath)) return {};

  const content = fs.readFileSync(envPath, 'utf8');
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

export function hasUsableEnvValue(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function normalizeNotionId(value) {
  if (!value) return '';
  const trimmed = value.trim();
  const fromUrl = trimmed.match(/[0-9a-fA-F]{32}/)?.[0] ?? trimmed;
  return fromUrl.replace(/-/g, '');
}

export function createNotionClient(env = readEnvFile()) {
  const token = env.NOTION_TOKEN?.trim();
  if (!hasUsableEnvValue(token)) {
    throw new Error('NOTION_TOKEN is missing or still a placeholder in .env');
  }

  return new Client({ auth: token, logLevel: LogLevel.ERROR });
}

export function updateEnvValues(updates, envPath = ENV_PATH) {
  const existingContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
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

  fs.writeFileSync(envPath, nextLines.join('\n'));
}

export function toTitleProperty(content) {
  return {
    title: toRichTextArray(content),
  };
}

export function toRichTextProperty(content) {
  return {
    rich_text: toRichTextArray(content),
  };
}

export function toRichTextArray(content) {
  const text = String(content ?? '').trim();
  if (!text) return [];

  const chunks = [];
  for (let index = 0; index < text.length; index += 1900) {
    chunks.push({
      type: 'text',
      text: {
        content: text.slice(index, index + 1900),
      },
    });
  }

  return chunks;
}

export function toCheckboxProperty(value) {
  return {
    checkbox: Boolean(value),
  };
}

export function toNumberProperty(value) {
  return {
    number: Number.isFinite(value) ? value : null,
  };
}

export function toUrlProperty(value) {
  return {
    url: value || null,
  };
}

export function toEmailProperty(value) {
  return {
    email: value || null,
  };
}

export function toPhoneProperty(value) {
  return {
    phone_number: value || null,
  };
}

export function toSelectProperty(value) {
  return {
    select: value ? { name: value } : null,
  };
}

export function toMultiSelectProperty(values) {
  return {
    multi_select: (values ?? []).filter(Boolean).map((value) => ({ name: value })),
  };
}

export function toDateProperty(value) {
  return {
    date: value ? { start: value } : null,
  };
}

export function toDateRangeProperty(start, end) {
  return {
    date: start ? { start, end: end || null } : null,
  };
}

export async function resolveDataSourceId(notion, databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const ds = db.data_sources?.[0];
  if (!ds?.id) throw new Error(`No data source found for database ${databaseId}`);
  return ds.id;
}

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

export function formatStatus(label, ok) {
  return `${ok ? 'ok   ' : 'fail '} ${label}`;
}
