import { preinit } from "react-dom";

// CSS компонента внутри контент-страницы иначе не попадает в пререндеренный <head>: страница — ленивый чанк.
// <link precedence> React поднимает в <head> при пререндере; preinit на клиенте начинает загрузку
// вместе с чанком, иначе React приостанавливает рендер на ссылке и придерживает показ на ~300 мс
export const stylesheet = (href: string) => {
  if (typeof window !== "undefined") preinit(href, { as: "style", precedence: "default" });
  return <link rel="stylesheet" href={href} precedence="default" />;
};
