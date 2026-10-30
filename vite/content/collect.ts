import type { Frontmatter, PageEntry } from "../../src/lib/content/types.ts";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { fileToPagePath, isContentFile } from "./path.ts";

export const CONTENT_DIR = "src/content";

const BOM = /^﻿/;

export interface ContentFile {
  file: string;
  page: PageEntry;
}

function readFrontmatter(file: string): Frontmatter {
  const lines = readFileSync(file, "utf8").replace(BOM, "").split(/\r?\n/);
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end === -1)
    throw new Error(`Content page "${file}" has no frontmatter`);

  const frontmatter: Frontmatter = parse(lines.slice(1, end).join("\n"));
  if (!frontmatter.title) throw new Error(`Content page "${file}" has no title`);

  return frontmatter;
}

export function readContentFile(file: string, root: string = CONTENT_DIR): ContentFile {
  return { file, page: { path: fileToPagePath(file), ...readFrontmatter(join(root, file)) } };
}

export function collectContentFiles(root: string = CONTENT_DIR): ContentFile[] {
  const files = readdirSync(root, { recursive: true, encoding: "utf8" })
    .map((entry) => entry.replaceAll("\\", "/"))
    .filter(isContentFile);

  const takenBy = new Map<string, string>();

  const contentFiles = files.map((file) => {
    const path = fileToPagePath(file);
    const taken = takenBy.get(path);
    if (taken) throw new Error(`Content collision: "${taken}" and "${file}" both map to "${path}"`);

    takenBy.set(path, file);
    return readContentFile(file, root);
  });

  return contentFiles.sort((a, b) => a.page.path.localeCompare(b.page.path));
}

export function collectPages(root: string = CONTENT_DIR): PageEntry[] {
  return collectContentFiles(root).map(({ page }) => page);
}
