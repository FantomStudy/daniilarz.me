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

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail > 0 ? event.clientX : rect.left + rect.width / 2;
    const y = event.detail > 0 ? event.clientY : rect.top + rect.height / 2;
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const revealsNewTheme = nextTheme === "light";

    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${endRadius}px`);
    root.dataset.vt = revealsNewTheme ? "new" : "old";

    const cleanup = () => {
      delete root.dataset.vt;
    };

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        commitMode(nextMode);
      });
    });

    try {
      await transition.ready;
    } catch {
      cleanup();
      return;
    }

    const maskSize = ["0px 0px", `${endRadius * 2}px ${endRadius * 2}px`];
    const maskPosition = [`${x}px ${y}px`, `${x - endRadius}px ${y - endRadius}px`];
    const animation = root.animate(
      {
        maskSize: revealsNewTheme ? maskSize : [...maskSize].reverse(),
        maskPosition: revealsNewTheme ? maskPosition : [...maskPosition].reverse(),
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

    transition.finished
      .then(() => {
        animation.cancel();
        cleanup();
      })
      .catch(cleanup);
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
