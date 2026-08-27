/**
 * Notion database option constants.
 * Keep in sync with scripts/notion-options.mjs
 *
 * @module notion-options
 */

/** Project category options */
export const PROJECT_CATEGORIES = [
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
] as const;

/** Language options */
export const LANGUAGES = ['id', 'en'] as const;

/** Theme options */
export const THEMES = ['terminal', 'editorial', 'gallery', 'swiss'] as const;
