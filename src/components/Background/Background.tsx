import type { Frontmatter } from "@/lib/meta";
import { useMatches } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { DotsArt } from "./arts/DotsArt";
import { PlumArt } from "./arts/PlumArt";
import styles from "./Background.module.css";

type Art = NonNullable<Frontmatter["art"]>;

const FADE_MS = 240;
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;

export const Background = () => {
  const requested = useMatches({
    select: (matches): Art =>
      matches.toReversed().find((match) => match.staticData.page)?.staticData.page?.art ?? "dots",
  });

  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);

  const [active, setActive] = useState<Art>(requested);

  useEffect(() => {
    if (active === requested) return;

    const timer = setTimeout(() => setActive(requested), reducedMotion ? 0 : FADE_MS);

    return () => clearTimeout(timer);
  }, [active, requested, reducedMotion]);

  return (
    <div
      className={styles.background}
      style={{ "--background-fade": `${FADE_MS}ms` }}
      data-leaving={active !== requested}
      aria-hidden="true"
    >
      {!reducedMotion && active === "dots" && <DotsArt />}
      {!reducedMotion && active === "plum" && <PlumArt />}
    </div>
  );
};
