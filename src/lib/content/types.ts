export interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  duration?: string;
  wrapperClass?: string;
  layout?: PageLayout;
}

export type PageLayout = "prose" | "wide";

export interface PageEntry extends Frontmatter {
  path: string;
}
