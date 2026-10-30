const EXTENSIONS = [".md", ".mdx"];

const UNESCAPABLE = /[$%!#?:*<>|()[\]{}]/;

export function isContentFile(file: string) {
  const isHidden = file.split("/").some((segment) => segment.startsWith("_"));
  return EXTENSIONS.some((ext) => file.endsWith(ext)) && !isHidden;
}

function segments(file: string) {
  return file.slice(0, file.lastIndexOf(".")).split("/");
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

// Экранируем то, что роутер прочитает как свой синтаксис: точки, route.tsx, префикс "-" и суффикс "_"
// "v1.2.md" -> "v1[.]2.tsx", "blog/route.md" -> "blog/[route].tsx"
export function fileToRouteFile(file: string) {
  const parts = segments(file).map((segment) => {
    if (UNESCAPABLE.test(segment))
      throw new Error(`Content page "${file}" has characters the router can't use in a path`);
    if (segment === "route") return "[route]";
    return segment.replaceAll(".", "[.]").replace(/^-/, "[-]").replace(/_$/, "[_]");
  });
  return parts.join("/") + ".tsx";
}
