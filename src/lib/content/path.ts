function isHidden(file: string) {
  return file.split("/").some((segment) => segment.startsWith("_"));
}

export function isContentFile(file: string) {
  return /\.mdx?$/.test(file) && !isHidden(file);
}

export function fileToPagePath(file: string) {
  const slug = file.replace(/\.mdx?$/, "").replace(/(^|\/)index$/, "");
  return `/${slug}`.replace(/\/$/, "") || "/";
}

export function splatToPagePath(splat: string) {
  const clean = splat.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}` : "/";
}
