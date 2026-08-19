import type { MouseEvent } from "react";
import { createContext, use, useEffect, useState } from "react";
import { flushSync } from "react-dom";

type Mode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  toggleDark: (event: MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const resolveTheme = (mode: Mode): ResolvedTheme => (mode === "auto" ? getSystemTheme() : mode);

const applyTheme = (theme: ResolvedTheme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "auto";

    const stored = localStorage.getItem("color-scheme");
    if (stored === "light" || stored === "dark" || stored === "auto") return stored;

    return "auto";
  });

  useEffect(() => {
    if (mode !== "auto") return undefined;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => applyTheme(resolveTheme(mode));

    syncSystemTheme();
    query.addEventListener("change", syncSystemTheme);

    return () => query.removeEventListener("change", syncSystemTheme);
  }, [mode]);

  function commitMode(nextMode: Mode) {
    setMode(nextMode);

    applyTheme(resolveTheme(nextMode));

    localStorage.setItem("color-scheme", nextMode);
  }

  async function toggleDark(event: MouseEvent) {
    const resolvedTheme = resolveTheme(mode);
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    const nextMode: Mode = nextTheme === getSystemTheme() ? "auto" : nextTheme;

    const canUseViewTransition =
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canUseViewTransition) {
      commitMode(nextMode);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const revealsNewTheme = nextTheme === "light";

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        commitMode(nextMode);
      });
    });

    try {
      await transition.ready;
    } catch {
      return;
    }

    const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`];
    const animation = document.documentElement.animate(
      {
        clipPath: revealsNewTheme ? clipPath : [...clipPath].reverse(),
      },
      {
        duration: 400,
        easing: "ease-out",
        fill: "forwards",
        pseudoElement: revealsNewTheme
          ? "::view-transition-new(root)"
          : "::view-transition-old(root)",
      },
    );

    transition.finished.then(() => animation.cancel()).catch(() => {});
  }

  return (
    <ThemeContext
      value={{
        toggleDark,
      }}
    >
      {children}
    </ThemeContext>
  );
};

export const useTheme = () => {
  const ctx = use(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
