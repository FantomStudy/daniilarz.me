import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "@/components/PageWrapper";
import { getPageComponent, loadPage } from "@/lib/content/loader";
import { splatToPagePath } from "@/lib/content/path";
import { ogMeta } from "@/lib/og";

export const Route = createFileRoute("/$")({
  loader: ({ params }) => loadPage(params._splat ?? ""),
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};

    const path = splatToPagePath(params._splat ?? "");
    const { title, description } = loaderData.frontmatter;

    return {
      meta: [
        { title },
        ...(description ? [{ name: "description", content: description }] : []),
        ...ogMeta(path, title, description),
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { _splat } = Route.useParams();
  const { frontmatter } = Route.useLoaderData();
  const Content = getPageComponent(_splat ?? "");

  return (
    <PageWrapper frontmatter={frontmatter}>
      {/* oxlint-disable-next-line react/static-components - Content is a stable reference from the manifest Map, not created on each render */}
      <Content />
    </PageWrapper>
  );
}
