import { clsx } from "clsx";
import { useRef, useState } from "react";
import styles from "./PhotoGallery.module.css";

export interface Photo {
  src: string;
  alt: string;
  /** Полноразмерный вариант, если превью и оригинал - разные файлы. */
  full?: string;
  width?: number;
  height?: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  className?: string;
}

export const PhotoGallery = ({ photos, className }: PhotoGalleryProps) => {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = (index: number) => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    setActive(index);
    dialog.showModal();
  };

  // У картинки из кэша load уже не выстрелит, поэтому готовность проверяем ещё и
  // на монтировании: без data-ready она так и осталась бы прозрачной.
  const markReady = (image: HTMLImageElement | null) => {
    if (image?.complete) image.dataset.ready = "";
  };

  const activePhoto = active === null ? null : photos[active];

  return (
    <>
      <div className={clsx(styles.gallery, className)}>
        {photos.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            title={photo.alt}
            className={styles.item}
            onClick={() => open(index)}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {/* Закрытие целиком на платформе: Esc и close() снимают [open], дальше
          дело за transition с allow-discrete. */}
      <dialog ref={dialogRef} className={styles.viewer} onClick={() => dialogRef.current?.close()}>
        {activePhoto && (
          <img
            key={activePhoto.src}
            ref={markReady}
            className={styles.viewerImage}
            src={activePhoto.full ?? activePhoto.src}
            alt={activePhoto.alt}
            onLoad={(event) => {
              event.currentTarget.dataset.ready = "";
            }}
          />
        )}
      </dialog>
    </>
  );
};
