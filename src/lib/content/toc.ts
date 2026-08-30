/**
 * Markdown renderer with automatic heading ids and a table of contents.
 *
 * Project detail pages render markdown from Notion or local MDX bodies via
 * `marked`. Plain `marked.parse` gives headings without anchors, so there is
 * nothing to link to and no way to build a TOC. This module wraps `marked`
 * with a custom heading renderer: each `<h2>`/`<h3>` gets a stable slug id and
 * is collected into a `toc` structure the page can render above the prose.
 */
import { Marked } from 'marked';
import type { RendererObject, Tokens } from 'marked';

/** A single heading entry in the table of contents. */
export interface TocItem {
  /** Anchor id on the heading element, e.g. `key-features`. */
  id: string;
  /** Heading text with inline formatting stripped. */
  text: string;
  /** Heading level (2 for `##`, 3 for `###`). */
  depth: number;
}

export interface RenderedContent {
  /** Markdown rendered to HTML, headings carrying `id` anchors. */
  html: string;
  /** Headings in document order, for building the TOC. */
  toc: TocItem[];
}

/** Turn heading text into an anchor-friendly slug. */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  );
}

/**
 * Render markdown to HTML with slug ids on headings and a TOC structure.
 * Each call uses its own `Marked` instance so the collector is never shared
 * across requests.
 */
export function renderMarkdown(md: string): RenderedContent {
  const toc: TocItem[] = [];
  const usedIds = new Map<string, number>();

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading) {
      const html = this.parser.parseInline(tokens);
      const text = html.replace(/<[^>]+>/g, '');
      let id = slugify(text);
      const count = usedIds.get(id) ?? 0;
      usedIds.set(id, count + 1);
      if (count > 0) id = `${id}-${count + 1}`;
      toc.push({ id, text, depth });
      return `<h${depth} id="${id}">${html}</h${depth}>`;
    },
  };

  const marked = new Marked({ renderer });
  const html = marked.parse(md);
  return { html, toc };
}
