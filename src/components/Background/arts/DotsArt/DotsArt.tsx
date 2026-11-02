import { useEffect, useRef } from "react";
import { createDots } from "./dots";
import styles from "./DotsArt.module.css";

export const DotsArt = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const dots = createDots(container, () => {
      container.dataset.ready = "true";
    });

    dots.start();

    return () => {
      dots.destroy();
      delete container.dataset.ready;
    };
  }, []);

  return <div ref={ref} className={styles.dots} />;
};
