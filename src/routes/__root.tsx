import { MDXProvider } from "@mdx-js/react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { SpeedInsights } from "@vercel/speed-insights/react";
import interCyrillic from "@/assets/fonts/inter-cyrillic.woff2?url";
import interLatin from "@/assets/fonts/inter-latin.woff2?url";
import { DotsArt } from "@/components/DotsArt";
import { Header } from "@/components/Header";
import { Link } from "@/components/Link";
import { ThemeProvider } from "@/lib/theme";
import "@/styles/reset.css";
import "@/styles/fonts.css";
import "@/styles/index.css";
import "@/styles/markdown.css";

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
      {
        name: "description",
        content: "Небольшой сайт, где я пишу о коде, прогулках и напитках",
      },
      {
        property: "og:site_name",
        content: "Daniil Arz",
      },
      {
        property: "og:locale",
        content: "ru_RU",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/logo.svg",
        type: "image/svg+xml",
      },
      {
        rel: "preload",
        href: interLatin,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: interCyrillic,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootComponent,
});

const THEME_INIT_SCRIPT =
  '(function () {const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;const setting = localStorage.getItem("color-scheme") || "auto";if (setting === "dark" || (prefersDark && setting !== "light"))document.documentElement.classList.toggle("dark", true);})();';

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
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
}

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider>
        <MDXProvider components={{ a: Link }}>
          <Header />
          <main className="main">
            <Outlet />
          </main>
          <DotsArt />
          <SpeedInsights />
        </MDXProvider>
      </ThemeProvider>
    </RootDocument>
  );
}
