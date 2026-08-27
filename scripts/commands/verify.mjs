/**
 * Verify command — check Notion block content.
 *
 * @module commands/verify
 */

import { Client } from '@notionhq/client';
import { readEnvFile, normalizeNotionId, hasUsableEnvValue } from '../notion-utils.mjs';

export async function verify() {
  const env = readEnvFile();
  const c = new Client({ auth: env.NOTION_TOKEN });
  const dbId = normalizeNotionId(env.NOTION_DB_PROJECTS);

  if (!hasUsableEnvValue(dbId)) {
    console.error('NOTION_DB_PROJECTS not set');
    return;
  }

  const db = await c.databases.retrieve({ database_id: dbId });
  const dsId = db.data_sources[0].id;
  const result = await c.dataSources.query({ data_source_id: dsId, page_size: 1 });
  const page = result.results[0];

  if (!page) {
    console.log('No pages found');
    return;
  }

  const blocks = await c.blocks.children.list({ block_id: page.id, page_size: 30 });
  const title = page.properties?.Name?.title?.[0]?.plain_text || 'Unknown';

  console.log(`=== First 30 blocks of "${title}" ===\n`);

  for (const block of blocks.results) {
    const type = block.type;
    if (type === 'heading_2' || type === 'heading_3' || type === 'heading_1') {
      const text = block[type].rich_text.map((t) => {
        let s = t.plain_text;
        if (t.annotations?.bold) s = '**' + s + '**';
        if (t.annotations?.code) s = '`' + s + '`';
        return s;
      }).join('');
      console.log(`${type.toUpperCase()}: ${text}`);
    } else if (type === 'paragraph') {
      const text = block[type].rich_text.map((t) => {
        let s = t.plain_text;
        if (t.annotations?.bold) s = '**' + s + '**';
        if (t.annotations?.italic) s = '*' + s + '*';
        if (t.annotations?.code) s = '`' + s + '`';
        return s;
      }).join('');
      console.log(`  PARA: ${text.slice(0, 120)}`);
    } else if (type === 'bulleted_list_item') {
      const text = block[type].rich_text.map((t) => {
        let s = t.plain_text;
        if (t.annotations?.bold) s = '**' + s + '**';
        if (t.annotations?.code) s = '`' + s + '`';
        return s;
      }).join('');
      console.log(`  BULLET: ${text.slice(0, 120)}`);
    } else if (type === 'code') {
      console.log(`  CODE [${block[type].language}]: ${block[type].rich_text.map((t) => t.plain_text).join('').slice(0, 60)}`);
    } else if (type === 'table') {
      const rows = block[type].children || [];
      const header = rows[0]?.table_row?.cells?.map((c) => c.map((x) => x.plain_text).join('')).join(' | ');
      console.log(`  TABLE [${block[type].table_width} cols]: ${header}`);
    } else if (type === 'divider') {
      console.log('  --- DIVIDER ---');
    } else {
      console.log(`  ${type}`);
    }
  }
}
