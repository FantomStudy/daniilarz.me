import type { RouteComponent } from "@tanstack/react-router";
import type { Frontmatter } from "@/types";
import { lazyRouteComponent } from "@tanstack/react-router";
import { fileToPagePath, isContentFile } from "./path";

const CONTENT_DIR_PREFIX = "/src/content/";

const metaGlob = import.meta.glob<Frontmatter>("/src/content/**/*.{md,mdx}", {
  import: "frontmatter",
});
const modGlob = import.meta.glob<{ default: React.ComponentType }>("/src/content/**/*.{md,mdx}");

export interface Page {
  path: string;
  loadMetadata: () => Promise<Frontmatter>;
  Component: RouteComponent;
}

const pages = new Map<string, Page>();

for (const [key, loadMetadata] of Object.entries(metaGlob)) {
  if (!isContentFile(key)) continue;

  const importMod = modGlob[key];
  if (!importMod) continue;

  const path = fileToPagePath(key.slice(CONTENT_DIR_PREFIX.length));
  pages.set(path, { path, loadMetadata, Component: lazyRouteComponent(importMod) });
}

export function getPage(path: string): Page | undefined {
  return pages.get(path);
}

export function getPages(): Page[] {
  return [...pages.values()];
}

export function hasPage(path: string): boolean {
  return pages.has(path);
}
