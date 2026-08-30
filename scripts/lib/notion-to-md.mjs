/**
 * Notion blocks → Markdown converter.
 * Single canonical implementation shared by:
 * - src/lib/notion/client.ts (site build)
 * - scripts/commands/sync.mjs (CLI sync)
 *
 * @module scripts/lib/notion-to-md
 */

/**
 * Extract plain text from Notion rich_text array with annotation support.
 * @param {object} block - A Notion block content object
 * @returns {string}
 */
export function getBlockText(block) {
  if (!block?.rich_text) return '';
  return block.rich_text.map((t) => {
    let s = t.plain_text || '';
    if (t.annotations?.bold) s = '**' + s + '**';
    if (t.annotations?.italic) s = '*' + s + '*';
    if (t.annotations?.code) s = '`' + s + '`';
    return s;
  }).join('');
}

/** @type {Record<string, (block: object) => string | string[]>} */
const renderers = {
  heading_1: (b) => '# ' + getBlockText(b.heading_1),
  heading_2: (b) => '## ' + getBlockText(b.heading_2),
  heading_3: (b) => '### ' + getBlockText(b.heading_3),
  paragraph: (b) => getBlockText(b.paragraph),
  bulleted_list_item: (b) => '- ' + getBlockText(b.bulleted_list_item),
  numbered_list_item: (b) => '1. ' + getBlockText(b.numbered_list_item),
  code: (b) => ['```' + (b.code?.language || ''), getBlockText(b.code), '```'],
  quote: (b) => '> ' + getBlockText(b.quote),
  divider: () => '---',
  image: (b) => {
    const img = b.image;
    const url = img?.external?.url || img?.file?.url || '';
    const caption = img?.caption ? getBlockText(img) : '';
    return `![${caption}](${url})`;
  },
  callout: (b) => {
    const icon = b.callout?.icon?.type === 'emoji' ? b.callout.icon.emoji + ' ' : '';
    return '> ' + icon + getBlockText(b.callout);
  },
  toggle: (b) => ['<details>', '<summary>' + getBlockText(b.toggle) + '</summary>', '</details>'],
  bookmark: (b) => `[Bookmark](${b.bookmark?.url || ''})`,
  embed: (b) => `[Embed](${b.embed?.url || ''})`,
  table: (b) => {
    const rows = b.table?.children || [];
    const lines = [];
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i]?.table_row?.cells || [];
      const cellTexts = cells.map((cell) => getBlockText({ rich_text: cell }));
      lines.push('| ' + cellTexts.join(' | ') + ' |');
      if (i === 0) lines.push('| ' + cellTexts.map(() => '---').join(' | ') + ' |');
    }
    return lines;
  },
};

/**
 * Convert an array of Notion blocks to a Markdown string.
 * @param {Array<object>} blocks - Notion blocks
 * @returns {string}
 */
export function blocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    const renderer = renderers[block.type];
    if (renderer) {
      const result = renderer(block);
      if (Array.isArray(result)) lines.push(...result);
      else lines.push(result);
    }
  }
  return lines.join('\n');
}
