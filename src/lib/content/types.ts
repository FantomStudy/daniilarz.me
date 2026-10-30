export interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  duration?: string;
  wrapperClass?: string;
  layout?: "prose" | "wide";
}

export interface PageEntry extends Frontmatter {
  path: string;
}
