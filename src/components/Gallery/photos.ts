import type { Picture } from "vite-imagetools";
import { formatDate } from "@/lib/formatDate";

export interface Photo {
  src: string;
  width: number;
  height: number;
  sources: Record<string, string>;
  alt: string;
}

const PHOTOS_DIR = "/src/assets/photos/";

const pictures = import.meta.glob<Picture>("/src/assets/photos/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: { w: "480;960;1440", format: "avif;webp", as: "picture" },
});

const toAlt = (name: string) => {
  const match = name.match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? `Фото, ${formatDate(`${match[1]}-${match[2]}-${match[3]}`)}` : "Фото";
};

export const PHOTOS: Photo[] = Object.entries(pictures)
  .map(([file, picture]) => ({ name: file.slice(PHOTOS_DIR.length), picture }))
  .toSorted((a, b) => b.name.localeCompare(a.name))
  .map(({ name, picture }) => ({
    src: picture.img.src,
    width: picture.img.w,
    height: picture.img.h,
    sources: picture.sources,
    alt: toAlt(name),
  }));
