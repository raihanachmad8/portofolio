/**
 * Clean command — archive Notion pages.
 *
 * @module commands/clean
 */

import {
  createNotionClient,
  formatStatus,
  hasUsableEnvValue,
  normalizeNotionId,
  queryAllPages,
  readEnvFile,
} from '../notion-utils.mjs';

const DATABASES = {
  projects: 'NOTION_DB_PROJECTS',
  skills: 'NOTION_DB_SKILLS',
  experience: 'NOTION_DB_EXPERIENCE',
  blog: 'NOTION_DB_BLOG',
  settings: 'NOTION_DB_SETTINGS',
};

async function archiveDatabase(notion, databaseId, label) {
  const pages = await queryAllPages(notion, databaseId);
  let deleted = 0;

  for (const page of pages) {
    try {
      await notion.pages.update({ page_id: page.id, archived: true });
      deleted++;
    } catch (e) {
      console.log(formatStatus(`Failed to archive ${label}: ${e.message}`, false));
    }
  }

  console.log(formatStatus(`${label}: ${deleted} items archived`, true));
  return deleted;
}

export async function clean(flags) {
  const env = readEnvFile();
  const notion = createNotionClient(env);
  const target = flags.type || (flags.all ? 'all' : 'all');

  if (target !== 'all' && !DATABASES[target]) {
    console.error(`Unknown type: ${target}. Use: all, projects, skills, experience, blog, settings`);
    return;
  }

  console.log(`Cleaning: ${target}\n`);
  let totalDeleted = 0;

  for (const [key, envKey] of Object.entries(DATABASES)) {
    if (target !== 'all' && target !== key) continue;

    if (!hasUsableEnvValue(env[envKey])) {
      console.log(formatStatus(`${envKey} not set, skipping`, false));
      continue;
    }

    const deleted = await archiveDatabase(notion, normalizeNotionId(env[envKey]), key);
    totalDeleted += deleted;
  }

  console.log(`\nTotal: ${totalDeleted} items archived`);
  console.log(formatStatus('Clean complete', true));
}
