import type { Plugin } from "vite";
import { relative } from "node:path";
import { CONTENT_DIR, readContentFile } from "./collect.ts";
import { isContentFile } from "./path.ts";
import { syncRoutes, writeRoute } from "./routes.ts";

function toContentFile(path: string, root: string = CONTENT_DIR) {
  const file = relative(root, path).replaceAll("\\", "/");
  return file.startsWith("..") ? null : file;
}

export function content(): Plugin {
  return {
    name: "content",
    // Роуты должны появиться раньше, чем генератор TanStack Router соберёт дерево
    config() {
      syncRoutes();
    },
    configureServer(server) {
      server.watcher.on("change", (path) => {
        const file = toContentFile(path);
        if (file && isContentFile(file)) writeRoute(readContentFile(file));
      });

      for (const event of ["add", "unlink", "unlinkDir"] as const) {
        server.watcher.on(event, (path) => {
          if (toContentFile(path) !== null) syncRoutes();
        });
      }
    },
  };
}
