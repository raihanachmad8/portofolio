import { getCollection } from 'astro:content';
import { ProjectSchema, type Project } from '../schemas';
import { fetchProjects, fetchPageBlocks } from '../notion';
import { fromNotionOrLocal, getConfig } from './helpers';
import { isNotionAvailable } from '../config';

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
