export interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  duration?: string;
  wrapperClass?: string;
}

export interface PageEntry extends Frontmatter {
  path: string;
}
