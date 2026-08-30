/**
 * Sync command — Notion → local files.
 * Pulls data from Notion and writes:
 *   1. src/data/content.json (local fallback)
 *   2. src/content/projects/*.mdx (project files)
 *
 * @module commands/sync
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  createNotionClient,
  formatStatus,
  readEnvFile,
  findTitle,
  getProp,
  getCheckbox,
  queryAllPages,
} from '../lib/notion-client.mjs';
import { blocksToMarkdown } from '../lib/notion-to-md.mjs';
import { slugify } from '../lib/fs.mjs';
import {
  fetchProfileData,
  fetchSkillsData,
  fetchExperienceData,
  fetchProjectsData,
  fetchBlogData,
} from '../lib/notion-data.mjs';

import { CONTENT_JSON, PROJECTS_DIR, EXPERIENCE_DIR } from '../lib/paths.mjs';

function escapeYaml(str) {
  if (!str) return '""';
  if (/[:{}\[\],&*?|>!%@`#]/.test(str) || /^\s|\s$/.test(str) || str === 'true' || str === 'false' || str === 'null' || /^\d/.test(str)) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return str;
}

// ===== Sync JSON =====

async function syncJson(notion, env) {
  console.log('[sync] Fetching from Notion...');

  let profile = {};
  if (env.NOTION_DB_PROFILE) {
    try {
      profile = await fetchProfileData(notion, env.NOTION_DB_PROFILE) || {};
      if (profile.name) console.log('[sync] Profile fetched');
    } catch (e) {
      console.error('[sync] Profile fetch failed:', e.message);
    }
  }

  let experience = [];
  if (env.NOTION_DB_EXPERIENCE) {
    try {
      experience = await fetchExperienceData(notion, env.NOTION_DB_EXPERIENCE);
      console.log(`[sync] Experience fetched: ${experience.length} entries`);
    } catch (e) {
      console.error('[sync] Experience fetch failed:', e.message);
    }
  }

  let skills = { backend: [], frontend: [], database: [], devops: [], tools: { backend: [], frontend: [], devops: [] } };
  if (env.NOTION_DB_SKILLS) {
    try {
      skills = await fetchSkillsData(notion, env.NOTION_DB_SKILLS) || skills;
      console.log('[sync] Skills fetched');
    } catch (e) {
      console.error('[sync] Skills fetch failed:', e.message);
    }
  }

  let projects = [];
  if (env.NOTION_DB_PROJECTS) {
    try {
      projects = await fetchProjectsData(notion, env.NOTION_DB_PROJECTS);
      console.log(`[sync] Projects fetched: ${projects.length} entries`);
    } catch (e) {
      console.error('[sync] Projects fetch failed:', e.message);
    }
  }

  let blog = [];
  if (env.NOTION_DB_BLOG) {
    try {
      blog = await fetchBlogData(notion, env.NOTION_DB_BLOG);
      console.log(`[sync] Blog fetched: ${blog.length} entries`);
    } catch (e) {
      console.error('[sync] Blog fetch failed:', e.message);
    }
  }

  // Fetch ticker
  let tickerItems = [];
  if (env.NOTION_DB_TICKER) {
    try {
      const pages = await queryAllPages(notion, env.NOTION_DB_TICKER);
      tickerItems = pages.map((page) => getProp(page, 'text')).filter(Boolean);
      console.log(`[sync] Ticker fetched: ${tickerItems.length} items`);
    } catch (e) {
      console.error('[sync] Ticker fetch failed:', e.message);
    }
  }

  const data = { profile, skills, tickerItems };
  fs.writeFileSync(CONTENT_JSON, JSON.stringify(data, null, 2));
  console.log(`[sync] Written to ${CONTENT_JSON}`);

  return projects;
}

// ===== Sync MDX =====

async function syncMdx(notion, env) {
  if (!env.NOTION_DB_PROJECTS) return;

  const allPages = await queryAllPages(notion, env.NOTION_DB_PROJECTS);

  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }

  let created = 0;
  let updated = 0;

  for (const page of allPages) {
    const title = findTitle(page);
    if (!title) continue;

    const slug = getProp(page, 'slug') || slugify(title);
    const category = getProp(page, 'category');
    const year = Number(getProp(page, 'year')) || 0;
    const hasUi = getCheckbox(page, 'has_ui');
    const description = getProp(page, 'description');
    const stack = getProp(page, 'stack');
    const githubUrl = getProp(page, 'github_url');
    const liveUrl = getProp(page, 'live_url');
    const featured = getCheckbox(page, 'featured');
    const order = Number(getProp(page, 'order')) || 0;
    const imageUrl = getProp(page, 'image_url');

    let body = '';
    try {
      const blocks = await notion.blocks.children.list({ block_id: page.id, page_size: 100 });
      body = blocksToMarkdown(blocks.results);
    } catch (e) {
      console.log(`  Warning: Could not fetch blocks for "${title}": ${e.message}`);
    }

    const fm = [
      '---',
      `title: ${escapeYaml(title)}`,
      `slug: ${slug}`,
      `category: ${escapeYaml(category)}`,
      `year: ${year}`,
      `has_ui: ${hasUi}`,
      `description: ${escapeYaml(description)}`,
      `stack: ${escapeYaml(stack)}`,
      githubUrl ? `github_url: "${githubUrl}"` : null,
      liveUrl ? `live_url: "${liveUrl}"` : null,
      `featured: ${featured}`,
      imageUrl ? `image_url: "${imageUrl}"` : null,
      `order: ${order}`,
      '---',
    ].filter(Boolean).join('\n');

    const filePath = path.join(PROJECTS_DIR, `${slug}.mdx`);
    const exists = fs.existsSync(filePath);
    fs.writeFileSync(filePath, fm + '\n\n' + body + '\n');
    exists ? updated++ : created++;
    console.log(`  ${exists ? 'Updated' : 'Created'}: ${slug}.mdx`);
  }

  console.log(formatStatus(`MDX sync (${created} created, ${updated} updated)`, true));
}

// ===== Sync Experience MDX =====



async function syncExperienceMdx(notion, env) {
  if (!env.NOTION_DB_EXPERIENCE) return;

  const allPages = await queryAllPages(notion, env.NOTION_DB_EXPERIENCE);

  if (!fs.existsSync(EXPERIENCE_DIR)) {
    fs.mkdirSync(EXPERIENCE_DIR, { recursive: true });
  }

  let created = 0;
  let updated = 0;

  for (const page of allPages) {
    const title = findTitle(page);
    if (!title) continue;

    const company = getProp(page, 'company');
    const period = getProp(page, 'period');
    const location = getProp(page, 'location');
    const detail = getProp(page, 'detail');
    const now = getCheckbox(page, 'now');
    const order = Number(getProp(page, 'order')) || 0;

    const base = slugify(title);
    const companySlug = slugify(company);
    const slug = `${base}-${companySlug}`.slice(0, 80);

    const fm = [
      '---',
      `title: ${escapeYaml(title)}`,
      `company: ${escapeYaml(company)}`,
      `period: ${escapeYaml(period || '')}`,
      `location: ${escapeYaml(location || '')}`,
      `detail: ${escapeYaml(detail || '')}`,
      `now: ${now}`,
      `order: ${order}`,
      '---',
      '',
    ].join('\n');

    const filePath = path.join(EXPERIENCE_DIR, `${slug}.mdx`);
    const exists = fs.existsSync(filePath);
    fs.writeFileSync(filePath, fm);
    exists ? updated++ : created++;
    console.log(`  ${exists ? 'Updated' : 'Created'}: ${slug}.mdx`);
  }

  console.log(formatStatus(`Experience MDX (${created} created, ${updated} updated)`, true));
}

// ===== Main =====

export async function sync() {
  const env = readEnvFile();
  const notion = createNotionClient(env);

  await syncJson(notion, env);
  await syncMdx(notion, env);
  await syncExperienceMdx(notion, env);
}
