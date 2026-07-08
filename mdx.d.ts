declare module "*.mdx" {
  import type { Frontmatter } from "@/types";

  export const frontmatter: Frontmatter;
}
