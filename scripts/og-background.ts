import { writeFileSync } from "node:fs";
/**
 * Генерирует общий фон Open Graph — светлые линии, изогнутые шумом, на тёмном
 * поле. Запускается один раз, результат коммитится; vite/og.ts только
 * накладывает текст поверх, так что сборка шум не пересчитывает.
 *
 *   bun run scripts/og-background.ts [вариант]  → src/assets/og/background.png
 */
import { Renderer } from "@takumi-rs/core";
import { createNoise2D } from "simplex-noise";
import { OG_HEIGHT, OG_WIDTH } from "../src/lib/og.ts";

const OUTPUT_FILE = "src/assets/og/background.png";

const SEED = 7; // фиксированное зерно: перегенерация даёт тот же фон
const LINE = 1; // полутолщина линии, px (гауссов профиль, заодно сглаживание)
const BG = [0, 0, 0]; // --bg тёмной темы
const FG = [110, 110, 110]; // линии приглушены, как точки DotsArt

const W = OG_WIDTH;
const H = OG_HEIGHT;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(SEED);
const warp = createNoise2D(random);
const glow = createNoise2D(random);
const sweep = createNoise2D(random);
const drift = createNoise2D(random);

const fbm = (x: number, y: number) => warp(x, y) + 0.2 * warp(x * 1.9, y * 1.9);

// Каждый вариант — фаза: линии проходят по её целым значениям. Фаза обязана
// строго расти по y, иначе линии сворачиваются в петли, как на топокарте.
const VARIANTS: Record<string, (x: number, y: number) => number> = {
  // Плавные волны плюс медленный наклон: местами линии уходят за край.
  sweep: (x, y) =>
    (y + 180 * fbm(x * 0.0014, y * 0.001) + 420 * sweep(x * 0.0007, y * 0.00035)) / (H / 11),

  // Все линии идут наискосок: входят слева сверху, выходят справа снизу.
  diagonal: (x, y) => (y - 0.45 * x + 110 * fbm(x * 0.0016, y * 0.001)) / (H / 12),

  // Веер: слева линии сжаты в пучок, вправо расходятся и уходят за верх и низ.
  fan: (x, y) => {
    const spread = 0.35 + 1.6 * (x / W);
    return (y - H * 0.62 + 60 * fbm(x * 0.0018, y * 0.0012)) / ((H / 16) * spread);
  },

  // Лента: плотный пучок линий течёт через кадр по диагонали,
  // вокруг него — редкие линии.
  ribbon: (x, y) => {
    const center = H * 0.95 - 0.55 * x + 140 * drift(x * 0.0011, 0.5);
    const base = y + 60 * fbm(x * 0.0015, y * 0.001);
    return base / (H / 4) + 5 * Math.tanh((y - center) / 110);
  },

  // Холм: линии поднимаются к середине и снова опускаются,
  // крайние выходят за верх и возвращаются.
  hill: (x, y) => {
    const t = (x / W - 0.6) / 0.28;
    const rise = 520 * Math.exp(-(t * t)) + 90 * fbm(x * 0.0013, y * 0.0009);
    return (y + rise) / (H / 11);
  },
};

async function render(phaseAt: (x: number, y: number) => number) {
  const data = new Uint8Array(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const phase = phaseAt(x, y);
      // Расстояние до линии в пикселях: делим на длину градиента фазы,
      // иначе на крутых изгибах линия толстеет.
      const gx = phaseAt(x + 0.5, y) - phaseAt(x - 0.5, y);
      const gy = phaseAt(x, y + 0.5) - phaseAt(x, y - 0.5);
      const d = Math.abs(phase - Math.round(phase)) / Math.hypot(gx, gy);
      const line = Math.exp(-((d / LINE) ** 2));

      // Медленный шум приглушает часть линий, чтобы рисунок не выглядел ровным.
      const intensity = line * (0.35 + 0.65 * (0.5 + 0.5 * glow(x * 0.0012, y * 0.0012)));

      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = BG[c] + (FG[c] - BG[c]) * intensity;
      data[i + 3] = 255;
    }
  }

  return new Renderer().render(
    { type: "image", src: { width: W, height: H, data }, width: W, height: H },
    { width: W, height: H, format: "png" },
  );
}

const variant = process.argv[2] ?? "ribbon";
const phaseAt = VARIANTS[variant];
if (!phaseAt) throw new Error(`Unknown variant "${variant}": ${Object.keys(VARIANTS).join(", ")}`);

const png = await render(phaseAt);
writeFileSync(OUTPUT_FILE, png);
console.log(`${OUTPUT_FILE} (${variant}): ${(png.byteLength / 1024).toFixed(1)} KB`);
