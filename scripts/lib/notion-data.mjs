/**
 * Notion data fetchers — shared by sync.mjs and migrate.mjs.
 * Eliminates duplicate profile/skills/experience fetching logic.
 *
 * @module scripts/lib/notion-data
 */

import { queryAllPages, findTitle, getProp, getCheckbox } from './notion-client.mjs';

/**
 * Discover dynamic fact_N_value/fact_N_label pairs from a profile page.
 * @param {object} page
 * @returns {Array<{ value: number, label: string }>}
 */
function discoverFacts(page) {
  const get = (f) => getProp(page, f);
  const getNum = (f) => Number(get(f)) || 0;
  const facts = [];
  for (let i = 1; i <= 20; i++) {
    const value = getNum(`fact_${i}_value`);
    const label = get(`fact_${i}_label`);
    if (!label && value === 0) break;
    facts.push({ value, label });
  }
  return facts;
}

/**
 * Discover dynamic principle_N_title/principle_N_desc pairs from a profile page.
 * @param {object} page
 * @returns {Array<{ no: string, title: string, description: string }>}
 */
function discoverPrinciples(page) {
  const get = (f) => getProp(page, f);
  const principles = [];
  for (let i = 1; i <= 20; i++) {
    const title = get(`principle_${i}_title`);
    const description = get(`principle_${i}_desc`);
    if (!title) break;
    principles.push({ no: String(i).padStart(2, '0'), title, description });
  }
  return principles;
}

/**
 * Fetch profile from Notion.
 * @param {import('@notionhq/client').Client} notion
 * @param {string} databaseId
 * @returns {Promise<object|null>}
 */
export async function fetchProfileData(notion, databaseId) {
  const pages = await queryAllPages(notion, databaseId);
  if (pages.length === 0) return null;

  const p = pages[0];
  const get = (f) => getProp(p, f);

  return {
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
    facts: discoverFacts(p),
    principles: discoverPrinciples(p),
  };
}

/**
 * Fetch skills grouped by category from Notion.
 * @param {import('@notionhq/client').Client} notion
 * @param {string} databaseId
 * @returns {Promise<object|null>}
 */
export async function fetchSkillsData(notion, databaseId) {
  const pages = await queryAllPages(notion, databaseId);
  const skills = { backend: [], frontend: [], database: [], devops: [] };
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

  return { ...skills, tools: { backend: toolsList, frontend: toolsList, devops: toolsList } };
}

/**
 * Fetch experience entries from Notion.
 * @param {import('@notionhq/client').Client} notion
 * @param {string} databaseId
 * @returns {Promise<Array>}
 */
export async function fetchExperienceData(notion, databaseId) {
  const pages = await queryAllPages(notion, databaseId);
  return pages.map((page) => ({
    title: findTitle(page),
    company: getProp(page, 'company'),
    period: getProp(page, 'period'),
    location: getProp(page, 'location'),
    detail: getProp(page, 'detail'),
    now: getCheckbox(page, 'now'),
    order: Number(getProp(page, 'order')) || 0,
  })).sort((a, b) => a.order - b.order);
}

/**
 * Fetch projects from Notion.
 * @param {import('@notionhq/client').Client} notion
 * @param {string} databaseId
 * @returns {Promise<Array>}
 */
export async function fetchProjectsData(notion, databaseId) {
  const pages = await queryAllPages(notion, databaseId);
  return pages.map((page) => ({
    title: findTitle(page),
    slug: getProp(page, 'slug'),
    category: getProp(page, 'category'),
    year: Number(getProp(page, 'year')) || 0,
    has_ui: getCheckbox(page, 'has_ui'),
    description: getProp(page, 'description'),
    stack: getProp(page, 'stack'),
    github_url: getProp(page, 'github_url'),
    live_url: getProp(page, 'live_url'),
    featured: getCheckbox(page, 'featured'),
    order: Number(getProp(page, 'order')) || 0,
    image_url: getProp(page, 'image_url'),
    page_id: page.id,
  }));
}

/**
 * Fetch blog posts from Notion.
 * @param {import('@notionhq/client').Client} notion
 * @param {string} databaseId
 * @returns {Promise<Array>}
 */
export async function fetchBlogData(notion, databaseId) {
  const pages = await queryAllPages(notion, databaseId);
  return pages.map((page) => ({
    title: findTitle(page),
    slug: getProp(page, 'slug'),
    date: getProp(page, 'published_date'),
    tags: getProp(page, 'tags'),
    excerpt: getProp(page, 'excerpt'),
    featured: getCheckbox(page, 'featured'),
    order: Number(getProp(page, 'order')) || 0,
    page_id: page.id,
  }));
}
