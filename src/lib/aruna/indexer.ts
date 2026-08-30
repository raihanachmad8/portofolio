/**
 * Indexer — BM25 document statistics + dense vector index over KB entries.
 * @module aruna/indexer
 */

import type { KBEntry } from './types';
import { tokenizeV2 } from './tokenizer';
import { embedText, type EmbedBackend } from './embedding';

export interface BM25Stats {
  entries: KBEntry[];
  docFreq: Map<string, number>;
  docLengths: Map<string, number>;
  avgDocLength: number;
  totalDocs: number;
  tf: Map<string, Map<string, number>>;
}

/** Dense vector index — entry id → L2-normalized embedding. */
export interface VectorIndex {
  backend: EmbedBackend;
  entries: KBEntry[];
  vectors: Map<string, number[]>;
}

export function buildBM25Stats(
  entries: KBEntry[],
  getText: (entry: KBEntry) => string = (e) => e.text,
): BM25Stats {
  const docFreq = new Map<string, number>();
  const docLengths = new Map<string, number>();
  const tf = new Map<string, Map<string, number>>();
  let totalLength = 0;

  for (const entry of entries) {
    const terms = tokenizeV2(getText(entry));
    const termFreq = new Map<string, number>();
    for (const term of terms) termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
    for (const term of termFreq.keys()) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    tf.set(entry.id, termFreq);
    docLengths.set(entry.id, terms.length);
    totalLength += terms.length;
  }

  return {
    entries,
    docFreq,
    docLengths,
    avgDocLength: entries.length ? totalLength / entries.length : 0,
    totalDocs: entries.length,
    tf,
  };
}

/**
 * Build a dense vector index over entries using the resolved embedder.
 * `backend: 'none'` returns an empty index (caller uses lexical-only).
 */
export function buildVectorIndex(
  entries: KBEntry[],
  backend: EmbedBackend,
  getText: (entry: KBEntry) => string = (e) => e.text,
): VectorIndex {
  const vectors = new Map<string, number[]>();
  if (backend === 'none') return { backend, entries, vectors };
  for (const entry of entries) {
    const text = `${entry.title} ${getText(entry)}`;
    if (!text.trim()) continue;
    vectors.set(entry.id, embedText(text));
  }
  return { backend, entries, vectors };
}
