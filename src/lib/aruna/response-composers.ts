/**
 * Composition functions that build Aruna chat responses.
 * @module aruna/response-composers
 */

import type { ArunaLocale, ChatResponse, KBEntry, NavAction, SearchOutcome, ThinkingStep } from './types';
import type { TokenizedQuery } from './tokenizer';
import {
  dict,
  pick,
  userNameSuffix,
  topicSuggestions,
  SECTION_TARGET,
  QA_SECTION,
  KIND_LABEL,
  QA_LABEL,
  tr,
} from './response-strings';

/** Trace phase keys — the client maps these to labels + icons. */
export type TracePhase =
  | 'input'
  | 'intent'
  | 'decompose'
  | 'retrieve'
  | 'critique'
  | 'escalate'
  | 'source'
  | 'respond';

/* ================================================================
 * Internal helpers
 * ================================================================ */

/** Resolve a KB entry to a navigable target (section selector or route). */
function navigateTarget(e: KBEntry): string | undefined {
  const { type, ref } = e.source;
  // QA entries carry a generic ref ("qa"); map by topic to the real section.
  if (e.kind === 'qa' && e.topic) return QA_SECTION[e.topic];
  if (type === 'slug') {
    if (ref.startsWith('/')) return ref; // /blog/x, /projects/x (already absolute)
    if (e.kind === 'project') return `/projects/${ref}`;
    return undefined;
  }
  if (type === 'section') return SECTION_TARGET[ref] ?? ref;
  if (e.kind === 'cv') return '#journey';
  return undefined;
}

/** Source chip: a kind prefix ("Proyek · SatuRT") + navigation target. */
function sourceFor(e: KBEntry, locale: ArunaLocale): { label: string; url?: string } {
  const id = locale === 'id';
  let label = e.title;
  if (e.kind === 'qa' && e.topic) {
    const pair = QA_LABEL[e.topic];
    if (pair) label = pair[id ? 0 : 1];
  }
  const kind = KIND_LABEL[e.kind];
  const url = navigateTarget(e);
  return { label: kind ? `${kind[id ? 0 : 1]} · ${label}` : label, url };
}

/** "Go to the matching section/page" button for an answer. */
function sectionAction(target: string, locale: ArunaLocale): NavAction {
  const id = locale === 'id';
  const labels: Record<string, [string, string]> = {
    '#work': ['Lihat semua proyek →', 'View all projects →'],
    '#skills': ['Lihat halaman Skills →', 'Go to Skills →'],
    '#journey': ['Lihat pengalaman →', 'View experience →'],
    '#blog': ['Buka blog →', 'Open blog →'],
    '/blog': ['Buka blog →', 'Open blog →'],
    '#about': ['Tentang saya →', 'About me →'],
    '#contact': ['Hubungi saya →', 'Contact me →'],
  };
  const pair = labels[target];
  const href = target.startsWith('/') ? target : `/${target}`;
  return { label: pair ? pair[id ? 0 : 1] : 'Lihat →', target: href };
}

/* ================================================================
 * Layer 1 · canonical Q&A
 * ================================================================ */

export function composeQA(entry: KBEntry, locale: ArunaLocale): ChatResponse {
  const target = entry.topic ? QA_SECTION[entry.topic] : undefined;
  const text = entry.answers?.[locale] ?? entry.answer ?? entry.text;
  return {
    text,
    suggestions: topicSuggestions(entry.recommend, locale),
    actions: target ? [sectionAction(target, locale)] : undefined,
    sources: entry.topic ? [sourceFor(entry, locale)] : undefined,
  };
}

/* ================================================================
 * Layer 2 · extractive + sources
 * ================================================================ */

export function composeProjectList(outcome: SearchOutcome, locale: ArunaLocale): ChatResponse {
  const d = dict(locale);
  const projects = outcome.hits.filter((h) => h.entry.kind === 'project');
  if (projects.length === 0) {
    return { text: d.noProject.replace('{q}', outcome.query.original) };
  }
  const list = projects
    .map((h, i) => {
      const f = h.entry.facts ?? {};
      const year = f.year ? ` · ${f.year}` : '';
      const cat = f.category ? ` (${f.category})` : '';
      const stack = f.stack ? `\n   Stack: ${f.stack}` : '';
      return `${i + 1}. **${h.entry.title}**${cat}${year}${stack}`;
    })
    .join('\n\n');
  const text =
    d.foundProject.replace('{n}', String(projects.length)).replace('{q}', outcome.query.original) +
    `\n\n${list}`;
  return { text, sources: projects.map((h) => sourceFor(h.entry, locale)), actions: [sectionAction('#work', locale)], suggestions: topicSuggestions(['skill', 'contact'], locale) };
}

export function composeSkillList(outcome: SearchOutcome, locale: ArunaLocale): ChatResponse {
  const d = dict(locale);
  const skills = outcome.hits.filter((h) => h.entry.kind === 'skill');
  if (skills.length === 0) {
    return { text: d.noSkill.replace('{q}', outcome.query.original) };
  }
  const list = skills.map((h, i) => {
    const cat = h.entry.facts?.category;
    return `${i + 1}. ${h.entry.title}${cat ? ` — ${cat}` : ''}`;
  }).join('\n');
  const text =
    d.foundSkill.replace('{n}', String(skills.length)).replace('{q}', outcome.query.original) +
    `\n\n${list}`;
  return { text, sources: skills.map((h) => sourceFor(h.entry, locale)), actions: [sectionAction('#skills', locale)], suggestions: topicSuggestions(['project', 'contact'], locale) };
}

/** Compose an experience (work) list with role, company, period, location. */
export function composeExperienceList(outcome: SearchOutcome, locale: ArunaLocale): ChatResponse {
  const d = dict(locale);
  const items = outcome.hits.filter((h) => h.entry.kind === 'experience');
  if (items.length === 0) {
    return { text: d.noExperience.replace('{q}', outcome.query.original) };
  }
  const list = items
    .map((h, i) => {
      const f = h.entry.facts ?? {};
      const company = f.company ? ` — ${f.company}` : '';
      const period = f.period ? `\n   ${f.period}` : '';
      const location = f.location ? ` · ${f.location}` : '';
      return `${i + 1}. **${h.entry.title}**${company}\n   ${f.period ? `${f.period}${location}` : ''}`;
    })
    .join('\n\n');
  const text = `${d.foundExperience.replace('{q}', outcome.query.original)}\n\n${list}`;
  return { text, sources: items.map((h) => sourceFor(h.entry, locale)), actions: [sectionAction('#journey', locale)], suggestions: topicSuggestions(['project', 'skill'], locale) };
}

/** Compose a blog post list from hits. */
export function composeBlogList(outcome: SearchOutcome, locale: ArunaLocale): ChatResponse {
  const d = dict(locale);
  const posts = outcome.hits.filter((h) => h.entry.kind === 'blog');
  if (posts.length === 0) {
    return { text: d.noBlog.replace('{q}', outcome.query.original) };
  }
  const list = posts.map((h, i) => `${i + 1}. **${h.entry.title}**`).join('\n');
  const text =
    d.foundBlog.replace('{n}', String(posts.length)).replace('{q}', outcome.query.original) +
    `\n\n${list}`;
  return { text, sources: posts.map((h) => sourceFor(h.entry, locale)), actions: [sectionAction('/blog', locale)], suggestions: topicSuggestions(['project', 'skill'], locale) };
}

/** Compose CV-derived answers (summary, education, certs, achievements). */
export function composeCV(outcome: SearchOutcome, locale: ArunaLocale): ChatResponse {
  const d = dict(locale);
  const items = outcome.hits.filter((h) => h.entry.kind === 'cv');
  if (items.length === 0) {
    return { text: d.noCV.replace('{q}', outcome.query.original) };
  }
  const blocks = items.map((h, i) => {
    const e = h.entry;
    const body = e.answers?.[locale] ?? e.answer ?? e.text;
    return `${i + 1}. ${body}`;
  });
  const text = `${d.foundCV.replace('{q}', outcome.query.original)}\n\n${blocks.join('\n\n')}`;
  return { text, sources: items.map((h) => sourceFor(h.entry, locale)), actions: [sectionAction('#journey', locale)], suggestions: topicSuggestions(['project', 'skill'], locale) };
}

/** Compose a natural "about me" answer from the profile entry's narrative. */
export function composeProfile(entry: KBEntry | null, locale: ArunaLocale): ChatResponse {
  const d = dict(locale);
  if (!entry) return { text: d.noContact };
  const text = entry.answers?.[locale] ?? entry.answer ?? entry.text;
  return {
    text,
    sources: [sourceFor(entry, locale)],
    suggestions: topicSuggestions(['project', 'skill', 'contact'], locale),
  };
}

/* ================================================================
 * Layer 3 · structured templates
 * ================================================================ */

export function composeContact(entry: KBEntry | null, locale: ArunaLocale): ChatResponse {
  const d = dict(locale);
  if (!entry) return { text: d.noContact };
  const f = entry.facts ?? {};
  const lines = [`**${entry.title}**${f.role ? ` — ${f.role}` : ''}`];
  if (f.location) lines.push(`📍 ${f.location}`);
  if (f.email) lines.push(`✉️ ${f.email}`);
  if (f.github) lines.push(`🐙 ${f.github}`);
  if (f.linkedin) lines.push(`💼 ${f.linkedin}`);
  if (f.website) lines.push(`🌐 ${f.website}`);
  if (f.cv) lines.push(`📄 CV: ${f.cv}`);
  return { text: lines.join('\n'), sources: [sourceFor(entry, locale)], actions: [sectionAction('#contact', locale)], suggestions: topicSuggestions(['project', 'skill'], locale) };
}

/* ================================================================
 * Shared / utilities
 * ================================================================ */

export function composeRefusal(locale: ArunaLocale): ChatResponse {
  return {
    text: dict(locale).refused,
    suggestions: topicSuggestions(['project', 'skill', 'contact'], locale),
    data: { refused: true },
  };
}

export function wrapPartial(resp: ChatResponse, locale: ArunaLocale): ChatResponse {
  return { ...resp, text: `${dict(locale).partial}\n\n${resp.text}` };
}

/* ================================================================
 * Trace thinking builders
 * ================================================================ */

/** First step: what intent was detected and on which terms. */
export function buildIntentThinking(
  intent: string,
  confidence: number,
  terms: string[],
  locale: ArunaLocale,
): ThinkingStep[] {
  return [
    {
      phase: 'intent',
      text: `${intent} · conf ${confidence.toFixed(2)} · ${terms.length ? terms.join(', ') : tr(locale, 'generic')}`,
    },
  ];
}

/** Middle steps for retrieval: decompose → retrieve → critique (+ escalate). */
export function buildRetrievalThinking(
  query: TokenizedQuery,
  outcome: SearchOutcome,
  verdict: string,
  escalated = false,
  locale: ArunaLocale = 'en',
): ThinkingStep[] {
  const steps: ThinkingStep[] = [];
  if (escalated) steps.push({ phase: 'escalate', text: 'top-k widened · threshold × 0.75' });
  steps.push({ phase: 'decompose', text: `${outcome.query.terms.join(', ') || '(generic)'}` });
  const top = outcome.hits[0];
  const topLabel = top ? `${top.entry.title} (${top.mode}, ${top.score.toFixed(3)})` : '—';
  steps.push({
    phase: 'retrieve',
    text: `${outcome.hits.length} ${tr(locale, 'retrieve')} · top ${topLabel}`,
  });
  steps.push({ phase: 'critique', text: `${verdict.toUpperCase()} · coverage ${top ? 1 : 0}` });
  return steps;
}

/** Final step: which response layer / kind produced the answer. */
export function buildRespondThinking(
  layer: string,
  kind: string,
  locale: ArunaLocale,
): ThinkingStep[] {
  return [
    { phase: 'respond', text: `${tr(locale, 'respondLayer')} ${layer} · ${tr(locale, 'respondKind')} ${kind}` },
  ];
}

/* ================================================================
 * Conversational intents (bilingual)
 * ================================================================ */

export function createGreeting(
  context: { userName: string | null },
  _profile: unknown,
  locale: ArunaLocale = 'en',
): ChatResponse {
  const text = pick(dict(locale).greeting).replace('{userName}', userNameSuffix(context.userName));
  return { text, suggestions: topicSuggestions(['project', 'skill', 'contact'], locale) };
}

export function createThankResponse(
  context: { userName: string | null },
  locale: ArunaLocale = 'en',
): ChatResponse {
  return {
    text: pick(dict(locale).thanks).replace('{userName}', userNameSuffix(context.userName)),
  };
}

export function createFarewellResponse(
  context: { userName: string | null },
  locale: ArunaLocale = 'en',
): ChatResponse {
  return {
    text: pick(dict(locale).farewell).replace('{userName}', userNameSuffix(context.userName)),
  };
}

export function createUnknownResponse(locale: ArunaLocale = 'en'): ChatResponse {
  return { text: pick(dict(locale).unknown), suggestions: topicSuggestions(['project', 'skill', 'help'], locale) };
}

export function createHelpResponse(
  context: { userName: string | null },
  locale: ArunaLocale = 'en',
): ChatResponse {
  const d = dict(locale);
  const name = userNameSuffix(context.userName);
  return {
    text: `${name ? `Hey${name}!` : 'Hey!'}\n\n${d.help}`,
    suggestions: topicSuggestions(['project', 'skill', 'contact'], locale),
  };
}

export function createResetResponse(locale: ArunaLocale = 'en'): ChatResponse {
  return { text: dict(locale).reset, action: 'clear', suggestions: topicSuggestions(['project', 'skill', 'help'], locale) };
}

export function createThemeResponse(args: string, locale: ArunaLocale = 'en'): ChatResponse {
  const d = dict(locale);
  const theme = args.toLowerCase().trim();
  if (!theme) return { text: d.themeUsage };
  const valid = ['gallery', 'terminal', 'editorial', 'swiss'];
  if (!valid.includes(theme)) return { text: d.themeInvalid.replace('{t}', theme) };
  return { text: d.themeSet.replace('{t}', theme), action: 'theme-change', data: { theme } };
}
