import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required').max(100, 'Title too long'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  category: z.enum(['web-app', 'saas', 'backend', 'mobile', 'devops', 'api', 'cli', 'library', 'other']),
  year: z.number().int().min(2020, 'Too old').max(2030, 'Too far future'),
  description: z.string().min(10, 'Description too short').max(300, 'Description too long'),
  stack: z.string().min(1, 'Stack required'),
  github_url: z.string().optional().nullable(),
  live_url: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  card_color: z.enum(['dark', 'green', 'amber', 'blue', 'purple', 'red']).default('dark'),
  image_url: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  created_at: z.string().datetime().optional(),
  last_edited_at: z.string().datetime().optional(),
});

export const SkillSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required').max(50, 'Title too long'),
  category: z.enum(['backend', 'frontend', 'database', 'devops', 'tools', 'mobile', 'other']),
  level: z.number().int().min(1, 'Min level 1').max(5, 'Max level 5'),
  highlight: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export const ExperienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required').max(100, 'Title too long'),
  company: z.string().min(1, 'Company required').max(100, 'Company too long'),
  period: z.string().optional(),
  location: z.string().optional(),
  detail: z.string().max(500, 'Detail too long').optional(),
  year: z.number().int().min(2015, 'Too old').max(2030, 'Too far future').optional(),
  year_end: z.number().int().min(2015).max(2030).optional().nullable(),
  type: z.enum(['work', 'internship', 'freelance', 'milestone', 'education', 'volunteer']).optional(),
  description: z.string().max(500, 'Description too long').optional(),
  now: z.boolean().optional(),
  order: z.number().int().min(0).default(0),
});

export const BlogSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required').max(200, 'Title too long'),
  excerpt: z.string().min(10, 'Excerpt too short').max(300, 'Excerpt too long'),
  category: z.enum(['tutorial', 'opinion', 'career', 'article', 'review', 'news']),
  published_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  read_time: z.number().int().min(1, 'Min 1 min').max(120, 'Max 120 mins').optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').min(1, 'Slug required'),
  featured: z.boolean().default(false),
  content: z.string().optional(),
  tags: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

export const SettingsMapSchema = z.object({
  site_title: z.string().default('Portfolio'),
  site_description: z.string().default('Personal portfolio'),
  site_url: z.string().url().optional(),
  theme: z.enum(['terminal', 'editorial', 'gallery', 'swiss']).default('terminal'),
  language: z.enum(['id', 'en']).default('id'),
  aruna_enabled: z.enum(['true', 'false']).default('true'),
  storage_provider: z.enum(['local', 's3', 'cloudinary']).default('local'),
  analytics_provider: z.enum(['none', 'plausible', 'umami', 'cloudflare']).default('none'),
  og_image: z.string().url().optional(),
  github_url: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const ThemeConfigSchema = z.object({
  theme: z.enum(['terminal', 'editorial', 'gallery', 'swiss']).default('terminal'),
  sections: z.record(z.string(), z.enum(['terminal', 'editorial', 'gallery', 'swiss'])).optional(),
  palette: z.record(z.string(), z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/))).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Blog = z.infer<typeof BlogSchema>;
export type SettingsMap = z.infer<typeof SettingsMapSchema>;
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;
