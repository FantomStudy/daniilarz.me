// pixi импортируется статически намеренно, хотя и весит больше остального
// бандла. Ленивый import() внутри эффекта разносит pixi на 14 чанков
// со второй волной-водопадом (WebGLRenderer, browserAll, init) и переносит
// ~секунду исполнения в окно TBT (FCP → TTI). Отложить работу из этого окна
// нельзя: TTI по определению конец последнего длинного таска.
// Замеры Lighthouse (мобиль, devtools-троттлинг, по 4 прогона):
//   ленивый:    TBT 96-165 мс, SI 2475-2655, оценка 97-99
//   статичный:  TBT 50-69 мс,  SI 2125-2153, оценка 99-100
import type { Texture } from "pixi.js";
import { Application, Graphics, Particle, ParticleContainer } from "pixi.js";
import { createNoise3D } from "simplex-noise";

const SCALE = 200; // 200 пикселей на шаг решётки шума
const LENGTH = 5; // амплитуда смещения точки, px
const SPACING = 15; // расстояние между точками сетки, px

interface Point {
  x: number;
  y: number;
  opacity: number;
  particle: Particle;
}

export const createDots = (container: HTMLDivElement, onReady: () => void) => {
  let app: Application | null = null;
  let particleTexture: Texture | null = null;
  let cancelled = false;
  let resizeTimer: ReturnType<typeof setTimeout>;

  const ac = new AbortController();

  async function setup() {
    const a = new Application();

    await a.init({
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });

    if (cancelled) {
      a.destroy(true, { children: true, texture: true, textureSource: true });
      return;
    }

    app = a;
    container.appendChild(a.canvas);

    // Первый кадр рисуется через ~16ms, то есть в самом начале
    // шестисотмиллисекундного проявления. Пустой канвас увидеть нельзя.
    onReady();

    a.renderer.resize(window.innerWidth, window.innerHeight);

    // Один раз рисуем точку и превращаем в текстуру.
    // Все частицы ссылаются на неё же, копий не делается.
    const g = new Graphics().circle(0, 0, 1).fill(0xcccccc);
    const texture = a.renderer.generateTexture({ target: g, resolution: 2 });
    particleTexture = texture;
    g.destroy();

    // dynamicProperties объявляет, что перезаливать в видеокарту каждый кадр.
    // Всё остальное загружается один раз при создании частицы.
    const layer = new ParticleContainer({
      dynamicProperties: { position: true, color: true },
    });
    a.stage.addChild(layer);

    const points: Point[] = [];
    const seen = new Set<string>();

    function addPoints() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      for (let x = -SPACING / 2; x < w + SPACING; x += SPACING) {
        for (let y = -SPACING / 2; y < h + SPACING; y += SPACING) {
          const key = `${x}-${y}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const particle = new Particle(texture);
          particle.anchorX = 0.5;
          particle.anchorY = 0.5;
          particle.x = x;
          particle.y = y;
          layer.addParticle(particle);

          // Своя постоянная яркость. Считается один раз:
          // random каждый кадр дал бы мельтешение.
          points.push({
            x,
            y,
            opacity: Math.random() * 0.5 + 0.5,
            particle,
          });
        }
      }
    }

    // Убирает точки, вышедшие за пределы уменьшившегося окна.
    // Идём с конца, потому что splice сдвигает индексы.
    function prunePoints() {
      const maxX = window.innerWidth + SPACING;
      const maxY = window.innerHeight + SPACING;

      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        if (p.x < maxX && p.y < maxY) continue;

        layer.removeParticle(p.particle);
        seen.delete(`${p.x}-${p.y}`);
        points.splice(i, 1);
      }
    }

    addPoints();

    const noise3d = createNoise3D();

    a.ticker.add(() => {
      const t = Date.now() / 10000;

      for (const p of points) {
        const nx = p.x / SCALE;
        const ny = p.y / SCALE;

        const angle = (noise3d(nx, ny, t) - 0.5) * 2 * Math.PI;
        const len = (noise3d(nx, ny, t * 2) + 0.5) * LENGTH;

        const cos = Math.cos(angle);

        p.particle.x = p.x + cos * len;
        p.particle.y = p.y + Math.sin(angle) * len;
        p.particle.alpha = (Math.abs(cos) * 0.8 + 0.2) * p.opacity;
      }
    });

    if (document.hidden) a.ticker.stop();

    // В фоновой вкладке rAF и так придушен браузером, но ticker.stop()
    // снимает и пересчёт точек, и загрузку в видеокарту.
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) a.ticker.stop();
        else a.ticker.start();
      },
      { signal: ac.signal },
    );

    // Дебаунс для пересчета точек при изменении размера окна
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        a.renderer.resize(window.innerWidth, window.innerHeight);
        addPoints();
        prunePoints();
      }, 150);
    };

    window.addEventListener("resize", onResize, { signal: ac.signal });
  }

  const destroy = () => {
    cancelled = true;
    ac.abort();
    clearTimeout(resizeTimer);
    app?.destroy(true, { children: true });
    particleTexture?.destroy(true);
    app = null;
    particleTexture = null;
  };

  const start = () => {
    void setup().catch((error) => {
      destroy();
      console.error("Unable to start dots background", error);
    });
  };

  return { start, destroy };
};
