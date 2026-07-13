import type { Frontmatter } from "@/types";
import { notFound, lazyRouteComponent } from "@tanstack/react-router";

const meta = import.meta.glob<Frontmatter | undefined>("/content/**/*.mdx", {
  import: "frontmatter",
});
const components = import.meta.glob<{ default: React.ComponentType }>("/content/**/*.mdx");

const lazyComponents = new Map(
  Object.entries(components).map(([path, imp]) => [
    path,
    lazyRouteComponent(imp) as React.ComponentType,
  ]),
);

function normalize(slug: string) {
  const clean = slug.replace(/\/+$/, "") || "index";
  return `/content/${clean}.mdx`;
}

export async function getMeta(slug: string) {
  const path = normalize(slug);
  const load = meta[path];
  if (!load) throw notFound();
  return { frontmatter: await load() };
}

export function getContent(slug: string) {
  const Component = lazyComponents.get(normalize(slug));
  if (!Component) throw new Error(`No component for slug: ${slug}`);
  return Component;
}
