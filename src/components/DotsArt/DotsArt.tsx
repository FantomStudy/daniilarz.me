import type { Application, Particle } from "pixi.js";
import { useEffect, useRef } from "react";
import styles from "./DotsArt.module.css";

const SCALE = 200; // 200 пикселей на шаг решётки шума
const LENGTH = 5; // амплитуда смещения точки, px
const SPACING = 15; // расстояние между точками сетки, px
const MAX_RESOLUTION = 2; // потолок плотности пикселей, важен для телефонов

interface Point {
  x: number;
  y: number;
  opacity: number;
  particle: Particle;
}

export const DotsArt = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Всё, что нужно и setup, и cleanup, живёт здесь.
    let app: Application | null = null;
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout>;

    // Снимает все слушатели одним вызовом.
    const ac = new AbortController();

    async function setup() {
      // Анимация - украшение. При reduce не грузим даже чанк.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // pixi весит больше всей остальной страницы. Держим его в отдельном
      // чанке: статический импорт утянул бы его в бандл гидратации,
      // который качает каждая страница сайта.
      const [{ Application, Graphics, Particle, ParticleContainer }, { createNoise3D }] =
        await Promise.all([import("pixi.js"), import("simplex-noise")]);

      if (cancelled) return;

      const a = new Application();

      await a.init({
        backgroundAlpha: 0, // прозрачный холст, фон страницы просвечивает
        resolution: Math.min(window.devicePixelRatio, MAX_RESOLUTION),
        autoDensity: true, // pixi сам выставит CSS-размер канваса
      });

      const container = ref.current;

      // Пока ждали init, компонент размонтировали.
      // Убираем за собой и выходим, DOM не трогаем.
      if (cancelled || !container) {
        a.destroy(true, { children: true, texture: true, textureSource: true });
        return;
      }

      app = a;
      container.appendChild(a.canvas);

      // Первый кадр рисуется через ~16ms, то есть в самом начале
      // шестисотмиллисекундного проявления. Пустой канвас увидеть нельзя.
      container.classList.add(styles.visible);
      a.renderer.resize(window.innerWidth, window.innerHeight);

      // Один раз рисуем кружок и превращаем в текстуру.
      // Все частицы ссылаются на неё же, копий не делается.
      const g = new Graphics().circle(0, 0, 1).fill(0xcccccc);
      const texture = a.renderer.generateTexture({ target: g, resolution: 2 });
      g.destroy();

      // dynamicProperties объявляет, что перезаливать в видеокарту каждый кадр.
      // Всё остальное загружается один раз при создании частицы.
      const layer = new ParticleContainer({
        dynamicProperties: { position: true, alpha: true },
      });
      a.stage.addChild(layer);

      const points: Point[] = [];
      const seen = new Set<string>();

      // Домащивает сетку там, где точек ещё нет.
      // Set не даёт создать вторую точку на занятом месте.
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

      // ticker - это requestAnimationFrame от pixi.
      // Рекурсию писать не надо, destroy остановит его сам.
      a.ticker.add(() => {
        const t = Date.now() / 10000;

        for (const p of points) {
          const angle = (noise3d(p.x / SCALE, p.y / SCALE, t) - 0.5) * 2 * Math.PI;

          // То же поле, но по третьей оси вдвое быстрее.
          // Угол и длина расходятся по фазе, движение перестаёт
          // выглядеть механическим.
          const len = (noise3d(p.x / SCALE, p.y / SCALE, t * 2) + 0.5) * LENGTH;

          p.particle.x = p.x + Math.cos(angle) * len;
          p.particle.y = p.y + Math.sin(angle) * len;

          // Яркость от того же угла. |cos| периодичен, поэтому
          // гладкое поле складывается в полосы: тёмные линии
          // это изолинии шума.
          p.particle.alpha = (Math.abs(Math.cos(angle)) * 0.8 + 0.2) * p.opacity;
        }
      });

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

      // Дебаунс: при перетаскивании окна событие сыплется десятками
      // в секунду, а prunePoints линеен по числу точек.
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

    void setup();

    return () => {
      cancelled = true;
      ac.abort();
      clearTimeout(resizeTimer);
      app?.destroy(true, { children: true, texture: true, textureSource: true });
    };
  }, []);

  return <div ref={ref} className={styles.dots} />;
};
