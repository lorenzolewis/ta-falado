import { defineConfig } from 'astro/config';

// `format: 'file'` writes grammar/01.html, so Workers static assets serve /grammar/01 directly
// instead of redirecting to /grammar/01/.
export default defineConfig({
  trailingSlash: 'never',
  build: { format: 'file' },
});
