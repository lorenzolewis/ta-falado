import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://tafalado.lorenzo.soy",
	trailingSlash: "never",
	build: { format: "file" },
	// Lists every page (not the 404) at /sitemap-index.xml, with URLs from `site`.
	integrations: [sitemap()],
	experimental: { incrementalBuild: true },
});
