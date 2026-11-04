import { defineConfig } from 'astro/config';
import browserslist from 'browserslist';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { browserslistToTargets } from 'lightningcss';

// Read the `browserslist` field in package.json ("baseline newly available")
// so JS and CSS output target the same browsers.
const browsers = browserslist();

export default defineConfig({
  vite: {
    build: {
      target: browserslistToEsbuild(browsers),
      cssMinify: 'lightningcss',
    },
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        targets: browserslistToTargets(browsers),
      },
    },
  },
});
