import type { Plugin } from "vite";
import type { PageMeta } from "../../src/lib/meta.ts";
import type { CardProps } from "./Card.tsx";
import { readFileSync } from "node:fs";
import { render } from "takumi-js";
import { Renderer } from "takumi-js/node";
import { OG_HEIGHT, OG_WIDTH, ogImagePath } from "../../src/lib/meta.ts";
import { BACKGROUND, Card } from "./Card.tsx";

const FONTS = [
  { file: "src/assets/fonts/inter-latin.woff2", name: "Inter Latin" },
  { file: "src/assets/fonts/inter-cyrillic.woff2", name: "Inter Cyrillic" },
  { file: "src/assets/fonts/inter-latin-italic.woff2", name: "Inter Latin", style: "italic" },
  { file: "src/assets/fonts/inter-cyrillic-italic.woff2", name: "Inter Cyrillic", style: "italic" },
  { file: "src/assets/fonts/dm-mono-400.woff2", name: "DM Mono" },
];

function toCardProps(page: PageMeta, titleByPath: Map<string, string>): CardProps {
  const section = titleByPath.get(page.path.slice(0, page.path.lastIndexOf("/")));

  return section
    ? { title: section, subtitle: page.title }
    : { title: page.title, subtitle: page.description };
}

async function createRenderer() {
  const renderer = new Renderer();
  await Promise.all(
    FONTS.map(({ file, ...font }) => renderer.registerFont({ ...font, data: readFileSync(file) })),
  );
  return renderer;
}

export function og(pages: PageMeta[]): Plugin {
  return {
    name: "og",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    async generateBundle() {
      const renderer = await createRenderer();
      const images = [{ src: BACKGROUND, data: readFileSync(BACKGROUND) }];

      const titleByPath = new Map(pages.map((page) => [page.path, page.title]));

      await Promise.all(
        pages.map(async (page) => {
          const png = await render(<Card {...toCardProps(page, titleByPath)} />, {
            renderer,
            width: OG_WIDTH,
            height: OG_HEIGHT,
            format: "png",
            images,
            emoji: "from-font",
          });

          this.emitFile({
            type: "asset",
            fileName: ogImagePath(page.path).slice(1),
            source: png,
          });
        }),
      );
    },
  };
}
