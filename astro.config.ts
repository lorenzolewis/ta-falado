import { defineConfig } from 'astro/config';

// `format: 'file'` writes grammar/01.html, so Workers static assets serve /grammar/01 directly
// instead of redirecting to /grammar/01/.
export default defineConfig({
  // The permanent address (lorenzolewis/ta-falado#5). The feed and canonical URLs are built
  // from it, and the feed URL can't change once it's submitted to podcast apps (ADR 0003).
  site: 'https://ta-falado.lorenzo-lewis.workers.dev',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Reuses unchanged routes that set a `cacheKey` from the previous build's cache in
  // node_modules/.astro. Only the generated artwork uses it (src/lib/artwork-render.ts); the
  // images are most of the build time. Workers Builds keeps that folder between builds, since the
  // project's build cache is on (see README). `astro build --force` redraws everything.
  experimental: { incrementalBuild: true },
});
