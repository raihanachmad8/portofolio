/**
 * Zod schemas for data validation.
 * Defines the shape of all data models used in the application.
 * @module schemas
 */

import { z } from 'zod';
import { DEFAULT_THEME } from './utils';
import { LANGUAGES, THEMES } from './constants';

const MIN_PROJECT_YEAR = 2020;
const FUTURE_YEAR_BUFFER = 5;
const MAX_READ_TIME_MINS = 120;
const MAX_TITLE_LENGTH = 100;
const MAX_BLOG_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_EXCERPT_LENGTH = 300;
const DEFAULT_SITE_TITLE = 'Portfolio';
const DEFAULT_SITE_DESCRIPTION = 'Personal portfolio';

/** Project data schema */
export const ProjectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required').max(MAX_TITLE_LENGTH, 'Title too long'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  category: z.string().min(1, 'Category required'),
  year: z.number().int().min(MIN_PROJECT_YEAR, 'Too old').max(new Date().getFullYear() + FUTURE_YEAR_BUFFER, 'Too far future'),
  description: z.string().min(10, 'Description too short').max(MAX_DESCRIPTION_LENGTH, 'Description too long'),
  content: z.string().optional(),
  has_ui: z.boolean().default(true),
  stack: z.string().min(1, 'Stack required'),
  github_url: z.string().optional().nullable(),
  live_url: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  image_url: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  order: z.number().int().min(0).default(0),
});

/** Skill data schema */
export const SkillSchema = z.object({
  name: z.string().min(1, 'Name required').max(50, 'Name too long'),
  level: z.number().int().min(0, 'Min level 0').max(100, 'Max level 100'),
});

/** Skills grouped by category schema */
export const SkillsByCategorySchema = z.object({
  backend: z.array(SkillSchema).default([]),
  frontend: z.array(SkillSchema).default([]),
  database: z.array(SkillSchema).default([]),
  devops: z.array(SkillSchema).default([]),
  tools: z.object({
    backend: z.array(z.string()).default([]),
    frontend: z.array(z.string()).default([]),
    devops: z.array(z.string()).default([]),
  }).default({ backend: [], frontend: [], devops: [] }),
});

/** Experience entry schema */
export const ExperienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required').max(MAX_TITLE_LENGTH, 'Title too long'),
  company: z.string().min(1, 'Company required').max(MAX_TITLE_LENGTH, 'Company too long'),
  period: z.string().optional(),
  location: z.string().optional(),
  detail: z.string().max(MAX_DESCRIPTION_LENGTH, 'Detail too long').optional(),
  now: z.boolean().optional(),
  order: z.number().int().min(0).default(0),
});

/** Blog post schema */
export const BlogSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required').max(MAX_BLOG_TITLE_LENGTH, 'Title too long'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  excerpt: z.string().min(10, 'Excerpt too short').max(MAX_EXCERPT_LENGTH, 'Excerpt too long'),
  category: z.string().min(1, 'Category required'),
  published_date: z.string().or(z.date()).transform(v => String(v)),
  read_time: z.number().int().min(1, 'Min 1 min').max(MAX_READ_TIME_MINS, 'Max 120 mins').optional(),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

/** Profile data schema */
export const ProfileSchema = z.object({
  name: z.string().min(1, 'Name required'),
  shortName: z.string().default(''),
  roleTitle: z.string().default(''),
  heroSub: z.string().default(''),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  github: z.string().optional().or(z.literal('')),
  linkedin: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  cv_url: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  marquee: z.array(z.string()).default([]),
  aboutLead: z.string().default(''),
  aboutParas: z.array(z.string()).default([]),
  facts: z.array(z.object({ value: z.number(), label: z.string() })).default([]),
  principles: z.array(z.object({ no: z.string(), title: z.string(), description: z.string() })).default([]),
  available: z.boolean().default(true),
  tickerItems: z.array(z.string()).default([]),
  language: z.enum(LANGUAGES).default('en'),
  theme: z.enum(THEMES).default(DEFAULT_THEME),
  site_title: z.string().optional().or(z.literal('')),
  site_description: z.string().optional().or(z.literal('')),
});

/** Ticker item schema */
export const TickerItemSchema = z.object({
  icon: z.string().default(''),
  text: z.string().min(1, 'Text required'),
  order: z.number().int().min(0).default(0),
});

/** Inferred TypeScript types */
export type Project = z.infer<typeof ProjectSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type SkillsByCategory = z.infer<typeof SkillsByCategorySchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Blog = z.infer<typeof BlogSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type TickerItem = z.infer<typeof TickerItemSchema>;
