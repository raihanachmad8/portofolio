/**
 * Retrieval facade — in-memory BM25 search over the KB.
 * @module aruna/lookup
 */

import type { KBEntry, SearchOutcome } from './types';
import { buildQueryV2 } from './tokenizer';
import { extractFields } from './extractor';
import { buildBM25Stats, buildVectorIndex, type BM25Stats, type VectorIndex } from './indexer';
import { progressiveSearch, DEFAULT_MAX_RESULTS, type RankOptions } from './ranker';
import { initEmbedding, resolveEmbedBackend, type EmbedConfig } from './embedding';

/**
 * Module-level singleton state — initialized once via initLookup() and read by
 * search()/getAllEntries(). Mutable by design: the lookup index is built once
 * at startup and never re-assigned during the request lifecycle.
 */
let stats: BM25Stats | null = null;
let vectorIndex: VectorIndex | null = null;
let entries: KBEntry[] = [];

export function initLookup(kb: KBEntry[], embedCfg?: EmbedConfig): void {
  entries = kb;
  stats = buildBM25Stats(kb, (e) => e.text);
  if (embedCfg) initEmbedding(embedCfg);
  const backend = resolveEmbedBackend();
  vectorIndex = buildVectorIndex(kb, backend, (e) => e.text);
}

export function search(queryText: string, opts: RankOptions = {}): SearchOutcome {
  const query = buildQueryV2(queryText);
  const filters = extractFields(query);
  if (!stats) return { hits: [], query, filters };

  const { maxResults = DEFAULT_MAX_RESULTS, ...rest } = opts;
  let hits = progressiveSearch(stats, vectorIndex, queryText, {
    maxResults: Math.max(maxResults, 50),
    ...rest,
  });

  // Hard-filter by detected fields, but only when filtering would not empty the
  // result set (the raw query score already encodes most of the relevance).
  if (filters.category) {
    const filtered = hits.filter((h) =>
      `${h.entry.title} ${h.entry.text}`.toLowerCase().includes(filters.category!),
    );
    if (filtered.length > 0) hits = filtered;
  }
  if (filters.year) {
    const filtered = hits.filter((h) =>
      `${h.entry.title} ${h.entry.text}`.toLowerCase().includes(String(filters.year!)),
    );
    if (filtered.length > 0) hits = filtered;
  }

  return { hits: hits.slice(0, maxResults), query, filters };
}

export function getAllEntries(): KBEntry[] {
  return entries;
}
