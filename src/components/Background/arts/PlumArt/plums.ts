const STEP_LENGTH = 6;
const TURN_ANGLE = Math.PI / 12;
const INITIAL_SEGMENTS = 30;
const FRAME_INTERVAL = 1000 / 40;
const MAX_RESOLUTION = 2;
const MAX_SEGMENTS = 6000;
const MAX_ACTIVE_BRANCHES = 256;
const MAX_TICKS = 1200;
const MARGIN = 100;

interface Branch {
  x: number;
  y: number;
  angle: number;
  tree: { segments: number };
}

export const createPlum = (canvas: HTMLCanvasElement) => {
  const controller = new AbortController();
  const { signal } = controller;
  let context: CanvasRenderingContext2D | null = null;
  let branches: Branch[] = [];
  let frameId: number | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  let width = 0;
  let height = 0;
  let resolution = 0;
  let lastTime = 0;
  let segments = 0;
  let ticks = 0;

  const stop = () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  };

  const grow = (branch: Branch) => {
    if (!context || segments >= MAX_SEGMENTS) return;

    const length = Math.random() * STEP_LENGTH;
    const x = branch.x + Math.cos(branch.angle) * length;
    const y = branch.y + Math.sin(branch.angle) * length;

    context.beginPath();
    context.moveTo(branch.x, branch.y);
    context.lineTo(x, y);
    context.stroke();
    segments += 1;
    branch.tree.segments += 1;

    if (x < -MARGIN || x > width + MARGIN || y < -MARGIN || y > height + MARGIN) return;

    // Счётчик общий для дерева: глубина каждой ветки дала бы взрывной рост.
    const rate = branch.tree.segments <= INITIAL_SEGMENTS ? 0.8 : 0.5;
    for (const direction of [-1, 1]) {
      const angle = branch.angle + direction * Math.random() * TURN_ANGLE;
      if (Math.random() < rate && branches.length < MAX_ACTIVE_BRANCHES) {
        branches.push({ x, y, angle, tree: branch.tree });
      }
    }
  };

  const frame = (time: number) => {
    frameId = null;
    if (document.hidden) return;

    const elapsed = time - lastTime;
    if (elapsed >= FRAME_INTERVAL) {
      // Сохраняем остаток времени для экранов с разной частотой обновления.
      lastTime = time - (elapsed % FRAME_INTERVAL);
      ticks += 1;
      const current = branches;
      branches = [];

      for (const branch of current) {
        if (Math.random() < 0.5) {
          if (branches.length < MAX_ACTIVE_BRANCHES) branches.push(branch);
        } else {
          grow(branch);
        }
      }

      if (segments >= MAX_SEGMENTS || ticks >= MAX_TICKS) branches = [];
    }

    if (branches.length) frameId = requestAnimationFrame(frame);
  };

  const resume = () => {
    if (frameId !== null || !branches.length || document.hidden) return;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  };

  const restart = () => {
    stop();
    branches = [];
    context = canvas.getContext("2d");
    if (!context) return;

    width = window.innerWidth;
    height = window.innerHeight;
    resolution = Math.min(window.devicePixelRatio || 1, MAX_RESOLUTION);
    canvas.width = Math.round(width * resolution);
    canvas.height = Math.round(height * resolution);
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    context.lineWidth = 1;
    context.strokeStyle = "#88888825";
    segments = 0;
    ticks = 0;

    const middle = () => 0.2 + Math.random() * 0.6;
    const root = (x: number, y: number, angle: number): Branch => ({
      x,
      y,
      angle,
      tree: { segments: 0 },
    });

    branches = [
      root(middle() * width, -5, Math.PI / 2),
      root(middle() * width, height + 5, -Math.PI / 2),
    ];
    if (width >= 500) {
      branches.push(root(-5, middle() * height, 0), root(width + 5, middle() * height, Math.PI));
    }

    resume();
  };

  const start = () => {
    window.addEventListener(
      "resize",
      () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const nextResolution = Math.min(window.devicePixelRatio || 1, MAX_RESOLUTION);
          if (
            width !== window.innerWidth ||
            height !== window.innerHeight ||
            resolution !== nextResolution
          ) {
            restart();
          }
        }, 150);
      },
      { signal },
    );
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : resume()), {
      signal,
    });
    restart();
  };

  const destroy = () => {
    stop();
    controller.abort();
    clearTimeout(resizeTimer);
    branches = [];
    canvas.width = 0;
    canvas.height = 0;
  };

  return { start, destroy };
};
