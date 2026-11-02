import { useEffect, useRef } from "react";
import { createPlum } from "./plums";
import styles from "./PlumArt.module.css";

export const PlumArt = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const plum = createPlum(canvas);
    plum.start();

    return () => plum.destroy();
  }, []);

  return <canvas ref={ref} className={styles.plum} />;
};
