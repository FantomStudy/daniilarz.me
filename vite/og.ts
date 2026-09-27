import type { Node } from "@takumi-rs/core";
import type { Plugin } from "vite";
import type { PageEntry } from "../src/types.ts";
import { readFileSync } from "node:fs";
import { Renderer } from "@takumi-rs/core";
import { OG_HEIGHT, OG_ORIGIN, OG_WIDTH, ogImagePath } from "../src/lib/og.ts";
import { collectPages } from "./content.ts";

const BACKGROUND = "src/assets/og/background.png";
// Сабсеты Inter режутся по unicode-range, как в fonts.css. Без subsetOf
// takumi считает их разными семействами, и знаки, которых нет в кириллическом
// файле (запятая), уходят в DM Mono.
const FONTS = [
  {
    file: "src/assets/fonts/inter-latin.woff2",
    name: "Inter Latin",
    subsetOf: "Inter",
    subsetRank: 0,
  },
  {
    file: "src/assets/fonts/inter-cyrillic.woff2",
    name: "Inter Cyrillic",
    subsetOf: "Inter",
    subsetRank: 1,
  },
  {
    file: "src/assets/fonts/inter-latin-italic.woff2",
    name: "Inter Latin",
    subsetOf: "Inter",
    subsetRank: 0,
    style: "italic",
  },
  {
    file: "src/assets/fonts/inter-cyrillic-italic.woff2",
    name: "Inter Cyrillic",
    subsetOf: "Inter",
    subsetRank: 1,
    style: "italic",
  },
  { file: "src/assets/fonts/dm-mono-400.woff2", name: "DM Mono" },
];

const text = (content: string, style: Record<string, string | number>): Node => ({
  type: "text",
  text: content,
  style,
});

interface Card {
  title: string;
  subtitle?: string;
}

// Вложенная страница подписывается разделом: у статьи крупно «Блог»,
// а её название уходит в подзаголовок.
function toCard(page: PageEntry, titleByPath: Map<string, string>): Card {
  const section = titleByPath.get(page.path.slice(0, page.path.lastIndexOf("/")));
  return section
    ? { title: section, subtitle: page.title }
    : { title: page.title, subtitle: page.description };
}

function card({ title, subtitle }: Card): Node {
  return {
    type: "container",
    style: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: 80,
      color: "#ddd",
      fontFamily: "Inter",
      backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.85) 25%, rgba(0, 0, 0, 0)), url(${BACKGROUND})`,
      backgroundSize: "100% 100%",
    },
    children: [
      text(new URL(OG_ORIGIN).host, { fontFamily: "DM Mono", fontSize: 28, color: "#888" }),
      {
        type: "container",
        style: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 },
        children: [
          text(title, {
            fontSize: 76,
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: "0.005em",
          }),
          ...(subtitle
            ? [
                text(subtitle, {
                  fontSize: 34,
                  lineHeight: 1.35,
                  fontStyle: "italic",
                  color: "#bbb",
                }),
              ]
            : []),
        ],
      },
    ],
  };
}

async function createRenderer() {
  const renderer = new Renderer();
  await Promise.all(
    FONTS.map(({ file, ...font }) => renderer.registerFont({ ...font, data: readFileSync(file) })),
  );
  return renderer;
}

export function og(): Plugin {
  return {
    name: "og",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    async generateBundle() {
      const renderer = await createRenderer();
      const images = [{ src: BACKGROUND, data: readFileSync(BACKGROUND) }];
      const pages = collectPages();
      const titleByPath = new Map(pages.map((page) => [page.path, page.title]));

      await Promise.all(
        pages.map(async (page) => {
          const png = await renderer.render(card(toCard(page, titleByPath)), {
            width: OG_WIDTH,
            height: OG_HEIGHT,
            format: "png",
            images,
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
