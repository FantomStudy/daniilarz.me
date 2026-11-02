import { lerp, clamp, angleDiff, norm, cross, dot } from "./math";
import { ORCA } from "./model";

export const createOrca = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { start: () => {}, destroy: () => {} };
  const grid = { width: 0, height: 0, dpr: 1, cell: 11, cols: 0, rows: 0 };
  // Рамп из donut.c: от редкого к плотному.
  const GLYPHS = ".,-~:;=!*#$@";
  const ATLAS_GLYPHS = GLYPHS + "o";
  const SHADES = 12;
  let brightness: Float32Array, glyphs: Uint8Array, depthBuffer: Float32Array;
  let atlas: HTMLCanvasElement, atlasCell: number;

  const buildAtlas = () => {
    atlasCell = Math.ceil(grid.cell * grid.dpr);
    atlas = document.createElement("canvas");
    atlas.width = ATLAS_GLYPHS.length * atlasCell;
    atlas.height = SHADES * atlasCell;
    const a = atlas.getContext("2d")!;
    a.font = `400 ${Math.round(grid.cell * 0.9 * grid.dpr)}px "DM Mono", ui-monospace, Menlo, monospace`;
    a.textAlign = "center";
    a.textBaseline = "middle";
    for (let l = 0; l < SHADES; l++) {
      a.fillStyle = `rgba(150,150,150,${(0.2 + (0.75 * l) / (SHADES - 1)).toFixed(3)})`;
      for (let i = 0; i < ATLAS_GLYPHS.length; i++)
        a.fillText(
          ATLAS_GLYPHS[i],
          i * atlasCell + atlasCell / 2,
          l * atlasCell + atlasCell / 2 + grid.dpr,
        );
    }
  };

  // ---------- 3D-сцена ----------
  // Камера висит над водой и смотрит вниз, ось y вверх. Чем глубже косатка, тем она мельче и бледнее.
  const CAMERA_HEIGHT = 14;
  const LIGHT = norm([0.3, 1, 0.25]);
  const FOG_NEAR = 12.5,
    FOG_FAR = 23;
  let dark = false,
    focalLength = 1,
    centerX = 0,
    centerY = 0;

  // Точка поверхности: проекция, z-буфер, освещение по Ламберту.
  // На светлом фоне плотный символ = тёмная поверхность, на тёмном наоборот,
  // поэтому чёрная косатка остаётся чёрной в обеих темах.
  const emit = (
    px: number,
    py: number,
    pz: number,
    nx: number,
    ny: number,
    nz: number,
    albedo: number,
    flat: boolean,
    glyph = 0,
  ) => {
    const depth = CAMERA_HEIGHT - py;
    if (depth < 1) return;
    const sx = centerX + (focalLength * px) / depth,
      sy = centerY - (focalLength * pz) / depth;
    const c = Math.floor(sx / grid.cell),
      r = Math.floor(sy / grid.cell);
    if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return;
    const i = r * grid.cols + c;
    if (depth >= depthBuffer[i]) return;
    // Плоские плавники видны с обеих сторон: разворачиваем нормаль к камере.
    if (flat && nx * px + ny * (py - CAMERA_HEIGHT) + nz * pz > 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const lum = 0.2 + 0.8 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    const R = lum * (0.3 + 0.7 * albedo);
    const fog = clamp((FOG_FAR - depth) / (FOG_FAR - FOG_NEAR), 0.45, 1);
    depthBuffer[i] = depth;
    // В тёмной теме чёрное тело на чёрном фоне пропало бы, поэтому там яркость
    // больше зависит от света, чем от окраски.
    brightness[i] = Math.max(0.09, dark ? lum * (0.45 + 0.55 * albedo) : 1 - R) * fog;
    glyphs[i] = glyph || 0;
  };

  // Путь: петли по всему экрану в горизонтальной плоскости, плюс медленные
  // погружения: косатка то поднимается к поверхности, то уходит вглубь.
  // Длинная петля идёт вдоль длинной стороны экрана, поэтому на телефоне
  // косатка плавает вверх-вниз, а не упирается в узкие края.
  const lane = { long: 5, short: 3, portrait: false };
  const path = (tau: number) => {
    const a = lane.long * Math.sin(0.09 * tau);
    const b = lane.short * Math.sin(0.14 * tau + 0.5);
    const y = -1.2 + 1.4 * Math.sin(0.05 * tau);
    return lane.portrait ? [b, y, a] : [a, y, b];
  };

  const SPINE_SEGMENTS = 48;
  const orca = {
    spine: [] as number[][],
    bank: 0,
    heading: 0,
    tau: 0,
    bubbles: [] as { p: number[]; v: number; ph: number }[],
    nextBurst: 4,
    init() {
      this.tau = ORCA.phase;
      const seg = ORCA.length / (SPINE_SEGMENTS - 1);
      const h = path(this.tau),
        b = norm(path(this.tau - 0.1).map((v, i) => v - h[i]));
      this.spine = Array.from({ length: SPINE_SEGMENTS }, (_, i) => [
        h[0] + b[0] * seg * i,
        h[1] + b[1] * seg * i,
        h[2] + b[2] * seg * i,
      ]);
      this.bubbles = [];
      // Прогреваем хребет, чтобы тело сразу легло вдоль пути.
      for (let k = 0; k < 120; k++) this.step(0.05);
    },
    step(dt: number) {
      const k = ORCA;
      this.tau += dt * k.speed;
      const seg = k.length / (SPINE_SEGMENTS - 1);
      const sp = this.spine;
      sp[0] = path(this.tau);
      for (let i = 1; i < SPINE_SEGMENTS; i++) {
        const a = sp[i - 1],
          p = sp[i];
        const d = norm([p[0] - a[0], p[1] - a[1], p[2] - a[2]]);
        sp[i] = [a[0] + d[0] * seg, a[1] + d[1] * seg, a[2] + d[2] * seg];
      }
      // Крен в поворотах: косатка заваливается на бок, когда закладывает дугу.
      const T = norm([sp[0][0] - sp[2][0], sp[0][1] - sp[2][1], sp[0][2] - sp[2][2]]);
      const h = Math.atan2(T[0], T[2]);
      const turn = dt > 0 ? angleDiff(h, this.heading) / dt : 0;
      this.heading = h;
      this.bank += (clamp(-turn * 1.6, -0.55, 0.55) - this.bank) * Math.min(1, dt * 1.5);
    },
    frame(t: number, dt: number) {
      this.step(dt);
      const k = ORCA,
        Lw = k.length,
        sp = this.spine;

      // Опорные рамки по хребту: T вперёд, Sd вбок, U вверх.
      const frames = sp.map((_p, i) => {
        const a = sp[Math.max(0, i - 1)],
          b = sp[Math.min(SPINE_SEGMENTS - 1, i + 1)];
        const T = norm([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
        let Sd = norm(cross(T, [0, 1, 0]));
        let U = cross(Sd, T);
        const bk = this.bank * (1 - i / SPINE_SEGMENTS);
        const cb = Math.cos(bk),
          sb = Math.sin(bk);
        return {
          T,
          side: [Sd[0] * cb + U[0] * sb, Sd[1] * cb + U[1] * sb, Sd[2] * cb + U[2] * sb],
          U: [U[0] * cb - Sd[0] * sb, U[1] * cb - Sd[1] * sb, U[2] * cb - Sd[2] * sb],
        };
      });
      // Хвост бьёт вверх-вниз бегущей волной, сильнее к концу.
      const wave = (s: number) => Lw * 0.04 * Math.sin(t * 1.3 * k.speed - s * 4.2) * s * s;
      const at = (s: number) => {
        const fi = clamp(s, 0, 1) * (SPINE_SEGMENTS - 1),
          i = Math.min(SPINE_SEGMENTS - 2, Math.floor(fi)),
          u = fi - i;
        const a = sp[i],
          b = sp[i + 1],
          fr = frames[u < 0.5 ? i : i + 1];
        const w = wave(clamp(s, 0, 1));
        const ahead = s < 0 ? -s * Lw : 0;
        return {
          p: [
            lerp(a[0], b[0], u) + fr.U[0] * w + fr.T[0] * ahead,
            lerp(a[1], b[1], u) + fr.U[1] * w + fr.T[1] * ahead,
            lerp(a[2], b[2], u) + fr.U[2] * w + fr.T[2] * ahead,
          ],
          ...fr,
        };
      };

      // Тело: кольца сечений. Нос закрыт полусферой (s < 0).
      const NS = 150,
        NT = 60,
        NOSE = 0.035;
      for (let a = 0; a <= NS; a++) {
        const s = -NOSE + (a / NS) * (1 + NOSE);
        const { p, T, side: Sd, U } = at(s);
        const sc = s < 0 ? Math.sqrt(Math.max(0, 1 - (s / NOSE) ** 2)) : 1;
        const r = k.radius(s) * Lw * sc;
        const rw = k.width(Math.max(0, s), r),
          rt = k.top(Math.max(0, s), r),
          rb = k.bottom(Math.max(0, s), r);
        const fwd = s < 0.1 ? (0.1 - s) * 8 : 0;
        for (let j = 0; j < NT; j++) {
          const th = (j / NT) * Math.PI * 2,
            ct = Math.cos(th),
            st = Math.sin(th);
          const h = st >= 0 ? rt : rb;
          const n = norm([
            (Sd[0] * ct) / (rw || 1) + (U[0] * st) / (h || 1) + T[0] * fwd,
            (Sd[1] * ct) / (rw || 1) + (U[1] * st) / (h || 1) + T[1] * fwd,
            (Sd[2] * ct) / (rw || 1) + (U[2] * st) / (h || 1) + T[2] * fwd,
          ]);
          emit(
            p[0] + Sd[0] * rw * ct + U[0] * h * st,
            p[1] + Sd[1] * rw * ct + U[1] * h * st,
            p[2] + Sd[2] * rw * ct + U[2] * h * st,
            n[0],
            n[1],
            n[2],
            k.albedo(Math.max(0, s), ct, st),
            false,
          );
        }
      }

      // Хвостовой плавник: горизонтальная лопасть с выемкой посередине.
      for (let a = -40; a <= 40; a++) {
        const u = a / 40,
          au = Math.abs(u);
        const lead = 0.885 + 0.075 * Math.pow(au, 1.3),
          trail = 0.955 + 0.04 * Math.sqrt(au);
        for (let b = 0; b <= 10; b++) {
          const { p, side: Sd, U } = at(lerp(lead, trail, b / 10));
          const o = u * k.fluke.span * Lw;
          emit(
            p[0] + Sd[0] * o,
            p[1] + Sd[1] * o,
            p[2] + Sd[2] * o,
            U[0],
            U[1],
            U[2],
            k.fluke.albedo,
            true,
          );
        }
      }

      // Грудные плавники, по одному с каждой стороны.
      const pc = k.pectoral;
      const root = at(pc.at);
      const rr = k.radius(pc.at) * Lw;
      for (const side of [-1, 1]) {
        const flap = 0.18 * Math.sin(t * 0.9 * k.speed + (side > 0 ? 0 : 0.6));
        const dir = norm([
          root.side[0] * side * 0.75 - root.U[0] * (0.55 + flap) - root.T[0] * 0.4,
          root.side[1] * side * 0.75 - root.U[1] * (0.55 + flap) - root.T[1] * 0.4,
          root.side[2] * side * 0.75 - root.U[2] * (0.55 + flap) - root.T[2] * 0.4,
        ]);
        const chordDir = norm(root.T.map((v, i) => v - dir[i] * dot(root.T, dir)));
        const nrm = norm(cross(dir, chordDir));
        const base = [0, 1, 2].map(
          (i) => root.p[i] + root.side[i] * side * rr * 0.75 - root.U[i] * rr * 0.45,
        );
        const len = pc.len * Lw;
        for (let a = 0; a <= 36; a++) {
          const u = a / 36;
          const chord = pc.chord * Lw * Math.sqrt(Math.sin(Math.PI * (0.12 + 0.88 * u)));
          for (let b = -5; b <= 5; b++) {
            const v = b / 10;
            const albedo = pc.albedo;
            const back = -0.12 * len * u * u;
            emit(
              base[0] + dir[0] * u * len + chordDir[0] * (v * chord + back),
              base[1] + dir[1] * u * len + chordDir[1] * (v * chord + back),
              base[2] + dir[2] * u * len + chordDir[2] * (v * chord + back),
              nrm[0],
              nrm[1],
              nrm[2],
              albedo,
              true,
            );
          }
        }
      }

      // Спинной плавник косатки: высокий, отогнут назад.
      if (k.dorsal) {
        const d = k.dorsal;
        for (let a = 0; a <= 30; a++) {
          const u = a / 30;
          const front = lerp(d.from, d.to - 0.03, Math.pow(u, 0.85));
          const backEdge = d.to - 0.035 * u - 0.02 * Math.sin(Math.PI * u);
          for (let b = 0; b <= 8; b++) {
            const s = lerp(front, Math.max(front, backEdge), b / 8);
            const { p, side: Sd, U } = at(s);
            const hgt = k.top(s, k.radius(s) * Lw) * 0.9 + u * d.height * Lw;
            emit(
              p[0] + U[0] * hgt,
              p[1] + U[1] * hgt,
              p[2] + U[2] * hgt,
              Sd[0],
              Sd[1],
              Sd[2],
              d.albedo,
              true,
            );
          }
        }
      }

      // Пузыри из дыхала: всплывают и тают в глубине.
      this.nextBurst -= dt;
      if (this.nextBurst < 0) {
        this.nextBurst = 7 + Math.random() * 7;
        const bh = at(0.1);
        for (let i = 0; i < 10; i++) {
          this.bubbles.push({
            p: [
              bh.p[0] + (Math.random() - 0.5) * 0.3,
              bh.p[1] + bh.U[1] * 0.4 + i * 0.12,
              bh.p[2] + (Math.random() - 0.5) * 0.3,
            ],
            v: 0.5 + Math.random() * 0.5,
            ph: Math.random() * 6,
          });
        }
      }
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.p[1] += b.v * dt;
        b.p[0] += Math.sin(t * 2 + b.ph) * 0.15 * dt;
        if (b.p[1] > 1.5) {
          this.bubbles.splice(i, 1);
          continue;
        }
        emit(b.p[0], b.p[1], b.p[2], 0, 0, -1, 0.6, false, ATLAS_GLYPHS.length);
      }
    },
  };

  const drawFrame = (t: number, dt: number) => {
    const { width, height, cols, rows, cell } = grid;
    brightness.fill(0);
    glyphs.fill(0);
    depthBuffer.fill(Infinity);
    dark = document.documentElement.classList.contains("dark");
    orca.frame(t, dt);
    ctx.clearRect(0, 0, width, height);
    // Подложка клеток: тело читается как мозаика из квадратов, символы поверх.
    const tiles = Array.from({ length: 6 }, () => new Path2D());
    for (let i = 0; i < brightness.length; i++) {
      if (depthBuffer[i] === Infinity || glyphs[i]) continue;
      tiles[Math.min(5, (brightness[i] * 6) | 0)].rect(
        (i % cols) * cell,
        ((i / cols) | 0) * cell,
        cell,
        cell,
      );
    }
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = `rgba(150,150,150,${(0.03 + k * 0.035).toFixed(3)})`;
      ctx.fill(tiles[k]);
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (depthBuffer[i] === Infinity) continue;
        let v = brightness[i];
        // Силуэт: клетка на краю тела получает контур, чтобы белые пятна не растворялись в фоне.
        const edge =
          (c > 0 && depthBuffer[i - 1] === Infinity) ||
          (c < cols - 1 && depthBuffer[i + 1] === Infinity) ||
          (r > 0 && depthBuffer[i - cols] === Infinity) ||
          (r < rows - 1 && depthBuffer[i + cols] === Infinity);
        if (edge && !glyphs[i])
          v = Math.max(v, 0.5 * clamp((FOG_FAR - depthBuffer[i]) / (FOG_FAR - FOG_NEAR), 0.45, 1));
        const gi = glyphs[i] ? glyphs[i] - 1 : Math.min(GLYPHS.length - 1, (v * GLYPHS.length) | 0);
        const l = Math.round(clamp(v, 0, 1) * (SHADES - 1));
        ctx.drawImage(
          atlas,
          gi * atlasCell,
          l * atlasCell,
          atlasCell,
          atlasCell,
          c * cell,
          r * cell,
          cell,
          cell,
        );
      }
    }
  };

  const resize = () => {
    grid.dpr = Math.min(devicePixelRatio || 1, 2);
    grid.width = innerWidth;
    grid.height = innerHeight;
    grid.cell = Math.min(grid.width, grid.height) < 500 ? 9 : 11;
    grid.cols = Math.ceil(grid.width / grid.cell) + 1;
    grid.rows = Math.ceil(grid.height / grid.cell) + 1;
    canvas.width = Math.round(grid.width * grid.dpr);
    canvas.height = Math.round(grid.height * grid.dpr);
    ctx.setTransform(grid.dpr, 0, 0, grid.dpr, 0, 0);
    const n = grid.cols * grid.rows;
    brightness = new Float32Array(n);
    glyphs = new Uint8Array(n);
    depthBuffer = new Float32Array(n);
    // Масштаб от длинной стороны: косатка занимает около половины её и на телефоне,
    // и на десктопе, а не сжимается до ширины узкого экрана.
    const long = Math.max(grid.width, grid.height),
      short = Math.min(grid.width, grid.height);
    focalLength = long * 1.05;
    lane.portrait = grid.height > grid.width;
    lane.long = (0.32 * long * 15) / focalLength;
    lane.short = (0.28 * short * 15) / focalLength;
    centerX = grid.width / 2;
    centerY = grid.height / 2;
    buildAtlas();
    if (orca.spine.length) drawFrame(t, 0);
  };

  let t = 0,
    last = 0,
    raf = 0,
    destroyed = false;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (last && now - last < 1000 / 30) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    drawFrame(t, dt);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const start = () => {
    if (destroyed || raf || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(loop);
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const observer = new ResizeObserver(resize);
  resize();
  orca.init();
  drawFrame(t, 0);
  observer.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  void document.fonts.ready.then(() => {
    if (!destroyed) buildAtlas();
  });
  return {
    start,
    destroy: () => {
      destroyed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
};
