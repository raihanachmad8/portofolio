import { getCollection } from 'astro:content';
import { BlogSchema, type Blog } from '../schemas';
import { fetchBlog, fetchPageBlocks } from '../notion';
import { fromNotionOrLocal } from './helpers';

const DEFAULT_RECENT_LIMIT = 3;

async function getLocalPosts(): Promise<Blog[]> {
  const entries = await getCollection('blog');
  return entries
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
      return Promise.all(
        notionData.map(async (b) => {
          let content = '';
          try {
            content = await fetchPageBlocks(config, b.id);
          } catch (e) {
            console.warn('[Content] Failed to fetch blog blocks:', (e as Error).message);
            const posts = await getCollection('blog');
            const mdx = posts.find((e) => e.id === b.slug);
            if (mdx) content = mdx.body || '';
          }
          return BlogSchema.parse({ ...b, content });
        })
      );
    },
    getLocalPosts,
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
