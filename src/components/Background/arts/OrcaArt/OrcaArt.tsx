import { useEffect, useRef } from "react";
import { createOrca } from "./orca";
import styles from "./OrcaArt.module.css";

export const OrcaArt = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const orca = createOrca(canvas);
    orca.start();

    const raf = requestAnimationFrame(() => {
      canvas.dataset.ready = "true";
    });

    return () => {
      cancelAnimationFrame(raf);
      orca.destroy();
      delete canvas.dataset.ready;
    };
  }, []);

  return <canvas ref={ref} className={styles.orca} />;
};
