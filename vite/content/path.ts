const EXTENSIONS = [".md", ".mdx"];

export function isContentFile(file: string) {
  const isHidden = file.split("/").some((segment) => segment.startsWith("_"));
  return EXTENSIONS.some((ext) => file.endsWith(ext)) && !isHidden;
}

// "bar.mdx" -> "/bar", "blog/index.mdx" -> "/blog", "index.md" -> "/"
export function fileToPagePath(file: string) {
  const segments = file.slice(0, file.lastIndexOf(".")).split("/");
  if (segments.at(-1) === "index") segments.pop();
  return "/" + segments.join("/");
}
