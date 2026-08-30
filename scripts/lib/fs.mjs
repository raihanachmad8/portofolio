/**
 * Safe filesystem helpers — wraps node:fs with consistent error handling.
 * @module scripts/lib/fs
 */

import { readFileSync, existsSync } from 'node:fs';

/**
 * Read a file as UTF-8 string. Returns empty string if file doesn't exist.
 * @param {string} filePath - Absolute path
 * @returns {string}
 */
export function readText(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Read and parse a JSON file. Returns null on any error.
 * @param {string} filePath - Absolute path
 * @returns {unknown|null}
 */
export function readJSON(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Check if a path exists.
 * @param {string} filePath
 * @returns {boolean}
 */
export function pathExists(filePath) {
  return existsSync(filePath);
}

/**
 * Convert a string to a URL-safe slug.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
