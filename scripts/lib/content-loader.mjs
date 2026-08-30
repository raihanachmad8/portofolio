/**
 * Content collection loader — reads MDX directories and parses frontmatter.
 * Replaces duplicated loadProjects/loadExperience/loadBlog/readDir across scripts.
 *
 * @module scripts/lib/content-loader
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';
import { readText } from './fs.mjs';
import { PROJECTS_DIR, EXPERIENCE_DIR, BLOG_DIR } from './paths.mjs';

/**
 * Read all .mdx/.md files from a directory.
 * @param {string} dir - Absolute directory path
 * @returns {string[]} Filenames (not full paths)
 */
export function readDir(dir) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));
  } catch {
    return [];
  }
}

/**
 * Load projects from src/content/projects/.
 * @returns {Array<{ slug: string, content: string, [key: string]: unknown }>}
 */
export function loadProjects() {
  return readDir(PROJECTS_DIR).map((f) => {
    const raw = readText(join(PROJECTS_DIR, f));
    const { data, body } = parseFrontmatter(raw);
    return { ...data, slug: data.slug || f.replace(/\.mdx?$/, ''), content: body };
  });
}

/**
 * Load experience entries from src/content/experience/.
 * @returns {Array<{ id: string, [key: string]: unknown }>}
 */
export function loadExperience() {
  return readDir(EXPERIENCE_DIR).map((f) => {
    const raw = readText(join(EXPERIENCE_DIR, f));
    const { data } = parseFrontmatter(raw);
    return { ...data, id: data.id || f.replace(/\.mdx?$/, '') };
  });
}

/**
 * Load blog posts from src/content/blog/.
 * @returns {Array<{ slug: string, content: string, [key: string]: unknown }>}
 */
export function loadBlog() {
  return readDir(BLOG_DIR).map((f) => {
    const raw = readText(join(BLOG_DIR, f));
    const { data, body } = parseFrontmatter(raw);
    return { ...data, slug: data.slug || f.replace(/\.mdx?$/, ''), content: body };
  });
}
