import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.resolve(process.cwd(), '.env');

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const env = {};
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

function updateEnv(key, value) {
  const env = readEnv();
  env[key] = value;
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');
}

const env = readEnv();
const notion = new Client({ auth: env.NOTION_TOKEN });

const DB_CONFIGS = {
  projects: {
    title: 'Portfolio Projects',
    properties: {
      slug: { rich_text: {} },
      category: { multi_select: { options: [
        { name: 'Full-Stack Web System' }, { name: 'Microservices Backend' },
        { name: 'Backend API' }, { name: 'Web System' }, { name: 'Backend Platform' },
        { name: 'Full-Stack System' },
      ]}},
      year: { number: { format: 'number' } },
      has_ui: { checkbox: {} },
      description: { rich_text: {} },
      content: { rich_text: {} },
      stack: { rich_text: {} },
      github_url: { url: {} },
      live_url: { url: {} },
      featured: { checkbox: {} },
      card_color: { select: { options: [
        { name: 'green' }, { name: 'slate' }, { name: 'teal' },
        { name: 'amber' }, { name: 'coral' }, { name: 'blue' },
      ]}},
      order: { number: { format: 'number' } },
    },
  },
  skills: {
    title: 'Portfolio Skills',
    properties: {
      category: { select: { options: [
        { name: 'Backend' }, { name: 'Frontend' }, { name: 'DevOps' },
      ]}},
      level: { number: { format: 'number' } },
      order: { number: { format: 'number' } },
    },
  },
  experience: {
    title: 'Portfolio Experience',
    properties: {
      company: { rich_text: {} },
      period: { rich_text: {} },
      location: { rich_text: {} },
      detail: { rich_text: {} },
      now: { checkbox: {} },
      order: { number: { format: 'number' } },
    },
  },
  blog: {
    title: 'Portfolio Blog',
    properties: {
      slug: { rich_text: {} },
      category: { select: { options: [
        { name: 'Tutorial' }, { name: 'Opinion' }, { name: 'Career' }, { name: 'Article' },
      ]}},
      excerpt: { rich_text: {} },
      published_date: { date: {} },
      read_time: { number: { format: 'number' } },
      featured: { checkbox: {} },
    },
  },
  settings: {
    title: 'Portfolio Settings',
    properties: {
      site_title: { rich_text: {} },
      site_description: { rich_text: {} },
      theme: { select: { options: [
        { name: 'terminal' }, { name: 'editorial' }, { name: 'gallery' }, { name: 'swiss' },
      ]}},
      language: { select: { options: [{ name: 'en' }, { name: 'id' }] }},
      email: { email: {} },
      github: { url: {} },
      linkedin: { url: {} },
    },
  },
};

async function createDatabase(key, config) {
  const parentPageId = env.NOTION_PARENT_PAGE_ID;
  if (!parentPageId) throw new Error('NOTION_PARENT_PAGE_ID missing');

  console.log(`Creating ${config.title}...`);

  // Step 1: Create database (without properties)
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: config.title } }],
  });

  const dbId = db.id.replace(/-/g, '');
  const dsId = db.data_sources?.[0]?.id;

  // Step 2: Update data source with properties
  if (dsId) {
    await notion.dataSources.update({
      data_source_id: dsId,
      properties: {
        Name: { title: {} },
        ...config.properties,
      },
    });
  }

  updateEnv(`NOTION_DB_${key.toUpperCase()}`, dbId);
  console.log(`  OK → ${dbId} (data_source: ${dsId || 'N/A'})`);
  return dbId;
}

async function main() {
  console.log('Notion Bootstrap — Creating databases with properties...\n');

  for (const [key, config] of Object.entries(DB_CONFIGS)) {
    await createDatabase(key, config);
  }

  console.log('\nDone! .env updated.');
  console.log('Next: npm run notion:seed');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
