import type { Frontmatter, PageMeta } from "../../src/lib/meta.ts";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { fileToPagePath, isContentFile } from "./path.ts";

export const CONTENT_DIR = "src/content";

const BOM = /^﻿/;

function readFrontmatter(file: string): Frontmatter {
  const lines = readFileSync(join(CONTENT_DIR, file), "utf8").replace(BOM, "").split(/\r?\n/);
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end === -1)
    throw new Error(`Content page "${file}" has no frontmatter`);

  const frontmatter: Frontmatter = parse(lines.slice(1, end).join("\n"));
  if (!frontmatter.title) throw new Error(`Content page "${file}" has no title`);

  return frontmatter;
}

export interface ContentFile {
  file: string;
  page: PageMeta;
}

export function collectContent(): ContentFile[] {
  const files = readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" })
    .map((entry) => entry.replaceAll("\\", "/"))
    .filter(isContentFile);

  const fileByPath = new Map<string, string>();

  return files.map((file) => {
    const path = fileToPagePath(file);
    const taken = fileByPath.get(path);
    if (taken) throw new Error(`Content collision: "${taken}" and "${file}" both map to "${path}"`);
    fileByPath.set(path, file);

    return { file, page: { path, ...readFrontmatter(file) } };
  });
}

export function collectPages(): PageMeta[] {
  return collectContent().map(({ page }) => page);
}
