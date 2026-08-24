declare module "*.mdx" {
  import type { Frontmatter } from "@/types";

  export const frontmatter: Frontmatter;
}

declare module "*.md" {
  import type { Frontmatter } from "@/types";

  export const frontmatter: Frontmatter;
}
