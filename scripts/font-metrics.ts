/**
 * Generates the metric-override values for Inter's Arial fallback in
 * src/styles/fonts.css. Run with `bun run scripts/font-metrics.ts` and paste
 * the output; the numbers only change if the woff2 files are replaced.
 *
 *   size-adjust     = avgCharWidth(Inter) / avgCharWidth(Arial)
 *   ascent-override = ascent(Inter) / unitsPerEm / size-adjust
 *
 * avgCharWidth is weighted by English letter frequency — the space glyph
 * alone is ~17% of a typical run, and Inter's is proportionally wider.
 */
import type { Font } from "fontkit";
import { readFileSync } from "node:fs";
import { create } from "fontkit";
import { decompress } from "wawoff2";

const ARIAL = "/System/Library/Fonts/Supplemental/";

// English frequencies incl. space, per @capsizecss/unpack.
const LATIN_FREQ: Record<string, number> = {
  a: 0.0668,
  b: 0.01154,
  c: 0.02547,
  d: 0.03134,
  e: 0.10665,
  f: 0.01792,
  g: 0.01596,
  h: 0.03535,
  i: 0.05996,
  j: 0.00107,
  k: 0.00686,
  l: 0.03469,
  m: 0.02071,
  n: 0.05799,
  o: 0.06154,
  p: 0.01659,
  q: 0.00089,
  r: 0.05186,
  s: 0.05473,
  t: 0.07567,
  u: 0.02272,
  v: 0.00889,
  w: 0.01216,
  x: 0.00196,
  y: 0.01609,
  z: 0.00063,
  " ": 0.17423,
};

/** fontkit's create() may hand back a collection; these files never are. */
function open(data: Buffer): Font {
  const font = create(data);
  if ("glyphForCodePoint" in font) return font;
  throw new Error("expected a single font, got a font collection");
}

async function openWoff2(path: string): Promise<Font> {
  return open(Buffer.from(await decompress(readFileSync(path))));
}

function avgWidth(font: Font, freq: Record<string, number>, wght?: number): number {
  const source = wght === undefined ? font : font.getVariation({ wght });
  let total = 0;
  let weight = 0;
  for (const [char, share] of Object.entries(freq)) {
    const glyph = font.glyphForCodePoint(char.codePointAt(0)!);
    if (!glyph) continue;
    total += (source.getGlyph(glyph.id).advanceWidth / font.unitsPerEm) * share;
    weight += share;
  }
  return total / weight;
}

/** Ascent, descent and line gap in em, from the table the browser honours. */
function vertical(font: Font) {
  const os2 = font["OS/2"];
  const source = os2.fsSelection.useTypoMetrics
    ? { asc: os2.typoAscender, desc: os2.typoDescender, gap: os2.typoLineGap }
    : { asc: font.hhea.ascent, desc: font.hhea.descent, gap: font.hhea.lineGap };
  return {
    ascent: source.asc / font.unitsPerEm,
    descent: Math.abs(source.desc) / font.unitsPerEm,
    lineGap: source.gap / font.unitsPerEm,
  };
}

const latin = await openWoff2("src/assets/fonts/inter-latin.woff2");
const latinItalic = await openWoff2("src/assets/fonts/inter-latin-italic.woff2");
const { ascent, descent, lineGap } = vertical(latin);

const cases = [
  ["latin, weight 100-500", latin, 400, "Arial.ttf", LATIN_FREQ],
  ["latin, weight 600-900", latin, 700, "Arial Bold.ttf", LATIN_FREQ],
  ["latin italic", latinItalic, undefined, "Arial Italic.ttf", LATIN_FREQ],
] as const;

for (const [label, font, wght, arialFile, freq] of cases) {
  const inter = avgWidth(font, freq, wght);
  const arial = avgWidth(open(readFileSync(ARIAL + arialFile)), freq);
  const sizeAdjust = inter / arial;
  const pct = (n: number) => `${+(n * 100).toFixed(2)}%`;
  console.log(
    `/* ${label} — Inter ${inter.toFixed(5)}em vs ${arialFile.replace(".ttf", "")} ${arial.toFixed(5)}em */\n` +
      `  size-adjust: ${pct(sizeAdjust)};\n` +
      `  ascent-override: ${pct(ascent / sizeAdjust)};\n` +
      `  descent-override: ${pct(descent / sizeAdjust)};\n` +
      `  line-gap-override: ${pct(lineGap / sizeAdjust)};\n`,
  );
}
