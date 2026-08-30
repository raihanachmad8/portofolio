/**
 * Knowledge base builder — normalizes portfolio content into searchable KB
 * entries. Every entry carries a source ref so answers stay traceable.
 * @module aruna/kb
 */

import type { Project, SkillsByCategory, Experience, Profile, Blog } from '../schemas';
import type { ArunaLocale, KBEntry } from './types';

/** Strip markdown syntax so the raw body is searchable plain text. */
function cleanMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // code blocks
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → label
    .replace(/[#>*_~\-|]/g, ' ') // markdown markers
    .replace(/\s+/g, ' ')
    .trim();
}

/** Structured CV data — source of CV-derived entries (education, certs, …). */
export interface CVEntry {
  id: string;
  title?: string;
  answer?: string;
  answers?: Partial<Record<ArunaLocale, string>>;
  facts?: Record<string, string>;
  recommend?: string[];
}

export interface CVCertification extends CVEntry {
  title: string;
  issuer: string;
  year: number;
  detail: { en: string; id: string };
}
export interface CVCompetition extends CVEntry {
  title: { en: string; id: string };
  result: { en: string; id: string };
  year: number;
  detail: { en: string; id: string };
}
export interface CVOrganization extends CVEntry {
  title: { en: string; id: string };
  org: string;
  detail: { en: string; id: string };
}
export interface CVAchievement extends CVEntry {
  title: { en: string; id: string };
  context?: string;
  detail: { en: string; id: string };
}

export interface CVData {
  summary: { en: string; id: string };
  education?: Array<{
    id: string;
    degree: { en: string; id: string };
    institution: string;
    gpa: string;
    period: { en: string; id: string };
    location: string;
    highlights: { en: string[]; id: string[] };
  }>;
  certifications?: CVCertification[];
  competitions?: CVCompetition[];
  organizations?: CVOrganization[];
  achievements?: CVAchievement[];
}

export interface KBBuildInput {
  projects: Project[];
  skills: SkillsByCategory;
  experience: Experience[];
  profile: Profile;
  blog?: Blog[];
  qa?: KBEntry[];
  cv?: CVData;
}

/** Normalize an arbitrary label into a slug-like id fragment. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function buildKB(input: KBBuildInput): KBEntry[] {
  const out: KBEntry[] = [];

  for (const p of input.projects) {
    if (!p.title) continue;
    const slug = p.slug || slugify(p.title);
    out.push({
      id: `project_${slug}`,
      kind: 'project',
      topic: 'project',
      title: p.title,
      text: `${p.title} ${p.category} ${p.year ?? ''} ${p.stack} ${p.description}`,
      facts: {
        category: p.category ?? '',
        year: p.year ? String(p.year) : '',
        stack: p.stack ?? '',
        github: p.github_url ?? '',
        live: p.live_url ?? '',
        featured: String(p.featured ?? false),
      },
      source: { type: 'slug', ref: slug },
      snapshotId: slug,
    });
  }

  const skillBuckets: Array<[string, Array<{ name: string; level: number }>]> = [
    ['backend', input.skills.backend ?? []],
    ['frontend', input.skills.frontend ?? []],
    ['database', input.skills.database ?? []],
    ['devops', input.skills.devops ?? []],
  ];
  for (const [category, items] of skillBuckets) {
    for (const s of items) {
      if (!s.name) continue;
      out.push({
        id: `skill_${category}_${slugify(s.name)}`,
        kind: 'skill',
        topic: 'skill',
        title: s.name,
        text: `${s.name} ${category}`,
        facts: { category, level: String(s.level ?? 0) },
        source: { type: 'section', ref: '#skills' },
        recommend: ['project', 'contact'],
      });
    }
  }
  for (const [category, names] of Object.entries(input.skills.tools ?? {})) {
    for (const name of names) {
      if (!name) continue;
      out.push({
        id: `skill_${category}_${slugify(name)}`,
        kind: 'skill',
        topic: 'skill',
        title: name,
        text: `${name} ${category} tool`,
        facts: { category, tool: 'true' },
        source: { type: 'section', ref: '#skills' },
        recommend: ['project', 'contact'],
      });
    }
  }

  for (const e of input.experience) {
    if (!e.title) continue;
    const id = e.id || slugify(`${e.company} ${e.title}`);
    out.push({
      id: `experience_${id}`,
      kind: 'experience',
      topic: 'experience',
      title: e.title,
      text: `${e.title} ${e.company} ${e.period ?? ''} ${e.location ?? ''} ${e.detail ?? ''}`,
      facts: {
        company: e.company ?? '',
        period: e.period ?? '',
        location: e.location ?? '',
      },
      source: { type: 'section', ref: '#experience' },
      recommend: ['project', 'contact'],
    });
  }

  const pr = input.profile;
  if (pr.name) {
    const searchable = [
      pr.name,
      pr.roleTitle,
      pr.location,
      pr.email,
      pr.github,
      pr.linkedin,
      pr.website,
      pr.cv_url,
      pr.aboutLead,
      ...(pr.aboutParas ?? []),
      ...(pr.marquee ?? []),
      ...(pr.principles ?? []).flatMap((p) => [p.title, p.description]),
      ...(pr.facts ?? []).map((f) => `${f.label} ${f.value}`),
      pr.available ? 'available open to work' : '',
    ]
      .filter(Boolean)
      .join(' ');
    out.push({
      id: 'profile',
      kind: 'profile',
      topic: 'profile',
      title: pr.name,
      text: searchable,
      facts: {
        role: pr.roleTitle ?? '',
        location: pr.location ?? '',
        email: pr.email ?? '',
        github: pr.github ?? '',
        linkedin: pr.linkedin ?? '',
        website: pr.website ?? '',
        cv: pr.cv_url ?? '',
        available: String(pr.available ?? true),
      },
      answers: {
        en: aboutNarrative(pr, 'en'),
        id: aboutNarrative(pr, 'id'),
      },
      source: { type: 'section', ref: '#about' },
    });
  }

  // CV-derived entries: summary, education, certifications, competitions, orgs, achievements.
  for (const cvEntry of buildCVEntries(input.cv)) {
    out.push(cvEntry);
  }

  for (const b of input.blog ?? []) {
    if (!b.title) continue;
    const slug = b.slug || slugify(b.title);
    const tags = Array.isArray(b.tags) ? b.tags : String(b.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
    out.push({
      id: `blog_${slug}`,
      kind: 'blog',
      topic: 'blog',
      title: b.title,
      // Include the (cleaned) body so Aruna can answer about what the post
      // actually says, not just its title/excerpt.
      text: `${b.title} ${b.excerpt ?? ''} ${cleanMarkdown(b.content ?? '')} ${tags.join(' ')}`.slice(0, 1800),
      facts: { category: String(b.category ?? '') },
      source: { type: 'slug', ref: `/blog/${slug}` },
    });
  }

  for (const qa of input.qa ?? []) {
    if (!qa.answer && !qa.answers) continue;
    out.push({ ...qa, source: qa.source ?? { type: 'section', ref: 'qa' } });
  }

  return out;
}

/** Compose a natural "about me" narrative from profile fields. */
function aboutNarrative(pr: Profile, locale: ArunaLocale): string {
  const paras = (pr.aboutParas ?? []).filter(Boolean);
  const principles = (pr.principles ?? []).map((p) => p.title).filter(Boolean);
  const facts = (pr.facts ?? [])
    .map((f) => `${f.label}: ${f.value}`)
    .filter(Boolean);
  const head = [pr.aboutLead, pr.roleTitle].filter(Boolean).join(' · ');
  const parts = [
    `${pr.name} — ${head}`,
    ...paras,
    principles.length ? `Principles: ${principles.join(', ')}.` : '',
    facts.length ? `Highlights: ${facts.join(', ')}.` : '',
  ].filter(Boolean);
  return parts.join('\n');
}

/** Build `cv`-kind KB entries from structured CV data. */
function buildCVEntries(cv?: CVData): KBEntry[] {
  if (!cv) return [];
  const out: KBEntry[] = [];

  if (cv.summary?.en || cv.summary?.id) {
    out.push({
      id: 'cv_summary',
      kind: 'cv',
      topic: 'summary',
      title: 'Summary',
      text: `summary ringkasan ${cv.summary.en} ${cv.summary.id}`,
      answers: { en: cv.summary.en, id: cv.summary.id },
      facts: { source: 'cv' },
      source: { type: 'cv', ref: 'summary' },
      recommend: ['education', 'experience', 'skill', 'contact'],
    });
  }

  for (const edu of cv.education ?? []) {
    const title = `${edu.degree.en} / ${edu.degree.id}`;
    out.push({
      id: `cv_education_${edu.id}`,
      kind: 'cv',
      topic: 'education',
      title,
      text: `education pendidikan degree ${title} ${edu.institution} gpa ipk ${edu.gpa} ${edu.period.en} ${edu.location} ${(edu.highlights.en ?? []).join(' ')} ${(edu.highlights.id ?? []).join(' ')}`,
      answers: {
        en: `**${edu.degree.en}** — ${edu.institution}\nGPA: ${edu.gpa} · ${edu.period.en} · ${edu.location}\n${(edu.highlights.en ?? []).join('\n')}`,
        id: `**${edu.degree.id}** — ${edu.institution}\nIPK: ${edu.gpa} · ${edu.period.id} · ${edu.location}\n${(edu.highlights.id ?? []).join('\n')}`,
      },
      facts: { gpa: edu.gpa, institution: edu.institution, period: edu.period.en },
      source: { type: 'cv', ref: 'education' },
      recommend: ['experience', 'skill', 'contact'],
    });
  }

  for (const cert of cv.certifications ?? []) {
    out.push({
      id: `cv_certification_${cert.id}`,
      kind: 'cv',
      topic: 'certification',
      title: `${cert.title.en} / ${cert.title.id}`,
      text: `certification sertifikasi ${cert.title.en} ${cert.title.id} ${cert.issuer} ${cert.year} ${cert.detail.en} ${cert.detail.id}`,
      answers: { en: cert.detail.en, id: cert.detail.id },
      facts: { issuer: cert.issuer, year: String(cert.year) },
      source: { type: 'cv', ref: 'certification' },
      recommend: ['skill', 'project', 'contact'],
    });
  }

  for (const comp of cv.competitions ?? []) {
    out.push({
      id: `cv_competition_${comp.id}`,
      kind: 'cv',
      topic: 'competition',
      title: `${comp.title.en} / ${comp.title.id}`,
      text: `competition kompetisi lomba ${comp.title.en} ${comp.title.id} ${comp.result.en} ${comp.result.id} ${comp.year} ${comp.detail.en} ${comp.detail.id}`,
      answers: {
        en: `**${comp.title.en}** (${comp.year})\n${comp.result.en}\n${comp.detail.en}`,
        id: `**${comp.title.id}** (${comp.year})\n${comp.result.id}\n${comp.detail.id}`,
      },
      facts: { year: String(comp.year) },
      source: { type: 'cv', ref: 'competition' },
      recommend: ['project', 'experience', 'contact'],
    });
  }

  for (const org of cv.organizations ?? []) {
    out.push({
      id: `cv_organization_${org.id}`,
      kind: 'cv',
      topic: 'organization',
      title: `${org.title.en} / ${org.title.id}`,
      text: `organization organisasi ${org.title.en} ${org.title.id} ${org.org} ${org.detail.en} ${org.detail.id}`,
      answers: { en: `**${org.title.en}** — ${org.org}\n${org.detail.en}`, id: `**${org.title.id}** — ${org.org}\n${org.detail.id}` },
      source: { type: 'cv', ref: 'organization' },
      recommend: ['experience', 'education', 'contact'],
    });
  }

  for (const ach of cv.achievements ?? []) {
    out.push({
      id: `cv_achievement_${ach.id}`,
      kind: 'cv',
      topic: 'achievement',
      title: `${ach.title.en} / ${ach.title.id}`,
      text: `achievement pencapaian ${ach.title.en} ${ach.title.id} ${ach.context ?? ''} ${ach.detail.en} ${ach.detail.id}`,
      answers: { en: `**${ach.title.en}**${ach.context ? `\n${ach.context}` : ''}\n${ach.detail.en}`, id: `**${ach.title.id}**${ach.context ? `\n${ach.context}` : ''}\n${ach.detail.id}` },
      source: { type: 'cv', ref: 'achievement' },
      recommend: ['experience', 'contact'],
    });
  }

  return out;
}
