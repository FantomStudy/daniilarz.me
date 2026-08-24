import { createRouter } from "@tanstack/react-router";
import Content, { frontmatter } from "@/content/_404.md";
import { PageWrapper } from "./components/PageWrapper";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultNotFoundComponent: () => (
      <PageWrapper frontmatter={frontmatter}>
        <Content />
      </PageWrapper>
    ),
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
