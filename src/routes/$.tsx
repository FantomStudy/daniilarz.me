import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "@/components/PageWrapper";
import { getPageComponent, loadPage } from "@/lib/content/loader";

export const Route = createFileRoute("/$")({
  loader: ({ params }) => loadPage(params._splat ?? ""),
  head: ({ loaderData }) => ({
    meta: [
      ...(loaderData?.frontmatter?.title ? [{ title: loaderData.frontmatter.title }] : []),
      ...(loaderData?.frontmatter?.description
        ? [{ name: "description", content: loaderData.frontmatter.description }]
        : []),
    ],
  }),
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
