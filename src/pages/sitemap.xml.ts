import { getAllProjects, getAllPosts } from '@lib/content';
import { getRuntimeEnv, SITE_URL } from '@lib/utils';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  try {
    const env = getRuntimeEnv(context);
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || SITE_URL;
    const projects = await getAllProjects(env);
    const posts = await getAllPosts(env);

    const urls = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/projects', changefreq: 'weekly', priority: '0.9' },
      { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
      ...projects.map((p) => ({
        loc: `/projects/${p.slug}`,
        changefreq: 'monthly' as const,
        priority: '0.7' as const,
      })),
      ...posts.map((p) => ({
        loc: `/blog/${p.slug}`,
        changefreq: 'monthly' as const,
        priority: '0.6' as const,
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => `  <url>
    <loc>${siteUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}${u.loc}" />
    <xhtml:link rel="alternate" hreflang="id" href="${siteUrl}/id${u.loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${u.loc}" />
  </url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (e) {
    console.error('[Sitemap] Failed to generate:', (e as Error).message);
    const empty = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    return new Response(empty, {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
};
