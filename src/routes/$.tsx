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
      {/* CSS чанка страницы известен только серверу: на клиенте его подключает сам Vite при загрузке чанка */}
      {page.css.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      {/* oxlint-disable-next-line react/static-components - Content is a stable reference from the pages Map, not created on each render */}
      <Content />
    </PageWrapper>
  );
}
