/**
 * Content orchestration layer.
 * Single responsibility: resolve data from Notion or local MDX fallback.
 * @module content
 */

import { getCollection } from 'astro:content';
import {
  ProjectSchema,
  ExperienceSchema,
  BlogSchema,
  ProfileSchema,
  SkillsByCategorySchema,
  TickerItemSchema,
} from './schemas';
import type { Project, Experience, Blog, Profile, SkillsByCategory, TickerItem } from './schemas';
import { resolveConfig, isNotionAvailable, type NotionConfig } from './config';
import {
  fetchProfile,
  fetchProjects,
  fetchSkills,
  fetchExperience,
  fetchPageBlocks,
  fetchBlog,
  fetchTicker,
} from './notion';

// Local fallback data (only used when Notion is unavailable)
import localData from '../data/content.json';

/** Default empty skills structure */
const DEFAULT_SKILLS: SkillsByCategory = {
  backend: [],
  frontend: [],
  database: [],
  devops: [],
  tools: { backend: [], frontend: [], devops: [] },
};

/** Maximum number of recent posts to return */
const DEFAULT_RECENT_LIMIT = 3;

/**
 * In-flight request cache for deduplication.
 * Within same render cycle, multiple calls to same key
 * return the same promise (not make multiple API calls).
 */
const requestCache = new Map<string, Promise<unknown>>();

function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key) as Promise<T>;
  }
  const promise = fn();
  requestCache.set(key, promise);
  promise.finally(() => requestCache.delete(key));
  return promise;
}

/**
 * Resolves Notion config from runtime environment.
 * @param runtimeEnv - Runtime environment variables
 * @returns NotionConfig object
 */
function getConfig(runtimeEnv?: Record<string, string | undefined>): NotionConfig {
  return resolveConfig(runtimeEnv || {});
}

/**
 * Helper: try Notion first, fallback to local collection.
 */
async function fromNotionOrLocal<T>(
  runtimeEnv: Record<string, string | undefined> | undefined,
  cacheKey: string,
  fetchFn: (config: NotionConfig) => Promise<T | null>,
  localFn: () => T,
  fallbackLocal: boolean
): Promise<T> {
  const config = getConfig(runtimeEnv);

  if (isNotionAvailable(config)) {
    try {
      const data = await withCache(cacheKey, () => fetchFn(config));
      if (data) return data;
    } catch (e) {
      console.warn(`[Content] Notion fetch failed for ${cacheKey}:`, (e as Error).message);
    }
    if (fallbackLocal) return localFn();
    return localFn(); // Still use local as final fallback
  }

  return localFn();
}

// ===== Projects =====

function getLocalProjects(): Project[] {
  return getCollection('projects')
    .map((e) => ({ ...e.data, slug: e.id, content: e.body || '' }))
    .map((p) => ProjectSchema.parse(p))
    .sort((a, b) => a.order - b.order);
}

export async function getAllProjects(
  runtimeEnv?: Record<string, string | undefined>
): Promise<Project[]> {
  return fromNotionOrLocal(
    runtimeEnv,
    'projects',
    (config) => fetchProjects(config).then((data) => data?.map((p) => ProjectSchema.parse(p)) ?? null),
    getLocalProjects,
    getConfig(runtimeEnv).fallbackLocal
  );
}

export async function getFeaturedProjects(
  runtimeEnv?: Record<string, string | undefined>
): Promise<Project[]> {
  return getAllProjects(runtimeEnv).then((p) => p.filter((x) => x.featured));
}

export async function getProjectBySlug(
  slug: string,
  runtimeEnv?: Record<string, string | undefined>
): Promise<Project | undefined> {
  return getAllProjects(runtimeEnv).then((p) => p.find((x) => x.slug === slug));
}

export async function getProjectContent(
  pageId: string,
  localContent: string = '',
  runtimeEnv?: Record<string, string | undefined>
): Promise<string> {
  const config = getConfig(runtimeEnv);
  if (isNotionAvailable(config)) {
    return fetchPageBlocks(config, pageId);
  }
  return localContent;
}

// ===== Blog =====

function getLocalPosts(): Blog[] {
  return getCollection('blog')
    .map((e) => ({ ...e.data, slug: e.id, content: e.body || '' }))
    .map((b) => BlogSchema.parse(b))
    .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
}

export async function getAllPosts(
  runtimeEnv?: Record<string, string | undefined>
): Promise<Blog[]> {
  return fromNotionOrLocal(
    runtimeEnv,
    'blog',
    async (config) => {
      const notionData = await fetchBlog(config);
      if (!notionData) return null;
      // Fetch content blocks for each blog post
      return Promise.all(
        notionData.map(async (b) => {
          let content = '';
          try {
            content = await fetchPageBlocks(config, b.id);
          } catch {
            const mdx = getCollection('blog').find((e) => e.id === b.slug);
            if (mdx) content = mdx.body || '';
          }
          return BlogSchema.parse({ ...b, content });
        })
      );
    },
    getLocalPosts,
    getConfig(runtimeEnv).fallbackLocal
  );
}

export async function getRecentPosts(
  limit = DEFAULT_RECENT_LIMIT,
  runtimeEnv?: Record<string, string | undefined>
): Promise<Blog[]> {
  return getAllPosts(runtimeEnv).then((p) => p.slice(0, limit));
}

export async function getPostBySlug(
  slug: string,
  runtimeEnv?: Record<string, string | undefined>
): Promise<Blog | undefined> {
  return getAllPosts(runtimeEnv).then((p) => p.find((x) => x.slug === slug));
}

// ===== Profile =====

function getLocalProfile(): Profile {
  return ProfileSchema.parse(localData.profile || {});
}

function generateTickerItems(profile: Profile): string[] {
  const items: string[] = [];
  if (profile.location) items.push(profile.location);
  if (profile.available) items.push('Open to opportunities');
  if (profile.roleTitle) items.push(profile.roleTitle);
  return items.filter(Boolean);
}

function generateFacts(projectCount: number, skillCount: number, experienceMonths: number) {
  return [
    { value: projectCount, label: 'Projects Completed' },
    { value: skillCount, label: 'Technologies' },
    { value: experienceMonths, label: 'Months Experience' },
  ].filter((f) => f.value > 0);
}

export async function getProfile(
  runtimeEnv?: Record<string, string | undefined>
): Promise<Profile> {
  const profile = await fromNotionOrLocal(
    runtimeEnv,
    'profile',
    fetchProfile,
    getLocalProfile,
    getConfig(runtimeEnv).fallbackLocal
  );

  const projects = await getAllProjects(runtimeEnv);
  const skills = await getSkillsByCategory(runtimeEnv);
  const experience = await getExperience(runtimeEnv);

  const skillCount = Object.values(skills).flat().length;
  const experienceMonths = experience.reduce((sum, e) => {
    if (e.period) {
      const match = e.period.match(/(\d+)\s*month/i);
      if (match) return sum + Number(match[1]);
    }
    return sum;
  }, 0);

  return ProfileSchema.parse({
    ...profile,
    tickerItems: generateTickerItems(profile),
    facts: generateFacts(projects.length, skillCount, experienceMonths),
  });
}

// ===== Skills =====

function getLocalSkills(): SkillsByCategory {
  return SkillsByCategorySchema.parse(localData.skills || DEFAULT_SKILLS);
}

export async function getSkillsByCategory(
  runtimeEnv?: Record<string, string | undefined>
): Promise<SkillsByCategory> {
  return fromNotionOrLocal(
    runtimeEnv,
    'skills',
    fetchSkills,
    getLocalSkills,
    getConfig(runtimeEnv).fallbackLocal
  );
}

// ===== Experience =====

function getLocalExperience(): Experience[] {
  return getCollection('experience')
    .map((e) => ({ ...e.data, id: e.id }))
    .map((e) => ExperienceSchema.parse(e))
    .sort((a, b) => a.order - b.order);
}

export async function getExperience(
  runtimeEnv?: Record<string, string | undefined>
): Promise<Experience[]> {
  return fromNotionOrLocal(
    runtimeEnv,
    'experience',
    async (cfg) => {
      const data = await fetchExperience(cfg);
      return data ?? null;
    },
    getLocalExperience,
    getConfig(runtimeEnv).fallbackLocal
  );
}

// ===== Ticker =====

function getLocalTicker(): TickerItem[] {
  return (localData.tickerItems || []).map((text: string, i: number) =>
    TickerItemSchema.parse({ icon: '', text, order: i })
  );
}

export async function getTicker(
  runtimeEnv?: Record<string, string | undefined>
): Promise<TickerItem[]> {
  return fromNotionOrLocal(
    runtimeEnv,
    'ticker',
    fetchTicker,
    getLocalTicker,
    getConfig(runtimeEnv).fallbackLocal
  );
}
