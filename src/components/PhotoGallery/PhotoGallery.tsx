import { clsx } from "clsx";
import { useRef, useState } from "react";
import styles from "./PhotoGallery.module.css";

const photos = Object.values(
  import.meta.glob<string>("@/assets/photos/*.{jpg,webp,avif,svg}", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

export const PhotoGallery = () => {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = (index: number) => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    setActive(index);
    dialog.showModal();
  };

  const shift = (delta: number) => {
    setActive((current) =>
      current === null ? current : (current + delta + photos.length) % photos.length,
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    shift(event.key === "ArrowLeft" ? -1 : 1);
  };

  const markReady = (image: HTMLImageElement | null) => {
    if (image?.complete) image.dataset.ready = "";
  };

  const activePhoto = active === null ? null : photos[active];

  return (
    <>
      <div className={clsx(styles.gallery)}>
        {photos.map((photo, index) => (
          <button key={photo} type="button" className={styles.item} onClick={() => open(index)}>
            <img src={photo} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.viewer}
        onKeyDown={handleKeyDown}
        onClick={() => dialogRef.current?.close()}
      >
        {activePhoto && (
          <img
            key={activePhoto}
            ref={markReady}
            className={styles.viewerImage}
            src={activePhoto}
            onLoad={(event) => {
              event.currentTarget.dataset.ready = "";
            }}
          />
        )}
      </dialog>
    </>
  );
};
