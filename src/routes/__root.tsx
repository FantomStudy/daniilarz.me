import { MDXProvider } from "@mdx-js/react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import interLatin from "@/assets/fonts/inter-latin.woff2?url";
import { DotsArt } from "@/components/DotsArt";
import { Header } from "@/components/Header";
import { Link } from "@/components/Link";
import { ThemeProvider } from "@/lib/theme";
import "@/styles/reset.css";
import "@/styles/fonts.css";
import "@/styles/index.css";
import "@/styles/markdown.css";

const THEME_INIT_SCRIPT =
  '(function () {const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;const setting = localStorage.getItem("color-scheme") || "auto";if (setting === "dark" || (prefersDark && setting !== "light"))document.documentElement.classList.toggle("dark", true);})();';

const mdxComponents = { a: Link };

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
};

const RootComponent = () => {
  return (
    <RootDocument>
      <ThemeProvider>
        <MDXProvider components={mdxComponents}>
          <Header />
          <main className="main">
            <Outlet />
          </main>
          <DotsArt />
        </MDXProvider>
      </ThemeProvider>
    </RootDocument>
  );
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
      {
        title: "Daniil Arz",
      },
      { name: "description", content: "Welcome to my portfolio!" },
    ],
    links: [
      {
        rel: "preload",
        href: interLatin,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootComponent,
});
