/**
 * Ranker — BM25 (lexical) + cosine (semantic) + RRF fusion.
 * @module aruna/ranker
 */

import type { KBEntry, SearchHit } from './types';
import type { BM25Stats, VectorIndex } from './indexer';
import { buildQueryV2, tokenizeV2 } from './tokenizer';
import { cosineSimilarity, embedText } from './embedding';

export const KEYWORD_BOOST = 0.4;
export const LABEL_BOOST = 0.2;
export const DEFAULT_MIN_SCORE = 0.55;
export const DEFAULT_MAX_RESULTS = 5;
/** Cosine threshold below which a hit is not worth surfacing. */
export const SEMANTIC_MIN_SCORE = 0.6;
/** RRF fusion constant. */
export const RRF_K = 60;

export interface RankOptions {
  minScore?: number;
  maxResults?: number;
  boostKeyword?: number;
  boostLabel?: number;
}

function bm25(
  stats: BM25Stats,
  entry: KBEntry,
  terms: string[],
  k1 = 1.5,
  b = 0.75,
): number {
  const n = stats.totalDocs;
  const dl = stats.docLengths.get(entry.id) ?? 0;
  const termFreq = stats.tf.get(entry.id);
  if (!termFreq) return 0;

  let score = 0;
  for (const term of terms) {
    const f = termFreq.get(term);
    if (!f) continue;
    const df = stats.docFreq.get(term) ?? 0;
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    const denom = f + k1 * (1 - b + b * (dl / (stats.avgDocLength || 1)));
    score += idf * ((f * (k1 + 1)) / denom);
  }
  return score;
}

function keywordBoost(entry: KBEntry, terms: string[]): number {
  const words = new Set(tokenizeV2(entry.text));
  return terms.filter((t) => words.has(t)).length;
}

export function rankEntries(
  stats: BM25Stats,
  queryText: string,
  opts: RankOptions = {},
): SearchHit[] {
  const {
    minScore = DEFAULT_MIN_SCORE,
    maxResults = DEFAULT_MAX_RESULTS,
    boostKeyword = KEYWORD_BOOST,
    boostLabel = LABEL_BOOST,
  } = opts;
  const { terms } = buildQueryV2(queryText);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = stats.entries.map((entry) => {
    let score = bm25(stats, entry, terms);
    score += keywordBoost(entry, terms) * boostKeyword;
    if (entry.topic && terms.includes(entry.topic)) score += boostLabel;
    return { entry, score, mode: 'lexical' as const };
  });

  return hits
    .filter((h) => h.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/* ---------- Stage 2 · cosine semantic ---------- */

/**
 * Rank entries by cosine similarity of the query embedding against the
 * precomputed document vectors, plus keyword/label boosts.
 */
export function rankSemantic(
  index: VectorIndex,
  queryText: string,
  opts: RankOptions = {},
): SearchHit[] {
  const {
    maxResults = DEFAULT_MAX_RESULTS,
    boostKeyword = KEYWORD_BOOST,
    boostLabel = LABEL_BOOST,
  } = opts;
  const { terms } = buildQueryV2(queryText);
  if (index.backend === 'none' || terms.length === 0) return [];

  const q = embedText(queryText);
  const hits: SearchHit[] = [];
  for (const entry of index.entries) {
    const vec = index.vectors.get(entry.id);
    if (!vec) continue;
    let score = cosineSimilarity(q, vec);
    score += keywordBoost(entry, terms) * boostKeyword;
    if (entry.topic && terms.includes(entry.topic)) score += boostLabel;
    hits.push({ entry, score, mode: 'semantic' as const });
  }

  return hits
    .filter((h) => h.score >= SEMANTIC_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/** Reciprocal Rank Fusion over the lexical and semantic result lists. */
export function rrfFuse(
  lexical: SearchHit[],
  semantic: SearchHit[],
  maxResults: number = DEFAULT_MAX_RESULTS,
): SearchHit[] {
  const score = new Map<string, { entry: KBEntry; s: number }>();

  const add = (list: SearchHit[], mode: 'lexical' | 'semantic') => {
    list.forEach((hit, i) => {
      const rank = i + 1;
      const cur = score.get(hit.entry.id) ?? { entry: hit.entry, s: 0 };
      cur.s += 1 / (RRF_K + rank);
      cur.entry = hit.entry;
      score.set(hit.entry.id, cur);
    });
  };

  add(lexical, 'lexical');
  add(semantic, 'semantic');

  return Array.from(score.values())
    .map(({ entry, s }) => ({ entry, score: s, mode: 'rrf' as const }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Progressive retrieval: fast-path when lexical already passes strongly,
 * otherwise run semantic and fuse. Exposed for lookup to call.
 */
export function progressiveSearch(
  stats: BM25Stats,
  vectorIndex: VectorIndex | null,
  queryText: string,
  opts: RankOptions = {},
): SearchHit[] {
  const { maxResults = DEFAULT_MAX_RESULTS } = opts;
  const lexical = rankEntries(stats, queryText, { ...opts, maxResults: 50 });

  // Fast path: a strong lexical hit already answers — skip embedding work.
  if (vectorIndex && vectorIndex.backend !== 'none') {
    if (lexical[0] && lexical[0].score >= DEFAULT_MIN_SCORE * 1.2) {
      return lexical.slice(0, maxResults);
    }
    const semantic = rankSemantic(vectorIndex, queryText, { ...opts, maxResults: 50 });
    return rrfFuse(lexical, semantic, maxResults);
  }

  return lexical.slice(0, maxResults);
}

export type { KBEntry };
