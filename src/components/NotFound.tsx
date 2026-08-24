import { lazyRouteComponent } from "@tanstack/react-router";
import { PageWrapper } from "./PageWrapper";

const Content = lazyRouteComponent(() => import("@/content/_404.md"));

export function NotFound() {
  return (
    <PageWrapper frontmatter={{ title: "404" }}>
      <Content />
    </PageWrapper>
  );
}
