import { getCollection } from 'astro:content';
import { ProjectSchema, type Project } from '../schemas';
import { fetchProjects, fetchPageBlocks } from '../notion';
import { fromNotionOrLocal, getConfig } from './helpers';
import { isNotionAvailable } from '../config';

async function getLocalProjects(): Promise<Project[]> {
  const entries = await getCollection('projects');
  return entries
    .map((e) => ({ ...e.data, slug: e.id, content: e.body || '' }))
    .map((p) => {
      const result = ProjectSchema.safeParse(p);
      if (!result.success) {
        console.error('[Projects] Schema validation failed for:', p.title || p.slug || '(unknown)');
        for (const issue of result.error.issues) {
          console.error(`  ${issue.path.join('.')}: ${issue.message} (got: ${JSON.stringify((p as any)[String(issue.path[0])])})`);
        }
        // Return a minimal valid object so the page doesn't crash
        // Use type assertion since we know these values are valid
        return {
          title: p.title || 'Untitled',
          slug: p.slug || 'untitled',
          category: p.category || 'Other',
          year: typeof p.year === 'number' ? p.year : new Date().getFullYear(),
          description: p.description || 'No description available',
          stack: p.stack || '',
          order: typeof p.order === 'number' ? p.order : 0,
          has_ui: typeof p.has_ui === 'boolean' ? p.has_ui : true,
          featured: typeof p.featured === 'boolean' ? p.featured : false,
          github_url: p.github_url || null,
          live_url: p.live_url || null,
          image_url: p.image_url || null,
        } as Project;
      }
      return result.data;
    })
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
