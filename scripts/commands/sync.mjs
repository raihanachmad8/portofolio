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
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@notionhq/client';
import {
  createNotionClient,
  formatStatus,
  getPlainText,
  queryAllPages,
  readEnvFile,
} from '../notion-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, '../../src/data/content.json');
const MDX_DIR = resolve(__dirname, '../../src/content/projects');

function getProp(page, field) {
  return getPlainText(page.properties?.[field]);
}

function getCheckbox(page, field) {
  return getProp(page, field) === 'true';
}

function findTitle(page) {
  for (const [, prop] of Object.entries(page.properties || {})) {
    if (prop.type === 'title') {
      return prop.title?.map((t) => t.plain_text).join('') ?? '';
    }
  }
  return '';
}

// ===== Notion blocks → Markdown =====

function getBlockText(block) {
  if (!block?.rich_text) return '';
  return block.rich_text.map((t) => {
    let s = t.plain_text || '';
    if (t.annotations?.bold) s = '**' + s + '**';
    if (t.annotations?.italic) s = '*' + s + '*';
    if (t.annotations?.code) s = '`' + s + '`';
    return s;
  }).join('');
}

function blocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading_1':
        lines.push('# ' + getBlockText(block.heading_1));
        break;
      case 'heading_2':
        lines.push('## ' + getBlockText(block.heading_2));
        break;
      case 'heading_3':
        lines.push('### ' + getBlockText(block.heading_3));
        break;
      case 'paragraph':
        lines.push(getBlockText(block.paragraph));
        break;
      case 'bulleted_list_item':
        lines.push('- ' + getBlockText(block.bulleted_list_item));
        break;
      case 'numbered_list_item':
        lines.push('1. ' + getBlockText(block.numbered_list_item));
        break;
      case 'code': {
        const lang = block.code?.language || '';
        lines.push('```' + lang);
        lines.push(getBlockText(block.code));
        lines.push('```');
        break;
      }
      case 'quote':
        lines.push('> ' + getBlockText(block.quote));
        break;
      case 'divider':
        lines.push('---');
        break;
      case 'image': {
        const img = block.image;
        const url = img?.external?.url || img?.file?.url || '';
        const caption = img?.caption ? getBlockText(img) : '';
        lines.push(`![${caption}](${url})`);
        break;
      }
      case 'callout': {
        const icon = block.callout?.icon?.type === 'emoji' ? block.callout.icon.emoji + ' ' : '';
        lines.push('> ' + icon + getBlockText(block.callout));
        break;
      }
      case 'table': {
        const rows = block.table?.children || [];
        for (let i = 0; i < rows.length; i++) {
          const cells = rows[i]?.table_row?.cells || [];
          const cellTexts = cells.map((cell) =>
            cell.map((t) => {
              let s = t.plain_text || '';
              if (t.annotations?.bold) s = '**' + s + '**';
              if (t.annotations?.italic) s = '*' + s + '*';
              if (t.annotations?.code) s = '`' + s + '`';
              return s;
            }).join('')
          );
          lines.push('| ' + cellTexts.join(' | ') + ' |');
          if (i === 0) lines.push('| ' + cellTexts.map(() => '---').join(' | ') + ' |');
        }
        break;
      }
      default:
        break;
    }
  }
  return lines.join('\n');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeYaml(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Always quote to prevent YAML type coercion (numbers, booleans)
  return '"' + str.replace(/"/g, '\\"') + '"';
}

// ===== Sync JSON =====

async function syncJson(notion, env) {
  console.log('[sync] Fetching from Notion...');

  let profile = {};
  if (env.NOTION_DB_PROFILE) {
    try {
      const pages = await queryAllPages(notion, env.NOTION_DB_PROFILE);
      if (pages.length > 0) {
        const p = pages[0];
        const get = (f) => getProp(p, f);
        const getNum = (f) => Number(get(f)) || 0;

        const facts = [];
        for (let i = 1; i <= 20; i++) {
          const value = getNum(`fact_${i}_value`);
          const label = get(`fact_${i}_label`);
          if (!label && value === 0) break;
          facts.push({ value, label });
        }

        const principles = [];
        for (let i = 1; i <= 20; i++) {
          const title = get(`principle_${i}_title`);
          const description = get(`principle_${i}_desc`);
          if (!title) break;
          principles.push({ no: String(i).padStart(2, '0'), title, description });
        }

        profile = {
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
        console.log('[sync] Profile fetched');
      }
    } catch (e) {
      console.error('[sync] Profile fetch failed:', e.message);
    }
  }

  let experience = [];
  if (env.NOTION_DB_EXPERIENCE) {
    try {
      const pages = await queryAllPages(notion, env.NOTION_DB_EXPERIENCE);
      experience = pages.map((page) => ({
        title: findTitle(page),
        company: getProp(page, 'company'),
        period: getProp(page, 'period'),
        location: getProp(page, 'location'),
        detail: getProp(page, 'detail'),
        now: getCheckbox(page, 'now'),
        order: Number(getProp(page, 'order')) || 0,
      })).sort((a, b) => a.order - b.order);
      console.log(`[sync] Experience fetched: ${experience.length} entries`);
    } catch (e) {
      console.error('[sync] Experience fetch failed:', e.message);
    }
  }

  let skills = { backend: [], frontend: [], database: [], devops: [], tools: { backend: [], frontend: [], devops: [] } };
  if (env.NOTION_DB_SKILLS) {
    try {
      const pages = await queryAllPages(notion, env.NOTION_DB_SKILLS);
      const toolsList = [];
      for (const page of pages) {
        const category = getProp(page, 'category').toLowerCase();
        const name = findTitle(page);
        const level = Number(getProp(page, 'level')) || 0;
        if (category === 'tools') {
          toolsList.push(name);
        } else if (skills[category]) {
          skills[category].push({ name, level });
        }
      }
      skills.tools = { backend: toolsList, frontend: toolsList, devops: toolsList };
      console.log('[sync] Skills fetched');
    } catch (e) {
      console.error('[sync] Skills fetch failed:', e.message);
    }
  }

  let projects = [];
  if (env.NOTION_DB_PROJECTS) {
    try {
      const pages = await queryAllPages(notion, env.NOTION_DB_PROJECTS);
      projects = pages.map((page) => ({
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
      })).sort((a, b) => a.order - b.order);
      console.log(`[sync] Projects fetched: ${projects.length} entries`);
    } catch (e) {
      console.error('[sync] Projects fetch failed:', e.message);
    }
  }

  // Fetch blog
  let blog = [];
  if (env.NOTION_DB_BLOG) {
    try {
      const pages = await queryAllPages(notion, env.NOTION_DB_BLOG);
      blog = pages.map((page) => ({
        title: findTitle(page),
        slug: getProp(page, 'slug'),
        category: getProp(page, 'category'),
        excerpt: getProp(page, 'excerpt'),
        published_date: getProp(page, 'published_date'),
        read_time: Number(getProp(page, 'read_time')) || 5,
        tags: getProp(page, 'tags').split(',').filter(Boolean),
        featured: getCheckbox(page, 'featured'),
        order: Number(getProp(page, 'order')) || 0,
      })).sort((a, b) => a.order - b.order);
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
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
  console.log(`[sync] Written to ${JSON_PATH}`);

  return projects;
}

// ===== Sync MDX =====

async function syncMdx(notion, env) {
  if (!env.NOTION_DB_PROJECTS) return;

  const c = new Client({ auth: env.NOTION_TOKEN });
  const db = await c.databases.retrieve({ database_id: env.NOTION_DB_PROJECTS });
  const dsId = db.data_sources[0].id;
  const result = await c.dataSources.query({ data_source_id: dsId, page_size: 100 });

  if (!fs.existsSync(MDX_DIR)) {
    fs.mkdirSync(MDX_DIR, { recursive: true });
  }

  let created = 0;
  let updated = 0;

  for (const page of result.results) {
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
      const blocks = await c.blocks.children.list({ block_id: page.id, page_size: 100 });
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

    const filePath = path.join(MDX_DIR, `${slug}.mdx`);
    const exists = fs.existsSync(filePath);
    fs.writeFileSync(filePath, fm + '\n\n' + body + '\n');
    exists ? updated++ : created++;
    console.log(`  ${exists ? 'Updated' : 'Created'}: ${slug}.mdx`);
  }

  console.log(formatStatus(`MDX sync (${created} created, ${updated} updated)`, true));
}

// ===== Sync Experience MDX =====

const EXP_DIR = resolve(__dirname, '../../src/content/experience');

async function syncExperienceMdx(notion, env) {
  if (!env.NOTION_DB_EXPERIENCE) return;

  const c = new Client({ auth: env.NOTION_TOKEN });
  const db = await c.databases.retrieve({ database_id: env.NOTION_DB_EXPERIENCE });
  const dsId = db.data_sources[0].id;
  const result = await c.dataSources.query({ data_source_id: dsId, page_size: 100 });

  if (!fs.existsSync(EXP_DIR)) {
    fs.mkdirSync(EXP_DIR, { recursive: true });
  }

  let created = 0;
  let updated = 0;

  for (const page of result.results) {
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

    const filePath = path.join(EXP_DIR, `${slug}.mdx`);
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
