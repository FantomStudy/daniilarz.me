import { notFound } from "@tanstack/react-router";
import { getPage } from "./manifest";
import { splatToPagePath } from "./path";

export async function loadPage(splat: string) {
  const page = getPage(splatToPagePath(splat));
  if (!page) throw notFound();
  const [frontmatter] = await Promise.all([page.loadMetadata(), page.Component.preload?.()]);
  return { frontmatter };
}

export function getPageComponent(splat: string) {
  const page = getPage(splatToPagePath(splat));
  if (!page) throw notFound();
  return page.Component;
}
