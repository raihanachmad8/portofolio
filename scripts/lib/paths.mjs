/**
 * Canonical path constants for the project.
 * All scripts resolve paths relative to ROOT to avoid cwd drift.
 * @module scripts/lib/paths
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Project root (one level up from scripts/). */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Source directories. */
export const SRC = join(ROOT, 'src');
export const CONTENT = join(SRC, 'content');
export const DATA = join(SRC, 'data');
export const SCRIPTS = join(ROOT, 'scripts');

/** Content collection directories. */
export const PROJECTS_DIR = join(CONTENT, 'projects');
export const EXPERIENCE_DIR = join(CONTENT, 'experience');
export const BLOG_DIR = join(CONTENT, 'blog');

/** Data files. */
export const CONTENT_JSON = join(DATA, 'content.json');
export const CV_JSON = join(DATA, 'cv.json');
export const QA_JSON = join(DATA, 'aruna-qa.json');

/** Output directories. */
export const PUBLIC = join(ROOT, 'public');
export const ARUNA_KB_OUT = join(PUBLIC, 'data', 'aruna-kb');
