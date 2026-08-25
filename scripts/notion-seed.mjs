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

// Load local content
const contentPath = path.resolve(process.cwd(), 'public/data/content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

function rt(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  return [{ type: 'text', text: { content: t } }];
}

function h2(text) {
  return { type: 'heading_2', heading_2: { rich_text: rt(text), color: 'default' } };
}

function p(text) {
  return { type: 'paragraph', paragraph: { rich_text: rt(text) } };
}

function li(text) {
  return { type: 'bulleted_list_item', bulleted_list_item: { rich_text: rt(text), color: 'default' } };
}

function markdownToBlocks(md) {
  if (!md) return [];
  const blocks = [];
  let codeLines = [];
  let codeLang = null;

  for (const raw of md.split('\n')) {
    const line = raw.trim();

    if (line.startsWith('```')) {
      if (codeLang !== null) {
        blocks.push({ type: 'code', code: { rich_text: rt(codeLines.join('\n')), language: 'plain text', caption: [] } });
        codeLines = [];
        codeLang = null;
      } else {
        codeLang = line.slice(3).trim() || 'plain text';
      }
      continue;
    }
    if (codeLang !== null) { codeLines.push(raw); continue; }

    if (!line) continue;
    if (line.startsWith('## ')) { blocks.push(h2(line.slice(3))); continue; }
    if (line.startsWith('### ')) { blocks.push({ type: 'heading_3', heading_3: { rich_text: rt(line.slice(4)), color: 'default' } }); continue; }
    if (line.startsWith('- ')) { blocks.push(li(line.slice(2))); continue; }
    if (line.startsWith('> ')) { blocks.push({ type: 'quote', quote: { rich_text: rt(line.slice(2)), color: 'default' } }); continue; }
    if (line === '---') { blocks.push({ type: 'divider', divider: {} }); continue; }
    if (line.startsWith('|')) continue; // skip table rows
    blocks.push(p(line));
  }

  if (codeLang !== null && codeLines.length) {
    blocks.push({ type: 'code', code: { rich_text: rt(codeLines.join('\n')), language: 'plain text', caption: [] } });
  }

  return blocks;
}

async function createPage(dsId, properties, children = []) {
  const initial = children.slice(0, 100);
  const rest = children.slice(100);

  const page = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dsId },
    properties,
    children: initial,
  });

  for (let i = 0; i < rest.length; i += 100) {
    await notion.blocks.children.append({ block_id: page.id, children: rest.slice(i, i + 100) });
  }

  return page;
}

async function seedProjects() {
  const dbId = env.NOTION_DB_PROJECTS;
  if (!dbId) { console.log('SKIP: NOTION_DB_PROJECTS'); return; }

  // Get data source ID
  const db = await notion.databases.retrieve({ database_id: dbId });
  const dsId = db.data_sources?.[0]?.id;
  if (!dsId) { console.log('SKIP: No data source for projects'); return; }

  let created = 0;
  for (const pr of content.projects) {
    const children = pr.content ? markdownToBlocks(pr.content) : [];

    await createPage(dsId, {
      Name: { title: rt(pr.title) },
      slug: { rich_text: rt(pr.slug) },
      category: { multi_select: [{ name: pr.category }] },
      year: { number: pr.year },
      has_ui: { checkbox: pr.has_ui !== false },
      description: { rich_text: rt(pr.description) },
      content: { rich_text: rt(pr.content || '') },
      stack: { rich_text: rt(pr.stack) },
      github_url: { url: pr.github_url || null },
      live_url: { url: pr.live_url || null },
      featured: { checkbox: pr.featured || false },
      card_color: { select: { name: pr.card_color || 'green' } },
      order: { number: pr.order || 0 },
    }, children);

    created++;
    console.log(`  + ${pr.title}`);
  }

  console.log(`Projects: ${created} created`);
}

async function seedSkills() {
  const dbId = env.NOTION_DB_SKILLS;
  if (!dbId) { console.log('SKIP: NOTION_DB_SKILLS'); return; }

  const db = await notion.databases.retrieve({ database_id: dbId });
  const dsId = db.data_sources?.[0]?.id;
  if (!dsId) { console.log('SKIP: No data source for skills'); return; }

  let created = 0;
  let order = 0;
  for (const [cat, skills] of Object.entries(content.skills)) {
    if (cat === 'tools') continue;
    for (const sk of skills) {
      await createPage(dsId, {
        Name: { title: rt(sk.name) },
        category: { select: { name: cat.charAt(0).toUpperCase() + cat.slice(1) } },
        level: { number: sk.level },
        order: { number: order++ },
      });
      created++;
      console.log(`  + ${sk.name}`);
    }
  }

  console.log(`Skills: ${created} created`);
}

async function seedExperience() {
  const dbId = env.NOTION_DB_EXPERIENCE;
  if (!dbId) { console.log('SKIP: NOTION_DB_EXPERIENCE'); return; }

  const db = await notion.databases.retrieve({ database_id: dbId });
  const dsId = db.data_sources?.[0]?.id;
  if (!dsId) { console.log('SKIP: No data source for experience'); return; }

  let created = 0;
  for (const exp of content.experience) {
    await createPage(dsId, {
      Name: { title: rt(exp.title) },
      company: { rich_text: rt(exp.company) },
      period: { rich_text: rt(exp.period) },
      location: { rich_text: rt(exp.location) },
      detail: { rich_text: rt(exp.detail) },
      now: { checkbox: exp.now || false },
      order: { number: exp.order || 0 },
    });
    created++;
    console.log(`  + ${exp.title} @ ${exp.company}`);
  }

  console.log(`Experience: ${created} created`);
}

async function seedConfig() {
  const dbId = env.NOTION_DB_SETTINGS;
  if (!dbId) { console.log('SKIP: NOTION_DB_SETTINGS'); return; }

  const db = await notion.databases.retrieve({ database_id: dbId });
  const dsId = db.data_sources?.[0]?.id;
  if (!dsId) { console.log('SKIP: No data source for settings'); return; }

  const s = content.settings;
  const p = content.profile;

  await createPage(dsId, {
    Name: { title: rt('Site Config') },
    site_title: { rich_text: rt(s.site_title) },
    site_description: { rich_text: rt(s.site_description) },
    theme: { select: { name: s.theme || 'terminal' } },
    language: { select: { name: s.language || 'en' } },
    email: { email: p.email || null },
    github: { url: p.github || null },
    linkedin: { url: p.linkedin || null },
  });

  console.log('Settings: 1 created');
}

async function main() {
  console.log('Notion Seed — Populating databases...\n');

  await seedProjects();
  await seedSkills();
  await seedExperience();
  await seedConfig();

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
