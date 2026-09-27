export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_ORIGIN = "https://daniilarz.me";

export function ogImagePath(pagePath: string) {
  return `/og${pagePath === "/" ? "/index" : pagePath}.png`;
}

export function ogMeta(pagePath: string, title: string, description?: string) {
  return [
    { property: "og:title", content: title },
    ...(description ? [{ property: "og:description", content: description }] : []),
    { property: "og:url", content: new URL(pagePath, OG_ORIGIN).href },
    { property: "og:image", content: new URL(ogImagePath(pagePath), OG_ORIGIN).href },
    { property: "og:image:width", content: String(OG_WIDTH) },
    { property: "og:image:height", content: String(OG_HEIGHT) },
    { property: "og:image:alt", content: title },
  ];
}
