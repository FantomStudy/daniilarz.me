import type { KeyboardEvent, Ref } from "react";
import type { Photo } from "./photos";
import { clsx } from "clsx";
import { useState } from "react";
import { preload } from "react-dom";
import { PHOTOS } from "./photos";
import styles from "./Lightbox.module.css";

const getSizes = (photo: Photo) => `min(100vw, ${Math.ceil((photo.width / photo.height) * 100)}vh)`;

export const preloadPhoto = (photo: Photo) => {
  preload(photo.src, {
    as: "image",
    type: "image/avif",
    imageSrcSet: photo.sources.avif,
    imageSizes: getSizes(photo),
  });
};

interface LightboxImageProps {
  photo: Photo;
}

const LightboxImage = ({ photo }: LightboxImageProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <picture className={styles.picture}>
      {Object.entries(photo.sources).map(([format, srcSet]) => (
        <source key={format} type={`image/${format}`} srcSet={srcSet} sizes={getSizes(photo)} />
      ))}
      <img
        ref={(img) => {
          if (img?.complete) setLoaded(true);
        }}
        className={clsx(styles.image, loaded && styles.loaded)}
        src={photo.src}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </picture>
  );
};

interface LightboxProps {
  ref: Ref<HTMLDialogElement>;
  index: number | null;
  onNavigate: (step: number) => void;
  onClose: () => void;
}

export const Lightbox = ({ ref, index, onNavigate, onClose }: LightboxProps) => {
  const photo = index === null ? null : PHOTOS[index];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") onNavigate(-1);
    if (event.key === "ArrowRight") onNavigate(1);
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={photo?.alt}
      onKeyDown={handleKeyDown}
      onClick={onClose}
    >
      {photo && <LightboxImage key={photo.src} photo={photo} />}
    </dialog>
  );
};
