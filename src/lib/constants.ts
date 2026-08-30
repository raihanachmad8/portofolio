/**
 * Centralized configuration for the entire application.
 * Single source of truth for site metadata, themes, URLs, and build settings.
 */

export const SITE_CONFIG = {
  name: 'Achmad Raihan Fahrezi Effendy',
  title: 'Full-Stack Developer',
  description: 'Backend & Full-Stack Developer • TypeScript • Node.js • Astro',
  url: 'https://raihanachmad.web.id',
  images: {
    og: '/images/og-default.jpg',
    profile: '/images/profile.jpg',
    profileFormal: '/images/profile-formal.jpg',
    placeholder: '/images/placeholder.svg',
  },
  theme: {
    default: 'gallery' as const,
    options: ['terminal', 'editorial', 'gallery', 'swiss'] as const,
  },
  content: {
    featuredPostsLimit: 4,
  },
} as const;

export const LANGUAGES = ['id', 'en'] as const;
export const THEMES = ['terminal', 'editorial', 'gallery', 'swiss'] as const;
