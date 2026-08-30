/**
 * Critic — coverage audit with a real verdict and escalation policy.
 * @module aruna/critic
 */

import type { CriticResult, SearchHit } from './types';
import type { TokenizedQuery } from './tokenizer';
import type { RankOptions } from './ranker';

export const DEFAULT_THRESHOLD = 0.5;
export const WARN_THRESHOLD = 0.3;
export const ESCALATION_EXTRA_K = 3;
export const ESCALATION_SCALE = 0.75;

/**
 * Verdict on retrieval quality. Coverage = fraction of query terms found in
 * the retrieved candidates' text. PASS ≥ 0.50 · WARN 0.30–0.50 · BLOCK < 0.30.
 */
export function critique(query: TokenizedQuery, hits: SearchHit[]): CriticResult {
  const terms = query.terms;
  if (terms.length === 0) {
    return { verdict: 'pass', coverage: 1, matchedTerms: [], missingTerms: [] };
  }
  if (hits.length === 0) {
    return { verdict: 'block', coverage: 0, matchedTerms: [], missingTerms: [...terms] };
  }

  const haystack = hits
    .map((h) => `${h.entry.title} ${h.entry.text}`)
    .join(' ')
    .toLowerCase();
  const matched = terms.filter((t) => haystack.includes(t));
  const missing = terms.filter((t) => !haystack.includes(t));
  const coverage = matched.length / terms.length;

  const verdict =
    coverage >= DEFAULT_THRESHOLD ? 'pass' : coverage >= WARN_THRESHOLD ? 'warn' : 'block';

  return { verdict, coverage, matchedTerms: matched, missingTerms: missing };
}

/** Escalation: widen top-k and relax the threshold, then re-score. */
export function escalateOptions(opts: RankOptions = {}): RankOptions {
  return {
    ...opts,
    maxResults: (opts.maxResults ?? 5) + ESCALATION_EXTRA_K,
    minScore: (opts.minScore ?? 0.55) * ESCALATION_SCALE,
  };
}
