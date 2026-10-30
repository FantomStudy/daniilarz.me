import type { FileRoutesByTo } from "@/routeTree.gen";
import { Link as RouterLink } from "@tanstack/react-router";

interface LinkProps extends React.ComponentProps<"a"> {
  href: keyof FileRoutesByTo | (string & {});
}

export function Link({ href, ...props }: LinkProps) {
  if (href.startsWith("/")) {
    return <RouterLink to={href} {...props} />;
  }

  if (/^https?:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />;
  }

  return <a href={href} {...props} />;
}
