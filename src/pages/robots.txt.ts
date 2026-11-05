import type { APIRoute } from 'astro';

// Points crawlers at the sitemap that @astrojs/sitemap builds (astro.config.ts), using `site`.
export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('Set `site` in astro.config.ts: robots.txt needs the sitemap’s absolute URL.');
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
