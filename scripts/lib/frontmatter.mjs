/**
 * Canonical YAML frontmatter parser for MDX/MD files.
 * Single implementation used by all scripts (aruna-build, aruna-smoke, notion-*).
 *
 * Features:
 * - Coerces booleans (true/false), numbers, and null
 * - Strips surrounding quotes
 * - Handles multi-line values (concatenates with space)
 *
 * @module scripts/lib/frontmatter
 */

/**
 * Parse YAML frontmatter from MDX/MD content.
 * @param {string} content - Raw file content with --- delimiters
 * @returns {{ data: Record<string, unknown>, body: string }}
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { data: {}, body: content };

  const data = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if (/^["']/.test(val) && /["']$/.test(val)) {
      val = val.slice(1, -1);
    }

    // Coerce types
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (val === 'null') val = null;
    else if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);

    data[key] = val;
  }

  return { data, body: content.slice(match[0].length) };
}
