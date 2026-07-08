import Content from "/content/404.md";
import { createRouter } from "@tanstack/react-router";
import { PageWrapper } from "./components/PageWrapper";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultNotFoundComponent: () => (
      <PageWrapper>
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
