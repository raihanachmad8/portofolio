// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ mode: 'pages' }),
  integrations: [tailwind(), mdx()],
  vite: {
    ssr: {
      external: ['node:*'],
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'id'],
    routing: {
      prefixDefaultLocale: false,
    },
    fallback: {
      id: 'en',
    },
  },
});
