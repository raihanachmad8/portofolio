import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { ProjectSchema, BlogSchema, ExperienceSchema } from '../lib/schemas';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: ProjectSchema.pick({
    title: true,
    slug: true,
    category: true,
    year: true,
    has_ui: true,
    description: true,
    stack: true,
    github_url: true,
    live_url: true,
    featured: true,
    image_url: true,
    images: true,
    order: true,
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: BlogSchema.pick({
    title: true,
    category: true,
    excerpt: true,
    published_date: true,
    read_time: true,
    featured: true,
    tags: true,
    order: true,
  }),
});

const experience = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/experience' }),
  schema: ExperienceSchema.pick({
    title: true,
    company: true,
    period: true,
    location: true,
    detail: true,
    now: true,
    order: true,
  }),
});

export const collections = { projects, blog, experience };
