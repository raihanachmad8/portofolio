/**
 * Generic Markdown → Notion blocks converter.
 * Reusable across any script that needs to convert MD/MDX to Notion page blocks.
 *
 * Supports: headings (1-3), paragraphs, bold, italic, inline code,
 * fenced code blocks, mermaid, tables, lists, quotes, dividers, callouts.
 *
 * @module md-to-notion
 */

/**
 * Normalize markdown language identifiers to Notion-supported values.
 * @param {string} lang - Language from markdown code fence
 * @returns {string} Notion-compatible language identifier
 */
function normalizeLanguage(lang) {
  const map = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    md: 'markdown',
    dockerfile: 'docker',
    cs: 'c#',
    cpp: 'c++',
    'csharp': 'c#',
    kt: 'kotlin',
    rs: 'rust',
    nginx: 'plain text',
    text: 'plain text',
    txt: 'plain text',
    json5: 'json',
    jsonc: 'json',
    tensorflow: 'python',
    pytorch: 'python',
  };

  const valid = new Set([
    'abap','abc','agda','arduino','ascii art','assembly','bash','basic','bnf',
    'c','c#','c++','clojure','coffeescript','coq','css','dart','dhall','diff',
    'docker','ebnf','elixir','elm','erlang','f#','flow','fortran','gherkin',
    'glsl','go','graphql','groovy','haskell','hcl','html','idris','java',
    'javascript','json','julia','kotlin','latex','less','lisp','livescript',
    'llvm ir','lua','makefile','markdown','markup','matlab','mathematica',
    'mermaid','nix','notion formula','objective-c','ocaml','pascal','perl',
    'php','plain text','powershell','prolog','protobuf','purescript','python',
    'r','racket','reason','ruby','rust','sass','scala','scheme','scss','shell',
    'smalltalk','solidity','sql','swift','toml','typescript','vb.net','verilog',
    'vhdl','visual basic','webassembly','xml','yaml','java/c/c++/c#',
  ]);

  const l = lang.toLowerCase().trim();
  const normalized = map[l] || l;
  return valid.has(normalized) ? normalized : 'plain text';
}

/**
 * Convert inline markdown formatting to Notion rich_text array.
 * Handles **bold**, *italic*, `code`, and plain text.
 * @param {string} text - Inline markdown text
 * @returns {Array} Notion rich_text array
 */
export function inlineMarkdownToRichText(text) {
  if (!text || text.trim() === '') return [{ text: { content: ' ' } }];

  const tokens = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);

    const matches = [
      boldMatch && { type: 'bold', match: boldMatch },
      italicMatch && { type: 'italic', match: italicMatch },
      codeMatch && { type: 'code', match: codeMatch },
    ].filter(Boolean).sort((a, b) => a.match.index - b.match.index);

    if (matches.length === 0) {
      tokens.push({ text: { content: remaining } });
      break;
    }

    const first = matches[0];
    if (first.match.index > 0) {
      tokens.push({ text: { content: remaining.slice(0, first.match.index) } });
    }

    const annotations = {
      bold: first.type === 'bold',
      italic: first.type === 'italic',
      code: first.type === 'code',
      strikethrough: false,
      underline: false,
      color: 'default',
    };
    tokens.push({ text: { content: first.match[1] }, annotations });

    remaining = remaining.slice(first.match.index + first.match[0].length);
  }

  return tokens.length > 0 ? tokens : [{ text: { content: text } }];
}

/**
 * Create a Notion heading_1 block.
 * @param {string} text
 * @returns {object}
 */
export function makeHeading1(text) {
  return { type: 'heading_1', heading_1: { rich_text: inlineMarkdownToRichText(text) } };
}

/**
 * Create a Notion heading_2 block.
 * @param {string} text
 * @returns {object}
 */
export function makeHeading2(text) {
  return { type: 'heading_2', heading_2: { rich_text: inlineMarkdownToRichText(text) } };
}

/**
 * Create a Notion heading_3 block.
 * @param {string} text
 * @returns {object}
 */
export function makeHeading3(text) {
  return { type: 'heading_3', heading_3: { rich_text: inlineMarkdownToRichText(text) } };
}

/**
 * Create a Notion paragraph block.
 * @param {string} text
 * @returns {object}
 */
export function makeParagraph(text) {
  return { type: 'paragraph', paragraph: { rich_text: inlineMarkdownToRichText(text) } };
}

/**
 * Create a Notion bulleted list item block.
 * @param {string} text
 * @returns {object}
 */
export function makeBullet(text) {
  return { type: 'bulleted_list_item', bulleted_list_item: { rich_text: inlineMarkdownToRichText(text) } };
}

/**
 * Create a Notion numbered list item block.
 * @param {string} text
 * @returns {object}
 */
export function makeNumbered(text) {
  return { type: 'numbered_list_item', numbered_list_item: { rich_text: inlineMarkdownToRichText(text) } };
}

/**
 * Create a Notion quote block.
 * @param {string} text
 * @returns {object}
 */
export function makeQuote(text) {
  return { type: 'quote', quote: { rich_text: inlineMarkdownToRichText(text) } };
}

/**
 * Create a Notion divider block.
 * @returns {object}
 */
export function makeDivider() {
  return { type: 'divider', divider: {} };
}

/**
 * Create a Notion code block.
 * Splits content into chunks of max 2000 chars (Notion API limit).
 * @param {string} code - Code content
 * @param {string} language - Language identifier
 * @returns {Array} Array of code block objects (1 if short, multiple if long)
 */
export function makeCode(code, language = 'plain text') {
  const MAX_LEN = 2000;
  if (code.length <= MAX_LEN) {
    return [{
      type: 'code',
      code: {
        rich_text: [{ text: { content: code } }],
        language,
      },
    }];
  }

  // Split into chunks
  const blocks = [];
  for (let i = 0; i < code.length; i += MAX_LEN) {
    blocks.push({
      type: 'code',
      code: {
        rich_text: [{ text: { content: code.slice(i, i + MAX_LEN) } }],
        language,
      },
    });
  }
  return blocks;
}

/**
 * Create a Notion callout block.
 * @param {string} text - Callout text
 * @param {string} emoji - Emoji icon
 * @returns {object}
 */
export function makeCallout(text, emoji = '📝') {
  return {
    type: 'callout',
    callout: {
      rich_text: inlineMarkdownToRichText(text),
      icon: { type: 'emoji', emoji },
    },
  };
}

/**
 * Create a Notion table block from a 2D array of cell values.
 * @param {string[][]} rows - Array of row arrays, each row is array of cell strings
 * @param {object} [options]
 * @param {boolean} [options.hasColumnHeader=true]
 * @param {boolean} [options.hasRowHeader=false]
 * @returns {object}
 */
export function makeTable(rows, options = {}) {
  const { hasColumnHeader = true, hasRowHeader = false } = options;
  const colCount = Math.max(...rows.map((r) => r.length));

  return {
    type: 'table',
    table: {
      table_width: colCount,
      has_column_header: hasColumnHeader,
      has_row_header: hasRowHeader,
      children: rows.map((row) => ({
        type: 'table_row',
        table_row: {
          cells: row.map((cell) => inlineMarkdownToRichText(cell)),
        },
      })),
    },
  };
}

/**
 * Convert markdown string to Notion blocks array.
 * Generic, reusable converter — not tied to any specific script or domain.
 *
 * @param {string} md - Markdown content
 * @returns {Array} Array of Notion block objects
 */
export function mdToNotionBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block (``` or ~~~)
    if (line.startsWith('```') || line.startsWith('~~~')) {
      const fence = line.slice(0, 3);
      const lang = line.slice(3).trim() || 'plain text';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(...makeCode(codeLines.join('\n'), normalizeLanguage(lang)));
      continue;
    }

    // Mermaid block (Astro set:html wrapper)
    if (line.includes('class="mermaid"') || line.includes("class='mermaid'")) {
      const setHtmlMatch = line.match(/set:html=\{`([\s\S]*)/);
      if (setHtmlMatch) {
        let content = setHtmlMatch[1];
        if (content.includes('`}')) {
          content = content.split('`}')[0];
        } else {
          i++;
          while (i < lines.length && !lines[i].trim().startsWith('`}')) {
            content += '\n' + lines[i];
            i++;
          }
          i++;
        }
        const mermaidLines = content.split('\n').map((l) => l.replace(/^\s+/, '')).filter((l) => l);
        if (mermaidLines.length > 0) {
          blocks.push(...makeCode(mermaidLines.join('\n'), 'mermaid'));
        }
      }
      i++;
      continue;
    }

    // Table (pipe-delimited)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        if (lines[i].trim().match(/^\|[\s\-:|]+\|$/)) {
          i++;
          continue;
        }
        const cells = lines[i].trim().slice(1, -1).split('|').map((c) => c.trim());
        tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 0) {
        blocks.push(makeTable(tableRows));
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(makeHeading3(line.slice(4).trim()));
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(makeHeading2(line.slice(3).trim()));
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(makeHeading1(line.slice(2).trim()));
      i++;
      continue;
    }

    // Bulleted list
    if (line.match(/^[-*]\s+/)) {
      blocks.push(makeBullet(line.replace(/^[-*]\s+/, '')));
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s+/)) {
      blocks.push(makeNumbered(line.replace(/^\d+\.\s+/, '')));
      i++;
      continue;
    }

    // Quote
    if (line.startsWith('> ')) {
      blocks.push(makeQuote(line.slice(2)));
      i++;
      continue;
    }

    // Divider
    if (line.trim() === '---' || line.trim() === '***') {
      blocks.push(makeDivider());
      i++;
      continue;
    }

    // Callout (emoji patterns)
    if (line.match(/^[>!]?\s*(?:⚠️|💡|📝|🔥|✅|❌)/)) {
      const text = line.replace(/^[>!]?\s*/, '');
      blocks.push(makeCallout(text));
      i++;
      continue;
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push(makeParagraph(line));
    i++;
  }

  return blocks;
}
