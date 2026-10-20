import type { Picture } from "vite-imagetools";

export interface Photo {
  src: string;
  width: number;
  height: number;
  sources: Record<string, string>;
  placeholder: string;
  alt: string;
}

const PHOTOS_DIR = "/src/assets/photos/";

const pictures = import.meta.glob<Picture>("/src/assets/photos/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: { w: "480;960;1440;2048", format: "webp", quality: "70", as: "picture" },
});

const placeholders = import.meta.glob<string>("/src/assets/photos/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: { w: "1", format: "webp", inline: "" },
});

export const PHOTOS: Photo[] = Object.entries(pictures)
  .map(([file, picture]) => ({ file, picture }))
  .toSorted((a, b) => b.file.localeCompare(a.file))
  .map(({ file, picture }) => ({
    src: picture.img.src,
    width: picture.img.w,
    height: picture.img.h,
    sources: picture.sources,
    placeholder: placeholders[file],
    alt: file.slice(PHOTOS_DIR.length),
  }));
