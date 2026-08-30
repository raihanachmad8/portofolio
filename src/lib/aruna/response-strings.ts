/**
 * Bilingual string constants, lookup tables, and string helpers for Aruna responses.
 * @module aruna/response-strings
 */

import type { ArunaLocale } from './types';

/* ================================================================
 * Core bilingual dictionary
 * ================================================================ */

export const STR = {
  en: {
    greeting: [
      "Hey{userName}! I'm Aruna. What can I help you with?",
      "Hello{userName}! Welcome back. Ask me about projects, skills, or experience.",
      "Hi there{userName}! Try /help to see what I can do.",
    ],
    help: "Here's what I can do:\n\n• Ask about projects, skills, experience, education, certifications, competitions, organizations, blog, contact, or availability.\n• /theme <name> — switch theme (gallery, terminal, editorial, swiss)\n• /reset — clear chat\n• /help — this message",
    noProject: 'I could not find projects matching "{q}". Try different keywords.',
    noSkill: 'I could not find skills matching "{q}". Try different keywords.',
    foundProject: 'Found {n} project(s) matching "{q}":',
    foundSkill: 'Found {n} skill(s) matching "{q}":',
    partial: 'Heads up: I only have partial information for "{q}".',
    refused:
      "I couldn't find that in my knowledge base. Try asking about projects, skills, experience, or contact.",
    thanks: ["You're welcome{userName}!", "Glad I could help{userName}!"],
    farewell: ['Goodbye{userName}! Come back anytime.', 'See you later{userName}!'],
    unknown: ["Hmm, I'm not sure about that. Try /help.", "I don't understand that yet. Type /help for commands."],
    reset: 'Chat cleared. Fresh start!',
    noContact: 'Contact info is not available right now.',
    noExperience: 'I could not find experience matching "{q}".',
    foundExperience: 'Here is what I found for "{q}":',
    noBlog: 'I could not find blog posts matching "{q}".',
    foundBlog: 'Found {n} post(s) matching "{q}":',
    noCV: 'I could not find that in the CV.',
    foundCV: 'Here is what the CV says about "{q}":',
    themeUsage: 'Current themes: gallery, terminal, editorial, swiss\nUsage: /theme <name>',
    themeInvalid: 'Invalid theme "{t}". Available: gallery, terminal, editorial, swiss',
    themeSet: 'Theme set to "{t}". Looking good!',
  },
  id: {
    greeting: [
      "Hai{userName}! Aku Aruna. Ada yang bisa kubantu?",
      "Halo{userName}! Selamat datang kembali. Tanya soal proyek, skill, atau pengalaman.",
      "Halo{userName}! Coba /help untuk lihat yang bisa kulakukan.",
    ],
    help: "Yang bisa kulakukan:\n\n• Tanya soal proyek, skill, pengalaman, pendidikan, sertifikasi, lomba, organisasi, blog, kontak, atau ketersediaan.\n• /theme <nama> — ganti tema (gallery, terminal, editorial, swiss)\n• /reset — bersihkan chat\n• /help — pesan ini",
    noProject: 'Aku tidak menemukan proyek yang cocok dengan "{q}". Coba kata kunci lain.',
    noSkill: 'Aku tidak menemukan skill yang cocok dengan "{q}". Coba kata kunci lain.',
    foundProject: 'Ketemu {n} proyek yang cocok dengan "{q}":',
    foundSkill: 'Ketemu {n} skill yang cocok dengan "{q}":',
    partial: 'Heads up: aku hanya punya info parsial untuk "{q}".',
    refused:
      'Aku tidak menemukan itu di basis pengetahuanku. Coba tanya soal proyek, skill, pengalaman, atau kontak.',
    thanks: ["Sama-sama{userName}!", "Senang bisa membantu{userName}!"],
    farewell: ["Sampai jumpa{userName}!", "Sampai nanti{userName}!"],
    unknown: ['Hmm, aku kurang yakin. Coba /help.', 'Aku belum paham itu. Ketik /help untuk daftar perintah.'],
    reset: 'Chat dibersihkan. Mulai lagi!',
    noContact: 'Info kontak belum tersedia saat ini.',
    noExperience: 'Aku tidak menemukan pengalaman yang cocok dengan "{q}".',
    foundExperience: 'Ini yang kutemukan untuk "{q}":',
    noBlog: 'Aku tidak menemukan artikel yang cocok dengan "{q}".',
    foundBlog: 'Ketemu {n} artikel yang cocok dengan "{q}":',
    noCV: 'Aku tidak menemukan itu di CV.',
    foundCV: 'Ini kata CV tentang "{q}":',
    themeUsage: 'Tema saat ini: gallery, terminal, editorial, swiss\nCara pakai: /theme <nama>',
    themeInvalid: 'Tema "{t}" tidak valid. Tersedia: gallery, terminal, editorial, swiss',
    themeSet: 'Tema diubah ke "{t}". Mantap!',
  },
} as const;

export type Dict = (typeof STR)['en'];

export function dict(locale: ArunaLocale): Dict {
  return locale === 'id' ? STR.id : STR.en;
}

/* ================================================================
 * Utility helpers
 * ================================================================ */

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function userNameSuffix(userName: string | null): string {
  return userName ? `, ${userName}` : '';
}

/* ================================================================
 * Topic suggestion chips (bilingual [id, en])
 * ================================================================ */

const TOPIC_SUGGEST: Record<string, [string, string]> = {
  project: ['Lihat proyek', 'Show projects'],
  skill: ['Keahlian kamu', 'Your skills'],
  experience: ['Pengalaman kerja', 'Work experience'],
  education: ['Pendidikan kamu', 'Your education'],
  certification: ['Sertifikasi kamu', 'Your certifications'],
  competition: ['Prestasi & lomba', 'Competitions & awards'],
  organization: ['Organisasi kamu', 'Your organizations'],
  availability: ['Tersedia kerja?', 'Open to work?'],
  location: ['Kamu di mana?', 'Where are you?'],
  cv: ['Tentang CV', 'About the CV'],
  contact: ['Kontak', 'Contact info'],
  blog: ['Artikel blog', 'Blog posts'],
  help: ['Bantuan', 'Help'],
};

/** Map KB topic ids to natural suggestion chips (deduped, localized). */
export function topicSuggestions(recommend: string[] | undefined, locale: ArunaLocale): string[] {
  if (!recommend?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const topic of recommend) {
    const pair = TOPIC_SUGGEST[topic];
    const phrase = pair ? pair[locale === 'id' ? 0 : 1] : null;
    if (phrase && !seen.has(phrase)) {
      seen.add(phrase);
      out.push(phrase);
    }
  }
  return out;
}

/* ================================================================
 * Section / navigation lookups
 * ================================================================ */

/** Real portfolio section ids (src/lib/utils.ts SECTIONS). */
export const SECTION_TARGET: Record<string, string> = {
  '#work': '/#work',
  '#skills': '/#skills',
  '#journey': '/#journey', // Experience section
  '#experience': '/#journey', // legacy KB ref → actual section
  '#blog': '/#blog',
  '#about': '/#about',
  '#contact': '/#contact',
};

/** QA topic → the portfolio section that answers it. */
export const QA_SECTION: Record<string, string> = {
  contact: '/#contact',
  about: '/#about',
  availability: '/#contact',
  location: '/#about',
  experience: '/#journey',
  education: '/#journey',
  certification: '/#journey',
  competition: '/#journey',
  organization: '/#journey',
};

/* ================================================================
 * Source / kind labels (bilingual)
 * ================================================================ */

/** KB kind → short source-chip label, bilingual [id, en]. */
export const KIND_LABEL: Record<string, [string, string]> = {
  project: ['Proyek', 'Project'],
  skill: ['Skill', 'Skill'],
  blog: ['Blog', 'Blog'],
  experience: ['Pengalaman', 'Experience'],
  profile: ['Profil', 'Profile'],
  cv: ['CV', 'CV'],
  qa: ['Info', 'Info'],
};

/** QA topic → readable source label (QA titles are keyword soup). */
export const QA_LABEL: Record<string, [string, string]> = {
  contact: ['Kontak', 'Contact'],
  about: ['Profil', 'Profile'],
  availability: ['Ketersediaan', 'Availability'],
  location: ['Lokasi', 'Location'],
  experience: ['Pengalaman', 'Experience'],
  education: ['Pendidikan', 'Education'],
  certification: ['Sertifikasi', 'Certification'],
  competition: ['Prestasi', 'Achievements'],
  organization: ['Organisasi', 'Organization'],
};

/* ================================================================
 * Trace strings
 * ================================================================ */

export const TRACE_STR = {
  en: {
    intent: 'intent',
    decompose: 'terms',
    retrieve: 'candidates',
    critique: 'verdict',
    escalate: 'escalate',
    generic: '(generic)',
    respondLayer: 'layer',
    respondKind: 'kind',
    source: 'source',
  },
  id: {
    intent: 'intensi',
    decompose: 'istilah',
    retrieve: 'kandidat',
    critique: 'verdict',
    escalate: 'eskalasi',
    generic: '(umum)',
    respondLayer: 'layer',
    respondKind: 'tipe',
    source: 'sumber',
  },
} as const;

export function tr(locale: ArunaLocale, key: keyof (typeof TRACE_STR)['en']): string {
  return locale === 'id' ? TRACE_STR.id[key] : TRACE_STR.en[key];
}
