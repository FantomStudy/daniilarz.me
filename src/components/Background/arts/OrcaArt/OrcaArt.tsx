import { useEffect, useRef } from "react";
import { createOrca } from "./orca";
import styles from "./OrcaArt.module.css";

export const OrcaArt = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const orca = createOrca(ref.current);
    orca.start();
    return () => orca.destroy();
  }, []);
  return <canvas ref={ref} className={styles.orca} />;
};
