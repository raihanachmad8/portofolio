/**
 * Aruna chatbot type definitions.
 * All modules conform to these contracts.
 * @module aruna/types
 */

import type { TokenizedQuery } from './tokenizer';

export interface ArunaMessage {
  id: string;
  role: 'user' | 'aruna';
  content: string;
  timestamp: number;
}

export type IntentType =
  | 'greeting'
  | 'search_project'
  | 'search_skill'
  | 'search_experience'
  | 'search_blog'
  | 'education'
  | 'certification'
  | 'competition'
  | 'organization'
  | 'availability'
  | 'location'
  | 'contact'
  | 'about'
  | 'help'
  | 'reset'
  | 'theme'
  | 'thanks'
  | 'farewell'
  | 'unknown';

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities: string[];
}

/** A "go to the actual page/section" button attached to an answer. */
export interface NavAction {
  label: string;
  /** CSS selector (`#skills`) or a route (`/projects/saturt`, `/blog`). */
  target: string;
}

export interface ChatResponse {
  text: string;
  suggestions?: string[];
  action?: 'clear' | 'theme-change' | 'scroll-to' | 'open-case';
  data?: Record<string, unknown>;
  /** Grounding citations — every claim traces back to a KB source. */
  sources?: { label: string; url?: string }[];
  /** Navigation buttons ("Lihat halaman Skills →") to the matching section/page. */
  actions?: NavAction[];
}

/** Site locale for bilingual responses. */
export type ArunaLocale = 'en' | 'id';

/** Knowledge base entry kinds. */
export type KBKind = 'project' | 'skill' | 'experience' | 'profile' | 'blog' | 'qa' | 'cv';

/** Where a KB entry's facts live, so answers stay traceable. */
export interface KBSource {
  type: 'slug' | 'section' | 'cv';
  ref: string;
}

/** One record of truth in the knowledge base. */
export interface KBEntry {
  id: string;
  kind: KBKind;
  topic?: string;
  lang?: ArunaLocale;
  title: string;
  text: string;
  /** Canonical answer for direct/QA entries. */
  answer?: string;
  /** Per-locale canonical answers (takes precedence over `answer`). */
  answers?: Partial<Record<ArunaLocale, string>>;
  /** Facts carried on the entry (e.g. GPA, year, period) for richer composers. */
  facts?: Record<string, string>;
  /** Related topic ids → suggestion chips. */
  recommend?: string[];
  source: KBSource;
  snapshotId?: string;
}

/** Structured filters pulled from a query. */
export interface ExtractedFields {
  category?: string;
  year?: number;
}

export type CriticVerdict = 'pass' | 'warn' | 'block';

export interface CriticResult {
  verdict: CriticVerdict;
  coverage: number;
  matchedTerms: string[];
  missingTerms: string[];
}

export interface SearchHit {
  entry: KBEntry;
  score: number;
  mode: 'lexical' | 'semantic' | 'rrf';
}

export interface SearchOutcome {
  hits: SearchHit[];
  query: TokenizedQuery;
  filters: ExtractedFields;
}

/** One step of the visible reasoning trace. */
export interface ThinkingStep {
  phase: string;
  text: string;
}

export interface EngineResult {
  response: ChatResponse;
  shouldClear: boolean;
  thinking: ThinkingStep[];
}
