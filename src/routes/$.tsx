import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "@/components/PageWrapper";
import { getPageComponent, loadPage } from "@/lib/content/pages";
import { ogMeta } from "@/lib/og";

export const Route = createFileRoute("/$")({
  loader: ({ params }) => loadPage(params._splat ?? ""),
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const { path, title, description } = loaderData;

    return {
      meta: [
        { title: path === "/" ? title : `${title} - Daniil Arz` },
        ...(description ? [{ name: "description", content: description }] : []),
        ...ogMeta(path, title, description),
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const page = Route.useLoaderData();
  const Content = getPageComponent(page.path);

  return (
    <PageWrapper frontmatter={page}>
      {/* oxlint-disable-next-line react/static-components - Content is a stable reference from the pages Map, not created on each render */}
      <Content />
    </PageWrapper>
  );
}
