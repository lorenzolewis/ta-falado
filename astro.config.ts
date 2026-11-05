import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://tafalado.lorenzo.soy",
	trailingSlash: "never",
	build: { format: "file" },
	experimental: { incrementalBuild: true },
});
