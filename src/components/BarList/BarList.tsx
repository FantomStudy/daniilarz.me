import type { Picture } from "vite-imagetools";
import styles from "./BarList.module.css";

const pictures = import.meta.glob<Picture>("/src/assets/bar/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: { w: "112;224", format: "webp", quality: "75", as: "picture" },
});

const SIZES = "(max-width: 500px) calc(100vw - 56px), 112px";

interface Drink {
  name: string;
  description: string;
  photo: string;
}

const DRINKS: Drink[] = [
  {
    name: "Monster Ultra Black",
    description:
      "Сладкая вишня, без химозного ароматизатора. Идеальный ягодный вкус (по моему мнению)",
    photo: "/src/assets/bar/20261030_144607.jpg",
  },
  {
    name: "Monster Ultra Fantasy Ruby Red",
    description:
      "Грейпфрут в своём необычном проявлении - без ассоциируемой горечи. Кисло-сладкий с приятной шипучестью, игривый и цитрусовый",
    photo: "/src/assets/bar/20260504_195458.jpg",
  },
  {
    name: 'Monster Ultra Zero Ultra "White Monster"',
    description:
      "Сладковатый вкус с небольшой кислинкой. Ненавязчивый, легкий и свежий. Особенно приятно было пить его в жару, летом... По-своему особенный и запоминающийся. Временами брал его чаще остальных",
    photo: "/src/assets/bar/20260816_161708.jpg",
  },
  {
    name: "Monster Juiced Aussie Lemonade",
    description:
      "Непривычный для меня, яркий лимонный вкус. Не ожидал от него чего-то удивительного, но есть в нем что-то цепляющее",
    photo: "/src/assets/bar/20260923_210000.jpg",
  },
  {
    name: "Monster Full Throttle Zero Sugar",
    description:
      "Насыщенный соковый вкус нектарина. Хороший вкус. Когда-то любил подобное пить, но почему-то не беру его. Правда не знаю почему ",
    photo: "/src/assets/bar/20260818_211006.jpg",
  },
  {
    name: "Monster Nitro Cosmic Peach",
    description: "Кислый и персиковый. Слабо газирован, мягкий и очень вкусный",
    photo: "/src/assets/bar/20261012_191652.jpg",
  },
];

export const BarList = () => {
  return (
    <div className={styles.list}>
      {DRINKS.map((drink) => {
        const photo = pictures[drink.photo];
        return (
          <article key={drink.name} className={styles.drink}>
            <div className={styles.photo}>
              <img
                src={photo.img.src}
                srcSet={photo.sources.webp}
                sizes={SIZES}
                alt={drink.name}
                loading="lazy"
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
