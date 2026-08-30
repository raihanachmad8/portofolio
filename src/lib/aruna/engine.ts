/**
 * Aruna engine — orchestrator: intent → retrieve → critique → respond.
 * @module aruna/engine
 */

import type { ArunaLocale, ChatResponse, EngineResult, KBEntry, ThinkingStep } from './types';
import { detectIntent, isCommand, getCommandFromInput } from './intent';
import { search, getAllEntries } from './lookup';
import { tokenize } from './tokenizer';
import { DEFAULT_MAX_RESULTS } from './ranker';
import { critique, escalateOptions } from './critic';
import {
  composeQA,
  composeProjectList,
  composeSkillList,
  composeExperienceList,
  composeBlogList,
  composeCV,
  composeProfile,
  composeContact,
  composeRefusal,
  wrapPartial,
  topicSuggestions,
  buildIntentThinking,
  buildRetrievalThinking,
  buildRespondThinking,
  createGreeting,
  createThankResponse,
  createFarewellResponse,
  createUnknownResponse,
  createHelpResponse,
  createResetResponse,
  createThemeResponse,
} from './responses';
import { getUserName, setUserName, clearAll } from './storage';

export interface ProcessOptions {
  locale: ArunaLocale;
  userName?: string | null;
}

function getQA(locale: ArunaLocale, topic?: string): KBEntry | null {
  const qas = getAllEntries().filter((e) => e.kind === 'qa');
  const pool = topic ? qas.filter((e) => e.topic === topic) : qas;
  return pool.find((e) => e.lang === locale) ?? pool.find((e) => !e.lang) ?? pool[0] ?? null;
}

function getProfileEntry(): KBEntry | null {
  return getAllEntries().find((e) => e.kind === 'profile') ?? null;
}

/** Route a retrieved outcome to the composer matching the dominant hit kind. */
function composeByKind(outcome: ReturnType<typeof search>, locale: ArunaLocale): ChatResponse {
  const kinds = outcome.hits.map((h) => h.entry.kind);
  const kind: KBEntry['kind'] = kinds[0] ?? 'project';
  switch (kind) {
    case 'skill':
      return composeSkillList(outcome, locale);
    case 'experience':
      return composeExperienceList(outcome, locale);
    case 'blog':
      return composeBlogList(outcome, locale);
    case 'cv':
      return composeCV(outcome, locale);
    case 'profile':
    case 'qa':
      return composeProfile(outcome.hits[0].entry, locale);
    case 'project':
    default:
      return composeProjectList(outcome, locale);
  }
}

/** Kind each search intent is scoped to (so "proyek X" answers with projects). */
const KIND_BY_INTENT: Record<string, KBEntry['kind']> = {
  search_project: 'project',
  search_skill: 'skill',
  search_blog: 'blog',
  search_experience: 'experience',
};

/** "No <kind> found" copy for a kind-scoped search that matched nothing. */
function composeKindEmpty(kind: KBEntry['kind'], outcome: ReturnType<typeof search>, locale: ArunaLocale): ChatResponse {
  switch (kind) {
    case 'skill':
      return composeSkillList(outcome, locale);
    case 'experience':
      return composeExperienceList(outcome, locale);
    case 'blog':
      return composeBlogList(outcome, locale);
    default:
      return composeProjectList(outcome, locale);
  }
}

/** True when the query shares a content token with the entry title. */
function titleOverlaps(query: string, title: string): boolean {
  const q = new Set(tokenize(query));
  return q.size > 0 && tokenize(title).some((t) => q.has(t));
}

/** Helper words that add no retrieval value ("tools yang PAKAI"). */
const JUNK_ENTITY = new Set([
  'pakai', 'gunakan', 'menggunakan', 'memakai', 'use', 'using', 'used',
  'tell', 'ceritakan', 'jelaskan', 'cerita', 'isi', 'soal', 'liat', 'lihat',
  'daftar', 'list', 'cara', 'bikin', 'buat', 'apa', 'yang', 'apa saja',
  'macam', 'contoh', 'kalian',
]);

/** Drop generic helper entities; empty result → broad listing fallback. */
function cleanSearchEntities(entities: string[]): string[] {
  return entities.filter((e) => !JUNK_ENTITY.has(e.toLowerCase()));
}

/**
 * Search the KB, run the critic, escalate once on BLOCK, then respond.
 * Kind-scoped intents search a wide window (50) so a lower-ranked entry of the
 * intended kind (e.g. a blog post behind several skills) is still found.
 */
function searchContent(query: string, locale: ArunaLocale, intent = 'search'): EngineResult {
  const window = { maxResults: 50 };
  let outcome = search(query, window);
  let verdict = critique(outcome.query, outcome.hits);
  const thinking: ThinkingStep[] = [
    ...buildIntentThinking(intent, 0, outcome.query.terms, locale),
  ];
  let escalated = false;

  if (verdict.verdict === 'block') {
    outcome = search(query, { ...escalateOptions({ maxResults: 50 }), maxResults: 50 });
    verdict = critique(outcome.query, outcome.hits);
    escalated = true;
  }
  thinking.push(...buildRetrievalThinking(outcome.query, outcome, verdict.verdict, escalated, locale));

  // Force the dominant kind for kind-scoped searches — "proyek yang pakai
  // Laravel" must answer with projects even if a skill entry scores higher.
  const kind = KIND_BY_INTENT[intent];
  const hits = kind ? outcome.hits.filter((h) => h.entry.kind === kind) : outcome.hits;

  if (hits.length === 0) {
    if (kind) {
      thinking.push(...buildRespondThinking('2', kind, locale));
      return {
        response: composeKindEmpty(kind, { ...outcome, hits: [] }, locale),
        shouldClear: false,
        thinking,
      };
    }
    thinking.push(...buildRespondThinking('1', 'refusal', locale));
    return { response: composeRefusal(locale), shouldClear: false, thinking };
  }

  // About intent: prefer a concrete project hit ("ceritakan SatuRT" → the
  // SatuRT project) and refuse when the entity has no tie to any hit title
  // ("siapa presiden indonesia?" shouldn't answer from portfolio data).
  if (intent === 'about' && hits.length > 0) {
    const projectHit = hits.find((h) => h.entry.kind === 'project');
    if (projectHit && hits[0].entry.kind !== 'project') {
      const reordered = [projectHit, ...hits.filter((h) => h !== projectHit)];
      const scoped = { ...outcome, hits: reordered };
      verdict = critique(scoped.query, scoped.hits);
      const response = composeByKind(scoped, locale);
      thinking.push(...buildRespondThinking('2', scoped.hits[0].entry.kind, locale));
      return { response, shouldClear: false, thinking };
    }
    if (!titleOverlaps(query, hits[0].entry.title)) {
      thinking.push(...buildRespondThinking('1', 'refusal', locale));
      return { response: composeRefusal(locale), shouldClear: false, thinking };
    }
  }

  const scoped = kind && hits.length !== outcome.hits.length ? { ...outcome, hits } : outcome;
  verdict = critique(scoped.query, scoped.hits);
  if (verdict.verdict === 'block' || scoped.hits.length === 0) {
    thinking.push(...buildRespondThinking('1', 'refusal', locale));
    return { response: composeRefusal(locale), shouldClear: false, thinking };
  }

  let response = composeByKind(scoped, locale);
  if (verdict.verdict === 'warn') response = wrapPartial(response, locale);
  thinking.push(...buildRespondThinking('2', scoped.hits[0].entry.kind, locale));

  return { response, shouldClear: false, thinking };
}

/** Words that must never be captured as a name in a bare "aku X" intro. */
const NON_NAME_WORDS = new Set([
  'suka', 'mau', 'ingin', 'bisa', 'punya', 'sedang', 'akan', 'ada', 'ini',
  'itu', 'pengen', 'lihat', 'cari', 'tanya', 'butuh', 'perlu', 'disini',
  'disana', 'here', 'there', 'want', 'need', 'like', 'looking', 'from',
  'di', 'dari', 'untuk', 'the', 'a', 'an', 'hello', 'hai', 'halo',
]);

/** Capture "my name is X" / "panggil aku X" / "aku X" style intros. */
function captureName(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /(?:my name is|i am|i'm|call me)\s+([a-z][a-z .'-]{1,40})/i,
    /(?:namaku|aku namaku|nama saya)\s+([a-z][a-z .'-]{1,40})/i,
    /(?:panggil (?:aku|saya)|aku dipanggil|dipanggil)\s+([a-z][a-z .'-]{1,40})/i,
    // Bare "aku X" / "saya X" — must be case-sensitive: name must START with a
    // capital letter, otherwise "aku adalah magang" or "aku suka" gets captured.
    /(?:^|\s)(?:aku|saya)\s+([A-Z][a-z][a-z .'-]{0,38})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) {
      const name = m[1].trim().replace(/[.,!?]+$/, '');
      if (name.length >= 2 && !NON_NAME_WORDS.has(name.toLowerCase())) return name;
    }
  }
  return null;
}

/** Resolve an intent that maps to a canonical Q&A topic, falling back to search. */
function topicIntent(
  topic: string,
  query: string,
  locale: ArunaLocale,
  intent = topic,
): EngineResult {
  const qa = getQA(locale, topic);
  if (qa) {
    const thinking: ThinkingStep[] = [
      ...buildIntentThinking(intent, 1, qa.title.split(' ').slice(0, 4), locale),
      { phase: 'source', text: `qa · ${qa.id}` },
      ...buildRespondThinking('1', 'qa', locale),
    ];
    return { response: composeQA(qa, locale), shouldClear: false, thinking };
  }
  return searchContent(query, locale, intent);
}

/** Build a broad listing response of every entry of a kind (generic query). */
function listAll(kind: 'project' | 'skill' | 'experience' | 'blog', locale: ArunaLocale, intent = kind): EngineResult {
  const entries = getAllEntries().filter((e) => e.kind === kind);
  const outcome = {
    hits: entries.map((entry) => ({ entry, score: 0, mode: 'lexical' as const })),
    query: { terms: [], original: '' },
    filters: {},
  };
  const response =
    kind === 'skill'
      ? composeSkillList(outcome, locale)
      : kind === 'experience'
        ? composeExperienceList(outcome, locale)
        : kind === 'blog'
          ? composeBlogList(outcome, locale)
          : composeProjectList(outcome, locale);
  const thinking: ThinkingStep[] = [
    ...buildIntentThinking(intent, 1, [], locale),
    { phase: 'retrieve', text: `${entries.length} ${locale === 'id' ? 'entri' : 'entries'} · all ${kind}` },
    ...buildRespondThinking('3', kind, locale),
  ];
  return { response, shouldClear: false, thinking };
}

/** Answer "what can you do?" / help-style generic questions. */
function capabilities(locale: ArunaLocale): EngineResult {
  const thinking: ThinkingStep[] = [
    ...buildIntentThinking('capabilities', 1, [], locale),
    ...buildRespondThinking('0', 'help', locale),
  ];
  return { response: createHelpResponse({ userName: getUserName() }, locale), shouldClear: false, thinking };
}

export function processInput(input: string, opts: ProcessOptions): EngineResult {
  const locale = opts.locale ?? 'en';
  const trimmed = input.trim();
  const userName = opts.userName ?? getUserName();

  if (!trimmed) {
    return {
      response: { text: locale === 'id' ? 'Ketik sesuatu! Coba /help.' : 'Type something! Try /help.' },
      shouldClear: false,
      thinking: [
        { phase: 'input', text: 'empty input' },
        ...buildRespondThinking('0', 'prompt', locale),
      ],
    };
  }

  const intentResult = detectIntent(trimmed);
  const searchQuery = intentResult.entities.join(' ');

  const conv = (layer = '0'): ThinkingStep[] => [
    ...buildIntentThinking(intentResult.intent, intentResult.confidence, intentResult.entities, locale),
    ...buildRespondThinking(layer, intentResult.intent, locale),
  ];

  if (isCommand(trimmed)) {
    const { cmd, args } = getCommandFromInput(trimmed);
    if (cmd === 'reset') {
      clearAll();
      return { response: createResetResponse(locale), shouldClear: true, thinking: conv('0') };
    }
    if (cmd === 'theme') {
      return { response: createThemeResponse(args, locale), shouldClear: false, thinking: conv('0') };
    }
  }

  if (!userName) {
    const name = captureName(trimmed);
    if (name) {
      setUserName(name);
      return {
        response: {
          text: locale === 'id'
            ? `Senang bertemu kamu, ${name}! Aku Aruna. Tanya soal proyek, skill, pengalaman, atau CV.`
            : `Nice to meet you, ${name}! I'm Aruna. Ask me about projects, skills, experience, or my CV.`,
          suggestions: topicSuggestions(['project', 'skill', 'experience', 'cv'], locale),
        },
        shouldClear: false,
        thinking: [{ phase: 'input', text: `name captured: ${name}` }, ...conv('0')],
      };
    }
  }

  const handlers: Record<string, () => EngineResult> = {
    greeting: () => ({ response: createGreeting({ userName }, null, locale), shouldClear: false, thinking: conv('0') }),
    thanks: () => ({ response: createThankResponse({ userName }, locale), shouldClear: false, thinking: conv('0') }),
    farewell: () => ({ response: createFarewellResponse({ userName }, locale), shouldClear: false, thinking: conv('0') }),
    help: () => ({ response: createHelpResponse({ userName }, locale), shouldClear: false, thinking: conv('0') }),
    reset: () => { clearAll(); return { response: createResetResponse(locale), shouldClear: true, thinking: conv('0') }; },
    theme: () => ({ response: createThemeResponse(searchQuery, locale), shouldClear: false, thinking: conv('0') }),
    contact: () => handleContact(intentResult, locale),
    about: () => handleAbout(intentResult, searchQuery, locale),
    search_project: () => handleSearch('project', intentResult.entities, locale, 'search_project'),
    search_skill: () => handleSearch('skill', intentResult.entities, locale, 'search_skill'),
    search_experience: () => searchQuery ? topicIntent('experience', searchQuery, locale, 'search_experience') : listAll('experience', locale, 'search_experience'),
    search_blog: () => handleSearch('blog', intentResult.entities, locale, 'search_blog'),
    education: () => topicIntent('education', searchQuery, locale, 'education'),
    certification: () => topicIntent('certification', searchQuery, locale, 'certification'),
    competition: () => topicIntent('competition', searchQuery, locale, 'competition'),
    organization: () => topicIntent('organization', searchQuery, locale, 'organization'),
    availability: () => topicIntent('availability', searchQuery, locale, 'availability'),
    location: () => topicIntent('location', searchQuery, locale, 'location'),
  };

  const handler = handlers[intentResult.intent];
  if (handler) return handler();
  return searchQuery ? searchContent(searchQuery, locale, 'unknown') : capabilities(locale);
}

function handleContact(result: IntentResult, locale: ArunaLocale): EngineResult {
  const profile = getProfileEntry();
  if (profile?.facts?.email) {
    return {
      response: composeContact(profile, locale),
      shouldClear: false,
      thinking: [
        ...buildIntentThinking(result.intent, result.confidence, result.entities, locale),
        { phase: 'source', text: 'profile' },
        ...buildRespondThinking('3', 'profile', locale),
      ],
    };
  }
  const qa = getQA(locale, 'contact');
  return {
    response: qa ? composeQA(qa, locale) : composeContact(profile, locale),
    shouldClear: false,
    thinking: [
      ...buildIntentThinking(result.intent, result.confidence, result.entities, locale),
      { phase: 'source', text: qa ? `qa · ${qa.id}` : 'profile' },
      ...buildRespondThinking(qa ? '1' : '3', qa ? 'qa' : 'profile', locale),
    ],
  };
}

function handleAbout(result: IntentResult, searchQuery: string, locale: ArunaLocale): EngineResult {
  if (searchQuery) return searchContent(searchQuery, locale, 'about');
  const profile = getProfileEntry();
  if (profile?.answers) {
    return {
      response: composeProfile(profile, locale),
      shouldClear: false,
      thinking: [
        ...buildIntentThinking(result.intent, result.confidence, result.entities, locale),
        { phase: 'source', text: 'profile · narrative' },
        ...buildRespondThinking('3', 'profile', locale),
      ],
    };
  }
  const qa = getQA(locale, 'about');
  return {
    response: qa ? composeQA(qa, locale) : composeProfile(profile, locale),
    shouldClear: false,
    thinking: [
      ...buildIntentThinking(result.intent, result.confidence, result.entities, locale),
      { phase: 'source', text: qa ? `qa · ${qa.id}` : 'profile' },
      ...buildRespondThinking(qa ? '1' : '3', qa ? 'qa' : 'profile', locale),
    ],
  };
}

function handleSearch(kind: string, entities: string[], locale: ArunaLocale, intent: string): EngineResult {
  const ents = cleanSearchEntities(entities);
  return ents.length
    ? searchContent(ents.join(' '), locale, intent)
    : listAll(kind as KBEntry['kind'], locale, intent);
}
