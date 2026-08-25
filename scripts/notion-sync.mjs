import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.resolve(process.cwd(), '.env');

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

const env = readEnv();
const notion = new Client({ auth: env.NOTION_TOKEN });

function getPlainText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.map(t => t.plain_text).join('') ?? '';
  if (prop.type === 'rich_text') return prop.rich_text?.map(t => t.plain_text).join('') ?? '';
  if (prop.type === 'select') return prop.select?.name ?? '';
  if (prop.type === 'multi_select') return prop.multi_select?.map(s => s.name).join(',') ?? '';
  if (prop.type === 'number') return prop.number == null ? '' : String(prop.number);
  if (prop.type === 'checkbox') return prop.checkbox;
  if (prop.type === 'url') return prop.url ?? '';
  if (prop.type === 'email') return prop.email ?? '';
  if (prop.type === 'date') return prop.date?.start ?? '';
  return '';
}

function blocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    const type = block.type;
    const text = block[type]?.rich_text?.map(t => t.plain_text).join('') ?? '';

    switch (type) {
      case 'heading_1': lines.push(`# ${text}`); break;
      case 'heading_2': lines.push(`## ${text}`); break;
      case 'heading_3': lines.push(`### ${text}`); break;
      case 'paragraph': lines.push(text); break;
      case 'bulleted_list_item': lines.push(`- ${text}`); break;
      case 'numbered_list_item': lines.push(`1. ${text}`); break;
      case 'quote': lines.push(`> ${text}`); break;
      case 'divider': lines.push('---'); break;
      case 'code': {
        const lang = block.code?.language || 'plain text';
        lines.push(`\`\`\`${lang}`, text, '```');
        break;
      }
      default: if (text) lines.push(text);
    }
  }
  return lines.join('\n');
}

async function queryAll(dataSourceId) {
  const results = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function getBlocks(pageId) {
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

async function sync() {
  console.log('Syncing from Notion...\n');
  const output = { version: 1, synced_at: new Date().toISOString() };

  // Get data source IDs from databases
  const dbKeys = {
    projects: env.NOTION_DB_PROJECTS,
    skills: env.NOTION_DB_SKILLS,
    experience: env.NOTION_DB_EXPERIENCE,
    blog: env.NOTION_DB_BLOG,
    settings: env.NOTION_DB_SETTINGS,
  };

  for (const [key, dbId] of Object.entries(dbKeys)) {
    if (!dbId) { console.log(`SKIP: ${key}`); continue; }
    try {
      const db = await notion.databases.retrieve({ database_id: dbId });
      const dsId = db.data_sources?.[0]?.id;
      if (!dsId) { console.log(`SKIP: ${key} (no data source)`); continue; }

      const pages = await queryAll(dsId);
      console.log(`${key}: ${pages.length} items`);

      output[key] = [];
      for (const page of pages) {
        const props = page.properties;
        const item = {};

        for (const [propName, prop] of Object.entries(props)) {
          const camel = propName === 'Name' ? 'name' : propName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          item[camel] = getPlainText(prop);
        }

        // Fetch page content (blocks) for projects
        if (key === 'projects') {
          const blocks = await getBlocks(page.id);
          item.content = blocksToMarkdown(blocks);
          console.log(`  + ${item.name || 'untitled'} (${blocks.length} blocks, ${(item.content || '').length} chars)`);
        } else {
          console.log(`  + ${item.name || item.title || 'untitled'}`);
        }

        output[key].push(item);
      }
    } catch (err) {
      console.error(`Error ${key}:`, err.message);
    }
  }

  // Write output
  const outPath = path.resolve(process.cwd(), 'public/data/content.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const snapPath = path.resolve(process.cwd(), 'src/content/notion-snapshot.json');
  fs.writeFileSync(snapPath, JSON.stringify(output, null, 2));

  console.log('\nSynced → public/data/content.json');
  console.log('Synced → src/content/notion-snapshot.json');
}

sync().catch(err => {
  console.error('Fatal:', err.message);
  process.exitCode = 1;
});
