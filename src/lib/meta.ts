export const SITE_ORIGIN = "https://daniilarz-me.vercel.app";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export function ogImagePath(pagePath: string) {
  return `/og${pagePath === "/" ? "/index" : pagePath}.png`;
}

export interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  duration?: string;
  wrapperClass?: string;
  layout?: "prose" | "wide";
}

export interface PageMeta extends Frontmatter {
  path: string;
}

export function pageHead({ path, title, description }: PageMeta) {
  return {
    meta: [
      { title: path === "/" ? title : `${title} - Daniil Arz` },
      ...(description ? [{ name: "description", content: description }] : []),
      { property: "og:title", content: title },
      ...(description ? [{ property: "og:description", content: description }] : []),
      { property: "og:url", content: new URL(path, SITE_ORIGIN).href },
      { property: "og:image", content: new URL(ogImagePath(path), SITE_ORIGIN).href },
      { property: "og:image:width", content: String(OG_WIDTH) },
      { property: "og:image:height", content: String(OG_HEIGHT) },
      { property: "og:image:alt", content: title },
    ],
  };
}
