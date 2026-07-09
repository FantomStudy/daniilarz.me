import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
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
                light: "github-light-high-contrast",
                dark: "github-dark-high-contrast",
              },
            },
          ],
        ],
      }),
    },
    tanstackStart({
      prerender: {
        enabled: true,
        failOnError: false,
      },
    }),
    nitro(),
    react({ include: /\.(mdx|md|tsx|ts)$/ }),
    icons({ compiler: "jsx", jsx: "react", defaultClass: "icon" }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
