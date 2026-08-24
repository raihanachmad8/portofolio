import { Client } from '@notionhq/client';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATABASES = {
  projects: process.env.NOTION_DB_PROJECTS,
  skills: process.env.NOTION_DB_SKILLS,
  experience: process.env.NOTION_DB_EXPERIENCE,
  blog: process.env.NOTION_DB_BLOG,
  settings: process.env.NOTION_DB_SETTINGS,
};

async function queryAllPages(databaseId: string) {
  const pages: any[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;

    if (cursor) {
      await new Promise(r => setTimeout(r, 350));
    }
  } while (cursor);

  return pages;
}

function transformPage(page: any) {
  const props = page.properties;
  const result: Record<string, any> = {
    id: page.id,
    created_at: page.created_time,
    last_edited_at: page.last_edited_time,
  };

  for (const [key, prop] of Object.entries(props) as [string, any][]) {
    switch (prop.type) {
      case 'title':
        result[key] = prop.title?.[0]?.plain_text || '';
        break;
      case 'rich_text':
        result[key] = prop.rich_text?.map((t: any) => t.plain_text).join('') || '';
        break;
      case 'number':
        result[key] = prop.number ?? 0;
        break;
      case 'select':
        result[key] = prop.select?.name || '';
        break;
      case 'checkbox':
        result[key] = prop.checkbox ?? false;
        break;
      case 'url':
        result[key] = prop.url || null;
        break;
      case 'date':
        result[key] = prop.date?.start || null;
        break;
      default:
        result[key] = null;
    }
  }

  return result;
}

async function syncContent() {
  console.log('Starting content sync...');

  const content: Record<string, any> = {
    version: 1,
    synced_at: new Date().toISOString(),
  };

  for (const [key, databaseId] of Object.entries(DATABASES)) {
    if (!databaseId) {
      console.warn(`Skipping ${key}: NOTION_DB_${key.toUpperCase()} not set`);
      continue;
    }

    try {
      console.log(`Syncing ${key}...`);
      const pages = await queryAllPages(databaseId);
      content[key] = pages.map(transformPage);
      console.log(`${key}: ${content[key].length} items`);
    } catch (error) {
      console.error(`Failed to sync ${key}:`, error);

      if (existsSync('src/content/notion-snapshot.json')) {
        const snapshot = JSON.parse(readFileSync('src/content/notion-snapshot.json', 'utf-8'));
        content[key] = snapshot[key] || [];
        console.log(`Using fallback for ${key}`);
      }
    }
  }

  writeFileSync('src/content/notion-snapshot.json', JSON.stringify(content, null, 2));
  writeFileSync('public/data/content.json', JSON.stringify(content, null, 2));

  console.log('Content sync complete');
}

syncContent().catch(console.error);
