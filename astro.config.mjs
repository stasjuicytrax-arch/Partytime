// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// GitHub Pages: https://stasjuicytrax-arch.github.io/Partytime/
export default defineConfig({
  site: "https://stasjuicytrax-arch.github.io",
  base: "/Partytime",
  trailingSlash: "ignore",
  integrations: [sitemap()],
  // весь CSS — прямо в HTML: без блокирующих запросов стилей (быстрее первый экран на телефоне)
  build: { inlineStylesheets: "always" },
});
