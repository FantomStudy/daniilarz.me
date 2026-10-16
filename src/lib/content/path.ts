const EXTENSIONS = [".md", ".mdx"];

export function isContentFile(file: string) {
  const isHidden = file.split("/").some((segment) => segment.startsWith("_"));
  return EXTENSIONS.some((ext) => file.endsWith(ext)) && !isHidden;
}

function toPagePath(segments: string[]) {
  return "/" + segments.filter(Boolean).join("/");
}

// "bar.mdx" -> "/bar", "blog/index.mdx" -> "/blog", "index.md" -> "/"
export function fileToPagePath(file: string) {
  const segments = file.slice(0, file.lastIndexOf(".")).split("/");
  if (segments.at(-1) === "index") segments.pop();
  return toPagePath(segments);
}

// "blog/post/" -> "/blog/post", "" -> "/"
export function splatToPagePath(splat: string) {
  return toPagePath(splat.split("/"));
}
