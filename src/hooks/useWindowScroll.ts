import { useEffect, useState } from "react";

export interface ScrollPosition {
  x: number;
  y: number;
}

function scrollTo({ x, y, behavior = "smooth" }: Partial<ScrollPosition & ScrollOptions>) {
  const scrollOptions: ScrollToOptions = { behavior };

  if (typeof x === "number") scrollOptions.left = x;
  if (typeof y === "number") scrollOptions.top = y;

  window.scrollTo(scrollOptions);
}

export const useWindowScroll = () => {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    return { x: window.scrollX, y: window.scrollY };
  });

  useEffect(() => {
    const onChange = () => setValue({ x: window.scrollX, y: window.scrollY });

    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);

    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return { value, scrollTo };
};
