import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import { imagetools } from "vite-imagetools";
import { SITE_ORIGIN } from "./src/lib/meta.ts";
import { collectPages } from "./vite/content/collect.ts";
import { content } from "./vite/content/index.ts";
import { og } from "./vite/og/index.tsx";

const pages = collectPages();

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkFrontmatter, remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "prepend",
              properties: {
                className: ["header-anchor"],
                ariaHidden: "true",
                tabIndex: -1,
              },
              content: { type: "text", value: "#" },
            },
          ],
          [
            rehypeShiki,
            {
              themes: {
                light: "light-plus",
                dark: "github-dark-high-contrast",
              },
            },
          ],
        ],
      }),
    },
    content(),
    og(pages),
    tanstackStart({
      pages: pages.map(({ path, date }) => ({ path, sitemap: { lastmod: date } })),
      sitemap: {
        enabled: true,
        host: SITE_ORIGIN,
      },
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
      },
    }),
    nitro(),
    react({ include: /\.(mdx|md|tsx|ts)$/ }),
    icons({
      compiler: "jsx",
      jsx: "react",
      defaultClass: "icon",
    }),
    imagetools(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
