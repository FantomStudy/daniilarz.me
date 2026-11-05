import type { Frontmatter } from "@/lib/meta";
import { useMatches } from "@tanstack/react-router";
import { lazy, Suspense, useSyncExternalStore } from "react";
import styles from "./Background.module.css";

type Art = NonNullable<Frontmatter["art"]>;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;

const DotsArt = lazy(() => import("./arts/DotsArt").then((m) => ({ default: m.DotsArt })));
const PlumArt = lazy(() => import("./arts/PlumArt").then((m) => ({ default: m.PlumArt })));
const OrcaArt = lazy(() => import("./arts/OrcaArt").then((m) => ({ default: m.OrcaArt })));

const ARTS = {
  dots: <DotsArt />,
  plum: <PlumArt />,
  orca: <OrcaArt />,
};

const choices = Object.values(ARTS);
const randomArt =
  typeof window === "undefined" ? undefined : choices[Math.floor(Math.random() * choices.length)];

const BACKGROUNDS: Record<Art, React.ReactNode> = {
  ...ARTS,
  random: randomArt,
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
      <Suspense>{!reducedMotion && BACKGROUNDS[requested]}</Suspense>
    </div>
  );
};
