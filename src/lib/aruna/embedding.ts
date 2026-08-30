/**
 * Embedding backend selector + deterministic hashed n-gram vectorizer.
 *
 * Query/document vectors are produced by one of three backends, in priority:
 *   1. `api`  — a server `/api/embed` endpoint (best multilingual quality).
 *   2. `onnx` — transformers.js multilingual MiniLM, lazy-loaded client-side.
 *   3. `local`— deterministic hashed character n-grams. No deps, offline, fast.
 *   4. `none` — no embedder → caller falls back to lexical-only retrieval.
 *
 * The `local` backend is the always-available baseline: it is deterministic,
 * testable offline, and gives real typo/paraphrase robustness. `api`/`onnx`
 * are upgrade paths that slot in behind the same `embedText` contract.
 * @module aruna/embedding
 */

export type EmbedBackend = 'api' | 'onnx' | 'local' | 'none';

/** Embedding dimension. Matches the multilingual MiniLM family (384-d). */
export const EMBED_DIM = 384;

export interface EmbedConfig {
  /** Forced backend. `null` → resolve from available resources. */
  backend?: EmbedBackend | null;
  /** True when a server embed endpoint is configured. */
  hasApi?: boolean;
  /** True when transformers.js has been bundled (dynamic import). */
  hasOnnx?: boolean;
}

const DEFAULT_CONFIG: Required<EmbedConfig> = {
  backend: null,
  hasApi: false,
  hasOnnx: false,
};

/**
 * Module-level singleton — set once via initEmbedding() at startup, then read
 * by resolveEmbedBackend(). Mutable by design: configuration is determined
 * once and does not change during the request lifecycle.
 */
let config: Required<EmbedConfig> = { ...DEFAULT_CONFIG };

/** Configure embedder availability (set once at init / build time). */
export function initEmbedding(cfg: Partial<EmbedConfig> = {}): void {
  config = { ...DEFAULT_CONFIG, ...cfg };
}

/** Resolve the effective backend in priority order. */
export function resolveEmbedBackend(overrides: Partial<EmbedConfig> = {}): EmbedBackend {
  const c = { ...config, ...overrides };
  if (c.backend) return c.backend;
  if (c.hasApi) return 'api';
  if (c.hasOnnx) return 'onnx';
  return 'local';
}

/** Extract sliding character n-grams (default trigrams) from text. */
export function charGrams(text: string, n = 3): string[] {
  const norm = text.toLowerCase().replace(/\s+/g, ' ');
  if (norm.length < n) return [norm];
  const grams: string[] = [];
  for (let i = 0; i <= norm.length - n; i++) {
    grams.push(norm.slice(i, i + n));
  }
  return grams;
}

/** Deterministic signed string hash (FNV-1a variant). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Embed text into a fixed-dim vector via hashed character n-grams.
 * Each gram votes into a bucket with a ±1 sign (based on hash bit) and a
 * sublinear frequency weight. The vector is L2-normalized.
 * Deterministic — identical input → identical vector.
 */
export function embedText(text: string): number[] {
  const vec = new Float64Array(EMBED_DIM);
  const tf = new Map<string, number>();
  for (const gram of charGrams(text)) tf.set(gram, (tf.get(gram) ?? 0) + 1);

  for (const [gram, count] of tf) {
    const h = hashString(gram);
    const bucket = h % EMBED_DIM;
    const sign = (h & 0x80000000) === 0 ? 1 : -1;
    vec[bucket] += sign * (1 + Math.log(count));
  }

  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return new Array(EMBED_DIM).fill(0);
  return Array.from(vec, (v) => v / norm);
}

/** Cosine similarity between two dense vectors (both L2-normalized). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  // Clamp to [-1, 1] against float drift.
  return Math.max(-1, Math.min(1, dot));
}
