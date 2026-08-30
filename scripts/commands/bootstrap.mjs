/**
 * Bootstrap command — create Notion databases.
 *
 * @module commands/bootstrap
 */

import {
  createNotionClient,
  formatStatus,
  hasUsableEnvValue,
  normalizeNotionId,
  readEnvFile,
  toRichTextArray,
  updateEnvValues,
} from '../lib/notion-client.mjs';
import {
  PROJECT_STACK_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  BLOG_TAG_OPTIONS,
  SKILL_CATEGORY_OPTIONS,
  BLOG_CATEGORY_OPTIONS,
} from '../notion-options.mjs';

async function ensureDatabase(notion, env, { envKey, title, properties }) {
  const existingId = normalizeNotionId(env[envKey]);

  if (hasUsableEnvValue(existingId)) {
    const database = await notion.databases.retrieve({ database_id: existingId });
    const existingTitle = database.title?.map((item) => item.plain_text).join('') || existingId;
    console.log(formatStatus(`${envKey} already set -> ${existingTitle}`, true));
    return existingId;
  }

  const parentPageId = normalizeNotionId(env.NOTION_PARENT_PAGE_ID);
  if (!hasUsableEnvValue(parentPageId)) {
    throw new Error(`Cannot create ${envKey} because NOTION_PARENT_PAGE_ID is missing in .env`);
  }

  // Use raw HTTP API — SDK doesn't forward properties correctly
  const res = await fetch('https://api.notion.com/v1/databases', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.NOTION_TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: title } }],
      properties,
    }),
  });

  const data = await res.json();
  if (!data.id) {
    throw new Error(`Failed to create ${envKey}: ${data.message || JSON.stringify(data)}`);
  }

  const databaseId = data.id.replace(/-/g, '');
  updateEnvValues({ [envKey]: databaseId });
  console.log(formatStatus(`${envKey} created -> ${title}`, true));
  return databaseId;
}

export async function bootstrap() {
  const env = readEnvFile();
  const notion = createNotionClient(env);

  const parentPageId = normalizeNotionId(env.NOTION_PARENT_PAGE_ID);
  if (hasUsableEnvValue(parentPageId)) {
    await notion.pages.retrieve({ page_id: parentPageId });
    console.log(formatStatus('NOTION_PARENT_PAGE_ID accessible', true));
  } else {
    console.log(formatStatus('NOTION_PARENT_PAGE_ID missing', false));
  }

  await ensureDatabase(notion, env, {
    envKey: 'NOTION_DB_PROJECTS',
    title: 'Portfolio Projects',
    properties: {
      title: { title: {} },
      category: { select: { options: PROJECT_CATEGORY_OPTIONS.map((name) => ({ name })) } },
      year: { number: { format: 'number' } },
      has_ui: { checkbox: {} },
      description: { rich_text: {} },
      stack: { multi_select: { options: PROJECT_STACK_OPTIONS.map((name) => ({ name })) } },
      github_url: { url: {} },
      live_url: { url: {} },
      featured: { checkbox: {} },
      order: { number: { format: 'number' } },
    },
  });

  await ensureDatabase(notion, env, {
    envKey: 'NOTION_DB_SKILLS',
    title: 'Portfolio Skills',
    properties: {
      title: { title: {} },
      category: { select: { options: SKILL_CATEGORY_OPTIONS.map((name) => ({ name })) } },
      level: { number: { format: 'number' } },
    },
  });

  await ensureDatabase(notion, env, {
    envKey: 'NOTION_DB_EXPERIENCE',
    title: 'Portfolio Experience',
    properties: {
      title: { title: {} },
      company: { rich_text: {} },
      period: { rich_text: {} },
      location: { rich_text: {} },
      detail: { rich_text: {} },
      now: { checkbox: {} },
      order: { number: { format: 'number' } },
    },
  });

  await ensureDatabase(notion, env, {
    envKey: 'NOTION_DB_BLOG',
    title: 'Portfolio Blog',
    properties: {
      title: { title: {} },
      slug: { rich_text: {} },
      category: { select: { options: BLOG_CATEGORY_OPTIONS.map((name) => ({ name })) } },
      excerpt: { rich_text: {} },
      published_date: { date: {} },
      read_time: { number: { format: 'number' } },
      tags: { multi_select: { options: BLOG_TAG_OPTIONS.map((name) => ({ name })) } },
      featured: { checkbox: {} },
    },
  });

  await ensureDatabase(notion, env, {
    envKey: 'NOTION_DB_SETTINGS',
    title: 'Portfolio Settings',
    properties: {
      key: { title: {} },
      value: { rich_text: {} },
    },
  });

  await ensureDatabase(notion, env, {
    envKey: 'NOTION_DB_TICKER',
    title: 'Portfolio Ticker',
    properties: {
      title: { title: {} },
      icon: { rich_text: {} },
      text: { rich_text: {} },
      order: { number: { format: 'number' } },
    },
  });
}
