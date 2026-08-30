/**
 * Extractor — pulls structured filters out of a query.
 * @module aruna/extractor
 */

import type { ExtractedFields } from './types';
import type { TokenizedQuery } from './tokenizer';

const CATEGORY_SYNONYMS: Record<string, string> = {
  backend: 'backend',
  api: 'backend',
  server: 'backend',
  frontend: 'frontend',
  ui: 'frontend',
  web: 'frontend',
  database: 'database',
  db: 'database',
  devops: 'devops',
  deploy: 'devops',
  cloud: 'devops',
};

export function extractFields(query: TokenizedQuery): ExtractedFields {
  const fields: ExtractedFields = {};
  for (const term of query.terms) {
    const cat = CATEGORY_SYNONYMS[term];
    if (cat) fields.category = cat;
    if (/^\d{4}$/.test(term)) fields.year = Number(term);
  }
  return fields;
}
