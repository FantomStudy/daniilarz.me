import type { MouseEvent } from "react";
import { createContext, use, useState } from "react";
import { flushSync } from "react-dom";

type Mode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  toggleDark: (event: MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const isServer = typeof window === "undefined";

const getPreferedTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<Mode>(() => {
    if (isServer) return "auto";
    const stored = localStorage.getItem("color-scheme");
    if (stored === "light" || stored === "dark" || stored === "auto") return stored;
    return "auto";
  });

  function applyMode(currentTheme: ResolvedTheme) {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    const nextMode = nextTheme === getPreferedTheme() ? "auto" : nextTheme;

    setMode(nextMode);

    document.documentElement.classList.toggle("dark", nextTheme === "dark");

    localStorage.setItem("color-scheme", nextMode);
  }

  async function toggleDark(event: MouseEvent) {
    const resolvedTheme = mode === "auto" ? getPreferedTheme() : mode;

    const canUseViewTransition =
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canUseViewTransition) {
      applyMode(resolvedTheme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        applyMode(resolvedTheme);
      });
    });

    await transition.ready.then(() => {
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`];
      const animation = document.documentElement.animate(
        {
          clipPath: resolvedTheme === "dark" ? clipPath : [...clipPath].reverse(),
        },
        {
          duration: 400,
          easing: "ease-out",
          fill: "forwards",
          pseudoElement:
            resolvedTheme === "dark"
              ? "::view-transition-new(root)"
              : "::view-transition-old(root)",
        },
      );

      transition.finished.then(() => animation.cancel()).catch(() => {});
    });
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
