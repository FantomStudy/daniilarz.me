import { notFound } from "@tanstack/react-router";
import { PAGES } from "./content.gen";
import { getPage } from "./manifest";
import { splatToPagePath } from "./path";

const frontmatterByPath = new Map(PAGES.map(({ path, ...frontmatter }) => [path, frontmatter]));

export async function loadPage(splat: string) {
  const path = splatToPagePath(splat);
  const page = getPage(path);
  const frontmatter = frontmatterByPath.get(path);
  if (!page || !frontmatter) throw notFound();

  await page.Component.preload?.();
  return { frontmatter };
}

export function getPageComponent(splat: string) {
  const page = getPage(splatToPagePath(splat));
  if (!page) throw notFound();
  return page.Component;
}
