import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "@/components/PageWrapper";
import { getContent, getMeta } from "@/lib/content";

export const Route = createFileRoute("/$")({
  loader: ({ params }) => getMeta(params._splat ?? ""),
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
  const Content = getContent(_splat ?? "");

  return (
    <PageWrapper frontmatter={frontmatter}>
      <Content />
    </PageWrapper>
  );
}
