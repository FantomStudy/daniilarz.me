import type { Plugin } from "vite";
import { resolve, sep } from "node:path";
import { CONTENT_DIR } from "./collect.ts";
import { syncRoutes } from "./routes.ts";

export { collectPages } from "./collect.ts";

export function content(): Plugin {
  const contentDir = resolve(CONTENT_DIR) + sep;

  return {
    name: "content",
    // Роуты должны появиться раньше, чем генератор TanStack Router соберёт дерево
    config() {
      syncRoutes();
    },
    configureServer(server) {
      server.watcher.on("all", (_event, path) => {
        if (path.startsWith(contentDir)) syncRoutes();
      });
    },
  };
}
