import type { Picture } from "vite-imagetools";

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
  query: { w: "480;960;1440", format: "avif;webp", quality: "70", as: "picture" },
});

export const PHOTOS: Photo[] = Object.entries(pictures)
  .map(([file, picture]) => ({ name: file.slice(PHOTOS_DIR.length), picture }))
  .toSorted((a, b) => b.name.localeCompare(a.name))
  .map(({ name, picture }) => ({
    src: picture.img.src,
    width: picture.img.w,
    height: picture.img.h,
    sources: picture.sources,
    alt: name,
  }));
