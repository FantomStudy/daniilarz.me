import { useRef, useState } from "react";
import { stylesheet } from "@/lib/stylesheet";
import { Lightbox, preloadPhoto } from "./Lightbox";
import { PHOTOS } from "./photos";
import stylesHref from "./Gallery.css?url";

const STYLESHEET = stylesheet(stylesHref);

const SIZES = "(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";

export const Gallery = () => {
  const [active, setActive] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const open = (index: number) => {
    setActive(index);
    dialog.current?.showModal();
  };

  const close = () => dialog.current?.close();

  const navigate = (step: number) => {
    if (active === null) return;
    const next = (active + step + PHOTOS.length) % PHOTOS.length;
    setActive(next);
    preloadPhoto(PHOTOS[(next + step + PHOTOS.length) % PHOTOS.length]);
  };

  return (
    <div className="gallery">
      {STYLESHEET}
      <ul className="grid">
        {PHOTOS.map((photo, index) => (
          <li key={photo.src} className="item">
            <button
              type="button"
              aria-label={`Открыть ${photo.alt}`}
              className="open"
              onClick={() => open(index)}
              onPointerEnter={() => preloadPhoto(photo)}
              onFocus={() => preloadPhoto(photo)}
            >
              <picture className="picture">
                {Object.entries(photo.sources).map(([format, srcSet]) => (
                  <source key={format} type={`image/${format}`} srcSet={srcSet} sizes={SIZES} />
                ))}
                <img
                  className="image"
                  style={{ backgroundImage: `url(${photo.placeholder})` }}
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  decoding="async"
                  loading="lazy"
                />
              </picture>
            </button>
          </li>
        ))}
      </ul>

      <Lightbox ref={dialog} index={active} onNavigate={navigate} onClose={close} />
    </div>
  );
};
