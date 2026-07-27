// DotFlowField.tsx
// Требует: npm i pixi.js simplex-noise
//
// Сетка точек на весь экран: каждая смещается и меняет прозрачность
// по 3D simplex-noise полю (x, y, время). Порт ArtDots.vue с antfu.me
// на React + pixi.js v8.

import { Application, Graphics, Particle, ParticleContainer, type Texture } from "pixi.js";
import { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";
import styles from "./DotsArt.module.css";

// --- Параметры внешнего вида -------------------------------------------------

const SCALE = 200; // масштаб шума: больше = крупнее и плавнее волны
const LENGTH = 5; // амплитуда смещения точки от исходной позиции, px
const SPACING = 15; // расстояние между точками сетки, px
const TIME_SCALE = 10000; // делитель времени: больше = медленнее «плывёт» поле

// Точку рисуем крупной текстурой и ужимаем спрайтом. Если генерировать
// текстуру радиусом 1px, получится картинка 2x2 пикселя, и на retina
// вместо круга будет мыльный квадрат: сглаживать там просто нечего.
const DOT_TEXTURE_RADIUS = 8;
const DOT_RADIUS = 1;
const DOT_SCALE = DOT_RADIUS / DOT_TEXTURE_RADIUS;

// Потолок на плотность пикселей. На 3x-экранах разницы с 2x глаз не видит,
// а закрашивать нужно в 2.25 раза больше площади.
const MAX_RESOLUTION = 2;

// Тип одной точки поля: исходные координаты сетки, случайная «базовая»
// яркость и ссылка на pixi-частицу, которой эта точка управляет.
interface Point {
  x: number;
  y: number;
  opacity: number;
  particle: Particle;
}

export function DotFlowField() {
  // Реф на div-контейнер, куда pixi вставит свой <canvas>.
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Состояние жизненного цикла -----------------------------------------
    //
    // Два флага, а не один. `disposed` означает «React нас размонтировал»,
    // `ready` означает «app.init() успел завершиться».
    //
    // Зачем: `new Application()` синхронный, а `init()` асинхронный. В React
    // StrictMode эффект монтируется, тут же размонтируется и монтируется
    // снова в пределах одного тика, поэтому cleanup успевает выполниться,
    // пока init ещё в полёте. Если в этот момент вызвать app.destroy(),
    // pixi дёрнет this.renderer.destroy() на несуществующем рендерере
    // и бросит исключение. Отсюда и загадочный try/catch в оригинале.
    //
    // Правило простое: уничтожает тот, кто оказался последним.
    // Если cleanup пришёл раньше init — убирает за собой сам setup().
    let disposed = false;
    let ready = false;
    let app: Application | undefined;

    // Один AbortController снимает сразу все DOM-слушатели этого эффекта,
    // сколько бы их ни появилось. Не нужно хранить ссылки на обработчики
    // (и уж тем более вешать их полями на чужие объекты).
    const ac = new AbortController();
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    // Собственный генератор шума на весь жизненный цикл компонента:
    // один инстанс = один непрерывный «ландшафт» шума во времени.
    const noise3d = createNoise3D();

    // Точка отсчёта времени. Date.now() / TIME_SCALE дал бы координату
    // порядка 1.75e8 — точности double хватает, но отлаживать такое неудобно.
    const startTime = Date.now();

    // Сетка точек и Set ключей для дедупликации: после resize мы домащиваем
    // только новую площадь, не трогая уже существующие точки.
    let points: Point[] = [];
    const existingKeys = new Set<string>();

    // --- Математика поля ----------------------------------------------------

    // Возвращает угол (радианы) смещения точки (x, y) в момент времени z.
    //
    // ВАЖНО: noise3d возвращает значение в [-1, 1], поэтому
    // (n - 0.5) * 2π даёт НЕ [-π, π], а [-3π, π] — размах 4π, два полных
    // оборота. Формула написана так, будто шум приходит в [0, 1].
    // Это не опечатка при портировании, так в оригинале, и именно эта
    // «неточность» создаёт весь визуальный характер фона:
    //
    // Прозрачность ниже считается через |cos(rad)|, а cos периодичен.
    // Пропуская гладкое поле шума через периодическую функцию, мы
    // «складываем» его в набор полос: точка яркая при n = 0, ±0.5, ±1
    // и тёмная при n = ±0.25, ±0.75. Тёмные линии на экране — это
    // изолинии шумового поля, отсюда ощущение топографической карты.
    // Если сделать диапазон «честным» [-π, π], полос станет вдвое меньше
    // и картинка заметно обеднеет.
    //
    // Побочный эффект: simplex-noise распределён колоколом вокруг нуля,
    // значит самое частое значение rad ≈ -π, то есть cos ≈ -1. Поэтому
    // большинство точек яркие, а смещение по умолчанию идёт влево.
    function getForceAngle(x: number, y: number, z: number) {
      return (noise3d(x / SCALE, y / SCALE, z) - 0.5) * 2 * Math.PI;
    }

    // --- Ресурсы ------------------------------------------------------------

    // Одна текстура-кружок на все тысячи частиц: для GPU это дёшево,
    // потому что весь контейнер рисуется одним draw call.
    function createDotTexture(app: Application): Texture {
      const g = new Graphics().circle(0, 0, DOT_TEXTURE_RADIUS).fill(0xcccccc);
      const texture = app.renderer.generateTexture({ target: g, resolution: 2 });
      // Graphics отработал своё, дальше он только держит память.
      g.destroy();
      return texture;
    }

    // Добавляет точки, которых ещё нет: при инициализации и при увеличении окна.
    function addPoints(dotTexture: Texture, particleContainer: ParticleContainer) {
      const w = window.innerWidth;
      const h = window.innerHeight;

      for (let x = -SPACING / 2; x < w + SPACING; x += SPACING) {
        for (let y = -SPACING / 2; y < h + SPACING; y += SPACING) {
          const key = `${x}-${y}`;
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);

          // Particle — облегчённый спрайт специально для ParticleContainer:
          // без масок, фильтров и дочерних объектов, поэтому его позицию
          // можно заливать в GPU-буфер напрямую, минуя граф сцены.
          const particle = new Particle(dotTexture);
          particle.anchorX = 0.5;
          particle.anchorY = 0.5;
          particle.scaleX = DOT_SCALE;
          particle.scaleY = DOT_SCALE;
          particleContainer.addParticle(particle);

          // Своя «базовая» яркость 0.5–1.0 у каждой точки, чтобы сетка
          // не выглядела идеально однородной.
          const opacity = Math.random() * 0.5 + 0.5;
          points.push({ x, y, opacity, particle });
        }
      }
    }

    // Обратная операция: убирает точки, вышедшие за пределы уменьшившегося окна.
    // В оригинале её нет, поэтому после «внешний монитор → ноутбук» там
    // продолжает считаться 4K-сетка на 1440p-экране.
    function prunePoints(particleContainer: ParticleContainer) {
      const maxX = window.innerWidth + SPACING;
      const maxY = window.innerHeight + SPACING;

      const kept: Point[] = [];
      for (const p of points) {
        if (p.x < maxX && p.y < maxY) {
          kept.push(p);
          continue;
        }
        particleContainer.removeParticle(p.particle);
        existingKeys.delete(`${p.x}-${p.y}`);
      }
      points = kept;
    }

    // --- Инициализация ------------------------------------------------------

    async function setup() {
      app = new Application();

      // backgroundAlpha: 0 — канвас прозрачный, фон страницы просвечивает.
      // eventMode: 'none' — стейдж не участвует в обработке указателя
      // (за проход кликов «сквозь» отвечает CSS pointer-events-none).
      // autoDensity — pixi сам выставит CSS-размер канваса при resolution > 1.
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, MAX_RESOLUTION),
        eventMode: "none",
        autoDensity: true,
      });

      // Cleanup уже отработал, пока мы ждали init. Значит, убирать за собой
      // нам, потому что на момент cleanup уничтожать было ещё нечего.
      if (disposed) {
        app.destroy(true, { children: true, texture: true, textureSource: true });
        return;
      }
      ready = true;

      container.appendChild(app.canvas);
      app.renderer.resize(window.innerWidth, window.innerHeight);

      // dynamicProperties помечает, какие буферы pixi перезаливает каждый кадр.
      // Здесь меняются только позиция и альфа; геометрия, поворот и UV
      // загружаются один раз при добавлении частицы и больше не трогаются.
      // Это и есть главная причина, по которой здесь вообще нужен pixi:
      // 9000 обычных Sprite такого не выдержали бы.
      const particleContainer = new ParticleContainer({
        dynamicProperties: { position: true, alpha: true },
      });
      app.stage.addChild(particleContainer);

      const dotTexture = createDotTexture(app);
      addPoints(dotTexture, particleContainer);

      // --- Кадр -------------------------------------------------------------

      function updatePoints() {
        // Время берём от стенных часов, а не от дельты кадра: так скорость
        // анимации не зависит от FPS.
        const t = (Date.now() - startTime) / TIME_SCALE;

        for (const p of points) {
          const rad = getForceAngle(p.x, p.y, t);

          // То же шумовое поле, но пройденное по оси Z вдвое быстрее (t * 2).
          // Направление и амплитуда расходятся по фазе, и движение перестаёт
          // выглядеть механически синхронным.
          // Диапазон здесь [-2.5, 7.5] px: отрицательная длина не ошибка,
          // она просто разворачивает вектор на 180°.
          const len = (noise3d(p.x / SCALE, p.y / SCALE, t * 2) + 0.5) * LENGTH;

          p.particle.x = p.x + Math.cos(rad) * len;
          p.particle.y = p.y + Math.sin(rad) * len;

          // Та самая «складка» поля в полосы (подробности у getForceAngle).
          // Множитель 0.8 + 0.2 не даёт точкам гаснуть полностью.
          p.particle.alpha = (Math.abs(Math.cos(rad)) * 0.8 + 0.2) * p.opacity;
        }
      }

      // app.ticker — внутренний rAF-цикл pixi. Рендер он добавляет сам
      // с низким приоритетом, поэтому наш коллбэк всегда отработает раньше.
      app.ticker.add(updatePoints);

      // Принудительно прогоняет один кадр даже при остановленном тикере.
      const renderOnce = () => app?.ticker.update();

      // --- Reduced motion ---------------------------------------------------
      //
      // Полноэкранная непрерывная анимация — ровно тот случай, ради которого
      // эту медиа-фичу и придумали. Показываем один статичный кадр.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      const applyMotionPreference = () => {
        if (!app) return;
        if (reduceMotion.matches) {
          app.ticker.stop();
          renderOnce();
        } else {
          app.ticker.start();
        }
      };

      reduceMotion.addEventListener("change", applyMotionPreference, { signal: ac.signal });
      applyMotionPreference();

      // --- Resize -----------------------------------------------------------
      //
      // Событие сыплется десятками в секунду при перетаскивании окна,
      // а prunePoints линеен по числу точек — поэтому дебаунс.
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (!app || disposed) return;
          app.renderer.resize(window.innerWidth, window.innerHeight);
          addPoints(dotTexture, particleContainer);
          prunePoints(particleContainer);
          if (reduceMotion.matches) renderOnce();
        }, 150);
      };

      window.addEventListener("resize", handleResize, { signal: ac.signal });
    }

    setup();

    // --- Очистка ------------------------------------------------------------

    return () => {
      disposed = true;
      ac.abort();
      clearTimeout(resizeTimer);

      // Уничтожаем только полностью инициализированное приложение.
      // Если init ещё не закончился (ready === false), destroy сделает
      // сам setup(), когда промис зарезолвится и увидит disposed.
      if (app && ready) {
        // true — снести и сам canvas-элемент. Второй аргумент — каскадно
        // почистить детей, текстуры и их источники, иначе течёт видеопамять.
        app.destroy(true, { children: true, texture: true, textureSource: true });
      }
    };
  }, []);

  // pointer-events-none — клики проходят «сквозь» фон к контенту под ним.
  // fixed inset-0 -z-10 — на весь экран, за остальным содержимым.
  // dark:invert — точки нарисованы светло-серым (0xCCCCCC) в расчёте
  // на тёмный фон; на светлой теме без инверсии они почти не видны.
  return <div ref={containerRef} className={styles.dots} />;
}
