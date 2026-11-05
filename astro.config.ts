import { defineConfig } from 'astro/config';

// `format: 'file'` writes grammar/01.html, so Workers static assets serve /grammar/01 directly
// instead of redirecting to /grammar/01/.
export default defineConfig({
  // The permanent address (lorenzolewis/ta-falado#5). The feed and canonical URLs are built
  // from it, and the feed URL can't change once it's submitted to podcast apps (ADR 0003).
  site: 'https://tafalado.lorenzo-lewis.workers.dev',
  trailingSlash: 'never',
  build: { format: 'file' },
});
