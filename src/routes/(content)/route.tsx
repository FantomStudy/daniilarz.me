import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { PageWrapper } from "@/components/PageWrapper";

export const Route = createFileRoute("/(content)")({
  component: ContentLayout,
});

function ContentLayout() {
  const page = useChildMatches({ select: (matches) => matches[0]?.staticData.page });
  if (!page) return <Outlet />;

  return (
    <PageWrapper frontmatter={page}>
      <Outlet />
    </PageWrapper>
  );
}
