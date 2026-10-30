import type { PageEntry } from "./types";
import { ogMeta } from "@/lib/og";

export function pageHead({ path, title, description }: PageEntry) {
  return {
    meta: [
      { title: path === "/" ? title : `${title} - Daniil Arz` },
      ...(description ? [{ name: "description", content: description }] : []),
      ...ogMeta(path, title, description),
    ],
  };
}
