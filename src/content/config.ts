import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    category: z.string(),
    year: z.number(),
    has_ui: z.boolean().default(true),
    description: z.string(),
    role: z.string().optional(),
    stack: z.string(),
    github_url: z.string().nullable().optional(),
    live_url: z.string().nullable().optional(),
    featured: z.boolean().default(false),
    card_color: z.string().default('green'),
    image_url: z.string().nullable().optional(),
    images: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    excerpt: z.string(),
    published_date: z.string().or(z.date()).transform(v => String(v)),
    read_time: z.number().default(5),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

export const collections = { projects, blog };
