import { clsx } from "clsx";
import GridIcon from "~icons/ri/layout-grid-line";
import MasonryIcon from "~icons/ri/layout-masonry-line";
import { PHOTOS } from "./photos";
import { useGalleryMode } from "./useGalleryMode";
import styles from "./Gallery.module.css";

const MODE_ICONS = { masonry: MasonryIcon, square: GridIcon };

const EAGER_COUNT = 4;

const ROWS_PER_COLUMN = 40;

const SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

export const Gallery = () => {
  const [mode, setMode] = useGalleryMode("square");
  const ModeIcon = MODE_ICONS[mode];

  return (
    <div className={styles.root} style={{ "--rows-per-column": ROWS_PER_COLUMN }}>
      <button
        type="button"
        title="Сменить вид"
        aria-label="Сменить вид"
        className={styles.modeButton}
        onClick={() => setMode(mode === "masonry" ? "square" : "masonry")}
      >
        <ModeIcon />
      </button>

      <ul className={clsx(styles.grid, styles[mode])}>
        {PHOTOS.map((photo, index) => (
          <li
            key={photo.src}
            className={styles.item}
            style={{
              "--span": Math.round((photo.height / photo.width) * ROWS_PER_COLUMN),
            }}
          >
            <picture className={styles.picture}>
              {Object.entries(photo.sources).map(([format, srcSet]) => (
                <source key={format} type={`image/${format}`} srcSet={srcSet} sizes={SIZES} />
              ))}
              <img
                className={styles.image}
                src={photo.src}
                width={photo.width}
                height={photo.height}
                alt={photo.alt}
                decoding="async"
                loading={index < EAGER_COUNT ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
              />
            </picture>
          </li>
        ))}
      </ul>
    </div>
  );
};
