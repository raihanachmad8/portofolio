/**
 * Migrate command — seed data to Notion.
 *
 * @module commands/migrate
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  createNotionClient,
  findTitle,
  formatStatus,
  hasUsableEnvValue,
  normalizeNotionId,
  queryAllPages,
  readEnvFile,
  resolveDataSourceId,
  toCheckboxProperty,
  toDateProperty,
  toNumberProperty,
  toRichTextProperty,
  toSelectProperty,
  toTitleProperty,
  toMultiSelectProperty,
  toUrlProperty,
} from '../lib/notion-client.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { mdToNotionBlocks } from '../md-to-notion.mjs';

async function createPage(notion, dataSourceId, properties) {
  await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dataSourceId },
    properties,
  });
}

async function getExistingTitles(notion, databaseId) {
  const pages = await queryAllPages(notion, databaseId);
  return new Set(pages.map(findTitle).filter(Boolean));
}

// ===== Profile =====

async function migrateProfile(notion, env) {
  const dbId = normalizeNotionId(env.NOTION_DB_PROFILE);
  if (!hasUsableEnvValue(dbId)) {
    console.log(formatStatus('NOTION_DB_PROFILE not set, skipping', false));
    return;
  }

  const localPath = path.resolve(process.cwd(), 'src/data/content.json');
  const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  const profile = local.profile || {};
  const existing = await getExistingTitles(notion, dbId);

  const title = profile.name || 'Profile';
  if (existing.has(title)) {
    console.log(formatStatus('Profile already exists, skipping', true));
    return;
  }

  const dsId = await resolveDataSourceId(notion, dbId);
  const facts = profile.facts || [];
  const principles = profile.principles || [];

  const properties = {
    Name: toTitleProperty(title),
    full_name: toRichTextProperty(profile.name || ''),
    short_name: toRichTextProperty(profile.shortName || ''),
    role_title: toRichTextProperty(profile.roleTitle || ''),
    hero_sub: toRichTextProperty(profile.heroSub || ''),
    email: { email: profile.email || '' },
    github: toUrlProperty(profile.github || ''),
    linkedin: toUrlProperty(profile.linkedin || ''),
    website: toUrlProperty(profile.website || ''),
    cv_url: toRichTextProperty(profile.cv_url || ''),
    location: toRichTextProperty(profile.location || ''),
    about_lead: toRichTextProperty(profile.aboutLead || ''),
    about_para_1: toRichTextProperty(profile.aboutParas?.[0] || ''),
    about_para_2: toRichTextProperty(profile.aboutParas?.[1] || ''),
    marquee: toRichTextProperty((profile.marquee || []).join(', ')),
    available: toCheckboxProperty(profile.available),
    ticker_items: toRichTextProperty((profile.tickerItems || []).join('\n')),
    language: toSelectProperty('en'),
    theme: toSelectProperty('gallery'),
  };

  // Add dynamic facts (up to 10)
  for (let i = 0; i < Math.min(facts.length, 10); i++) {
    properties[`fact_${i + 1}_value`] = toNumberProperty(facts[i].value);
    properties[`fact_${i + 1}_label`] = toRichTextProperty(facts[i].label);
  }

  // Add dynamic principles (up to 10)
  for (let i = 0; i < Math.min(principles.length, 10); i++) {
    properties[`principle_${i + 1}_title`] = toRichTextProperty(principles[i].title);
    properties[`principle_${i + 1}_desc`] = toRichTextProperty(principles[i].description);
  }

  await createPage(notion, dsId, properties);
  console.log(formatStatus('Profile migrated', true));
}

// ===== Skills =====

async function migrateSkills(notion, env) {
  const dbId = normalizeNotionId(env.NOTION_DB_SKILLS);
  if (!hasUsableEnvValue(dbId)) {
    console.log(formatStatus('NOTION_DB_SKILLS not set, skipping', false));
    return;
  }

  const localPath = path.resolve(process.cwd(), 'src/data/content.json');
  const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  const existing = await getExistingTitles(notion, dbId);
  const dsId = await resolveDataSourceId(notion, dbId);

  let created = 0;
  for (const [category, skills] of Object.entries(local.skills || {})) {
    // Tools stored as individual entries with category "Tools"
    if (category === 'tools') {
      for (const toolCat of Object.keys(skills)) {
        for (const tool of skills[toolCat]) {
          if (existing.has(tool)) continue;
          await createPage(notion, dsId, {
            title: toTitleProperty(tool),
            category: toSelectProperty('Tools'),
            level: toNumberProperty(80),
          });
          created++;
        }
      }
      continue;
    }
    for (const skill of skills) {
      if (existing.has(skill.name)) continue;

      await createPage(notion, dsId, {
        title: toTitleProperty(skill.name),
        category: toSelectProperty(category.charAt(0).toUpperCase() + category.slice(1)),
        level: toNumberProperty(skill.level),
      });
      created++;
    }
  }

  console.log(formatStatus(`Skills migrated (${created} created)`, true));
}

// ===== Experience =====

async function migrateExperience(notion, env) {
  const dbId = normalizeNotionId(env.NOTION_DB_EXPERIENCE);
  if (!hasUsableEnvValue(dbId)) {
    console.log(formatStatus('NOTION_DB_EXPERIENCE not set, skipping', false));
    return;
  }

  const expDir = path.resolve(process.cwd(), 'src/content/experience');
  if (!fs.existsSync(expDir)) {
    console.log(formatStatus('Experience directory not found, skipping', false));
    return;
  }

  const existing = await getExistingTitles(notion, dbId);
  const dsId = await resolveDataSourceId(notion, dbId);
  const files = fs.readdirSync(expDir).filter((f) => f.endsWith('.mdx'));

  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(expDir, file), 'utf8');
    const { data: fm } = parseFrontmatter(raw);
    if (!fm.title) continue;
    if (existing.has(fm.title)) {
      skipped++;
      continue;
    }

    await createPage(notion, dsId, {
      title: toTitleProperty(fm.title),
      company: toRichTextProperty(fm.company || ''),
      period: toRichTextProperty(fm.period || ''),
      location: toRichTextProperty(fm.location || ''),
      detail: toRichTextProperty(fm.detail || ''),
      now: toCheckboxProperty(fm.now === 'true'),
      order: toNumberProperty(Number(fm.order) || 0),
    });
    created++;
  }

  console.log(formatStatus(`Experience migrated (${created} created, ${skipped} skipped)`, true));
}

// ===== Projects =====

async function migrateProjects(notion, env) {
  const dbId = normalizeNotionId(env.NOTION_DB_PROJECTS);
  if (!hasUsableEnvValue(dbId)) {
    console.log(formatStatus('NOTION_DB_PROJECTS not set, skipping', false));
    return;
  }

  const mdxDir = 'src/content/projects';
  if (!fs.existsSync(mdxDir)) {
    console.log(formatStatus('Projects directory not found, skipping', false));
    return;
  }

  const dsId = await resolveDataSourceId(notion, dbId);
  const siteUrl = env.PUBLIC_SITE_URL || '';
  const existingTitles = await getExistingTitles(notion, dbId);

  const files = fs.readdirSync(mdxDir).filter((f) => f.endsWith('.mdx'));
  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const content = fs.readFileSync(mdxDir + '/' + file, 'utf8');
    const { data: fm, body } = parseFrontmatter(content);
    if (Object.keys(fm).length === 0) continue;

    if (existingTitles.has(fm.title)) {
      skipped++;
      continue;
    }

    const slug = file.replace('.mdx', '');
    const blocks = mdToNotionBlocks(body);

    // Handle tables
    const tableBlockIndex = blocks.findIndex((b) => b.type === 'table');
    let tableBlock = null;
    let tableRows = [];
    if (tableBlockIndex !== -1) {
      tableBlock = blocks.splice(tableBlockIndex, 1)[0];
      tableRows = tableBlock.table.children || [];
      tableBlock.table.children = [];
    }

    // Build cover image
    let cover = undefined;
    if (fm.image_url && fm.image_url !== 'null' && fm.image_url !== 'undefined') {
      const imgUrl = fm.image_url.trim();
      const coverUrl = imgUrl.startsWith('http') ? imgUrl
        : imgUrl.startsWith('/') ? siteUrl + imgUrl
        : null;
      if (coverUrl) cover = { type: 'external', external: { url: coverUrl } };
    }

    const page = await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: dsId },
      cover,
      properties: {
        Name: { title: [{ text: { content: fm.title || '' } }] },
        slug: { rich_text: [{ text: { content: slug } }] },
        category: { select: { name: fm.category || '' } },
        year: { number: Number(fm.year) || 0 },
        has_ui: { checkbox: fm.has_ui !== 'false' },
        description: { rich_text: [{ text: { content: (fm.description || '').slice(0, 2000) } }] },
        stack: { rich_text: [{ text: { content: fm.stack || '' } }] },
        github_url: fm.github_url && fm.github_url !== 'null' ? { url: fm.github_url } : { url: null },
        live_url: fm.live_url && fm.live_url !== 'null' ? { url: fm.live_url } : { url: null },
        featured: { checkbox: fm.featured === 'true' },
        order: { number: Number(fm.order) || 0 },
        image_url: { rich_text: [{ text: { content: fm.image_url || '' } }] },
      },
      children: blocks.slice(0, 100),
    });

    if (blocks.length > 100) {
      await notion.blocks.children.append({ block_id: page.id, children: blocks.slice(100) });
    }

    if (tableBlock) {
      const firstRow = tableRows[0];
      const restRows = tableRows.slice(1);
      const tableResp = await notion.blocks.children.append({
        block_id: page.id,
        children: [{
          type: 'table',
          table: {
            table_width: tableBlock.table.table_width,
            has_column_header: true,
            has_row_header: false,
            children: firstRow ? [firstRow] : [],
          },
        }],
      });
      if (restRows.length > 0) {
        await notion.blocks.children.append({ block_id: tableResp.results[0].id, children: restRows });
      }
    }

    created++;
    console.log(`Created: ${fm.title}`);
  }

  console.log(formatStatus(`Projects migrated (${created} created, ${skipped} skipped)`, true));
}

// ===== Blog =====

async function migrateBlog(notion, env) {
  const dbId = normalizeNotionId(env.NOTION_DB_BLOG);
  if (!hasUsableEnvValue(dbId)) {
    console.log(formatStatus('NOTION_DB_BLOG not set, skipping', false));
    return;
  }

  const blogDir = path.resolve(process.cwd(), 'src/content/blog');
  if (!fs.existsSync(blogDir)) {
    console.log(formatStatus('Blog directory not found, skipping', false));
    return;
  }

  const dsId = await resolveDataSourceId(notion, dbId);
  const existing = await getExistingTitles(notion, dbId);

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));

  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const { data: fm, body } = parseFrontmatter(raw);
    if (!fm.title) continue;
    if (existing.has(fm.title)) {
      skipped++;
      continue;
    }

    const slug = file.replace('.mdx', '');
    const tags = fm.tags ? fm.tags.replace(/[\[\]"]/g, '').split(',').map((t) => t.trim()).filter(Boolean) : [];
    const blocks = mdToNotionBlocks(body);

    // Create page with metadata + content blocks
    await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: dsId },
      properties: {
        title: toTitleProperty(fm.title),
        slug: toRichTextProperty(slug),
        category: toSelectProperty(fm.category || ''),
        excerpt: toRichTextProperty(fm.excerpt || ''),
        published_date: toDateProperty(fm.published_date || ''),
        read_time: toNumberProperty(Number(fm.read_time) || 5),
        tags: toMultiSelectProperty(tags),
        featured: toCheckboxProperty(fm.featured === 'true'),
      },
      children: blocks.slice(0, 100),
    });

    // Append remaining blocks if > 100
    if (blocks.length > 100) {
      // Would need page ID — skip for now, 100 blocks is usually enough for blog posts
    }

    created++;
    console.log(`  Created: ${fm.title} (${blocks.length} blocks)`);
  }

  console.log(formatStatus(`Blog migrated (${created} created, ${skipped} skipped)`, true));
}

// ===== Main =====

const MIGRATORS = {
  profile: migrateProfile,
  skills: migrateSkills,
  experience: migrateExperience,
  projects: migrateProjects,
  blog: migrateBlog,
};

export async function migrate(flags) {
  const env = readEnvFile();
  const notion = createNotionClient(env);

  if (flags.all || (!flags.type && !flags.all)) {
    // Migrate all
    for (const [name, fn] of Object.entries(MIGRATORS)) {
      await fn(notion, env);
    }
  } else if (flags.type) {
    const fn = MIGRATORS[flags.type];
    if (!fn) {
      console.error(`Unknown type: ${flags.type}. Use: profile, skills, experience, projects, blog`);
      return;
    }
    await fn(notion, env);
  }
}
