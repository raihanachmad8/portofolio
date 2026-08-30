/**
 * POST /api/embed — embed text into dense vectors (server-side).
 * Uses the deterministic hashed n-gram vectorizer. This endpoint powers the
 * `api` embed backend and the build pipeline (spec D1). No external keys needed.
 */
import type { APIRoute } from 'astro';
import { embedText, EMBED_DIM } from '../../lib/aruna/embedding';
import { json } from '../../lib/api-utils';

const MAX_EMBED_BATCH = 50;

export const POST: APIRoute = async ({ request }) => {
  try {
    const raw = await request.json();
    const texts = Array.isArray(raw?.texts) ? raw.texts.slice(0, MAX_EMBED_BATCH) : [];
    if (texts.length === 0) {
      return json({ error: 'texts[] is required' }, 400);
    }
    const vectors = texts.map((t) => embedText(String(t ?? '')));
    return json({ dim: EMBED_DIM, vectors });
  } catch (err) {
    console.error('[Embed] Failed:', err);
    return json({ error: 'Internal server error' }, 500);
  }
};
