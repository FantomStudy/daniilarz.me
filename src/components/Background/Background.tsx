import type { Frontmatter } from "@/lib/meta";
import { useMatches } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { DotsArt } from "./arts/DotsArt";
import { PlumArt } from "./arts/PlumArt";
import styles from "./Background.module.css";

type Art = NonNullable<Frontmatter["art"]>;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;

const ARTS: Record<Art, React.ReactNode> = {
  dots: <DotsArt />,
  plum: <PlumArt />,
  none: undefined,
};

export const Background = () => {
  const requested = useMatches({
    select: (matches): Art =>
      matches.toReversed().find((match) => match.staticData.page)?.staticData.page?.art ?? "dots",
  });

  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);

  return (
    <div className={styles.background} aria-hidden="true">
      {!reducedMotion && ARTS[requested]}
    </div>
  );
};
