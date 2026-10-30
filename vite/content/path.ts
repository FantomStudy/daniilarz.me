const EXTENSIONS = [".md", ".mdx"];

// kebab-case: роутер не прочитает такое имя как свой синтаксис, так что экранировать нечего
const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

export function isContentFile(file: string) {
  const isHidden = file.split("/").some((segment) => segment.startsWith("_"));
  return EXTENSIONS.some((ext) => file.endsWith(ext)) && !isHidden;
}

function segments(file: string) {
  const parts = file.slice(0, file.lastIndexOf(".")).split("/");
  if (parts.some((part) => !SEGMENT.test(part) || part === "route"))
    throw new Error(`Content page "${file}" must be named in kebab-case and not "route"`);
  return parts;
}

// "bar.mdx" -> "/bar", "blog/index.mdx" -> "/blog", "index.md" -> "/"
export function fileToPagePath(file: string) {
  const parts = segments(file);
  if (parts.at(-1) === "index") parts.pop();
  return "/" + parts.join("/");
}

// "bar.mdx" -> "/(content)/bar", "blog/index.mdx" -> "/(content)/blog/", "index.md" -> "/(content)/"
export function fileToRouteId(file: string) {
  const parts = segments(file);
  if (parts.at(-1) === "index") parts[parts.length - 1] = "";
  return "/(content)/" + parts.join("/");
}

// "bar.mdx" -> "bar.tsx", "blog/index.mdx" -> "blog/index.tsx"
export function fileToRouteFile(file: string) {
  return segments(file).join("/") + ".tsx";
}
