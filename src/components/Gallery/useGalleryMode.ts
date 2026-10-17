import { useSyncExternalStore } from "react";

export type GalleryMode = "masonry" | "square";

const STORAGE_KEY = "gallery-mode";

const listeners = new Set<() => void>();

let current: GalleryMode | null | undefined;

const isGalleryMode = (value: unknown): value is GalleryMode =>
  value === "masonry" || value === "square";

const readSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isGalleryMode(saved) ? saved : null;
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
