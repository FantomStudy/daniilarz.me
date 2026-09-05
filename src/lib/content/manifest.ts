import type { RouteComponent } from "@tanstack/react-router";
import { lazyRouteComponent } from "@tanstack/react-router";
import { fileToPagePath, isContentFile } from "./path";

const CONTENT_DIR_PREFIX = "/src/content/";

const modGlob = import.meta.glob<{ default: React.ComponentType }>("/src/content/**/*.{md,mdx}");

export interface Page {
  path: string;
  Component: RouteComponent;
}

const pages = new Map<string, Page>();

for (const [key, importMod] of Object.entries(modGlob)) {
  if (!isContentFile(key)) continue;

  const path = fileToPagePath(key.slice(CONTENT_DIR_PREFIX.length));
  pages.set(path, { path, Component: lazyRouteComponent(importMod) });
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
