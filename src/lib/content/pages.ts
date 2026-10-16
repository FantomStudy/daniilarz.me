import type { RouteComponent } from "@tanstack/react-router";
import type { PageEntry } from "./types";
import { lazyRouteComponent, notFound } from "@tanstack/react-router";
import { PAGES } from "./content.gen";
import { fileToPagePath, isContentFile, splatToPagePath } from "./path";

const CONTENT_DIR_PREFIX = "/src/content/";

const modGlob = import.meta.glob<{ default: React.ComponentType }>("/src/content/**/*.{md,mdx}");

const components = new Map<string, RouteComponent>();

for (const [key, importMod] of Object.entries(modGlob)) {
  if (!isContentFile(key)) continue;
  components.set(
    fileToPagePath(key.slice(CONTENT_DIR_PREFIX.length)),
    lazyRouteComponent(importMod),
  );
}

const entries = new Map<string, PageEntry>();

for (const entry of PAGES) {
  if (!components.has(entry.path)) throw new Error(`Content page "${entry.path}" has no component`);
  entries.set(entry.path, entry);
}

export function getPageComponent(path: string): RouteComponent {
  const Component = components.get(path);
  if (!Component) throw notFound();
  return Component;
}

export async function loadPage(splat: string): Promise<PageEntry> {
  const entry = entries.get(splatToPagePath(splat));
  if (!entry) throw notFound();

  await getPageComponent(entry.path).preload?.();
  return entry;
}
