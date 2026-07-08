import mdx from "@mdx-js/rollup";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
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
