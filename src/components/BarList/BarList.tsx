import type { Picture } from "vite-imagetools";
import { DRINKS } from "./drinks";
import styles from "./BarList.module.css";

const pictures = import.meta.glob<Picture>("/src/assets/bar/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: { w: "112;224;960", format: "webp", quality: "75", as: "picture" },
});

const SIZES = "(max-width: 500px) calc(100vw - 56px), 112px";

export const BarList = () => {
  return (
    <div className={styles.list}>
      {DRINKS.map((drink, index) => {
        const photo = pictures[drink.photo];
        const isFirst = index === 0;
        return (
          <article key={drink.name} className={styles.drink}>
            <div className={styles.photo}>
              <img
                src={photo.img.src}
                srcSet={photo.sources.webp}
                sizes={SIZES}
                alt={drink.name}
                loading={isFirst ? "eager" : "lazy"}
                fetchPriority={isFirst ? "high" : "auto"}
                decoding="async"
                width={photo.img.w}
                height={photo.img.h}
              />
            </div>
            <div className={styles.info}>
              <p className={styles.name}>{drink.name}</p>
              <p className={styles.description}>{drink.description}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
};
