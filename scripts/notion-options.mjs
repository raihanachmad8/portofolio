/**
 * Notion database option constants.
 * Single source of truth for select/multi_select options.
 * These are seed defaults — users can add more options in Notion UI.
 *
 * @module notion-options
 */

/** Project stack/tech options */
export const PROJECT_STACK_OPTIONS = [
  'PHP', 'JavaScript', 'TypeScript', 'Python',
  'Laravel', 'NestJS', 'Express.js', 'FastAPI', 'React', 'Next.js', 'Astro',
  'Alpine.js', 'Tailwind CSS', 'Ant Design', 'CSS',
  'MySQL', 'PostgreSQL', 'MSSQL', 'Prisma', 'Drizzle ORM', 'Knex', 'Eloquent ORM',
  'Redis', 'Docker', 'Kubernetes', 'Nginx', 'Git', 'Linux/VPS',
  '.NET', 'Entity Framework Core', 'C#',
];

/** Project category options */
export const PROJECT_CATEGORY_OPTIONS = [
  'Backend API',
  'Backend Platform',
  'Microservices Backend',
  'Full-Stack System',
  'Full-Stack Web System',
  'Web System',
  'Frontend System',
  'Internal Tool',
  'Community Platform',
  'Portfolio Website',
  'Data Management',
];

/** Blog tag options */
export const BLOG_TAG_OPTIONS = [
  'backend', 'frontend', 'fullstack', 'api',
  'typescript', 'javascript', 'php', '.net', 'python',
  'database', 'devops', 'architecture', 'testing',
  'career', 'engineering', 'documentation',
];

/** Skill category options */
export const SKILL_CATEGORY_OPTIONS = ['Backend', 'Frontend', 'Database', 'DevOps', 'Tools'];

/** Blog category options */
export const BLOG_CATEGORY_OPTIONS = ['Backend', 'DevOps', 'Career', 'Frontend', 'Architecture'];

/** Experience type options */
export const EXPERIENCE_TYPE_OPTIONS = ['Work', 'Internship', 'Freelance', 'Campus', 'Milestone'];

/** Language options */
export const LANGUAGE_OPTIONS = ['id', 'en'];

/** Theme options */
export const THEME_OPTIONS = ['terminal', 'editorial', 'gallery', 'swiss'];
