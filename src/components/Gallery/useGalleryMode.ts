import { useSyncExternalStore } from "react";

type GalleryMode = "masonry" | "square";

const STORAGE_KEY = "daniilarz-gallery-mode";

const listeners = new Set<() => void>();

let current: GalleryMode | null | undefined;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const readSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isGalleryMode = saved === "masonry" || saved === "square";

    return isGalleryMode ? saved : null;
  } catch {
    return null;
  }
};

const getSnapshot = () => (current ??= readSaved());

const getServerSnapshot = () => null;

const saveMode = (mode: GalleryMode) => {
  current = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
  for (const listener of listeners) listener();
};

export const useGalleryMode = (defaultMode: GalleryMode) => {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) ?? defaultMode;
  return [mode, saveMode] as const;
};
