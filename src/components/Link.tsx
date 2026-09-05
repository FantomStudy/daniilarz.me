import type { PagePath } from "@/lib/content/content.gen";
import { Link as RouterLink } from "@tanstack/react-router";

interface LinkProps extends React.ComponentProps<"a"> {
  href: PagePath | (string & {});
}

export function Link({ href, ...props }: LinkProps) {
  if (href.startsWith("/")) {
    return <RouterLink to="/$" params={{ _splat: href.slice(1) }} {...props} />;
  }

  if (/^https?:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />;
  }

  return <a href={href} {...props} />;
}
