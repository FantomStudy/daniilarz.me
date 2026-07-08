import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/lib/theme";
import "temporal-polyfill/global";
import "@/styles/reset.css";
import "@/styles/index.css";
import "@/styles/markdown.css";

const THEME_INIT_SCRIPT =
  '(function () {const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;const setting = localStorage.getItem("color-scheme") || "auto";if (setting === "dark" || (prefersDark && setting !== "light"))document.documentElement.classList.toggle("dark", true);})();';

const RootDocument = ({ children }: { children: React.ReactNode }) => {
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
};

const RootComponent = () => {
  return (
    <RootDocument>
      <ThemeProvider>
        <Header />
        <main className="main">
          <Outlet />
        </main>
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
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ],
  }),
  component: RootComponent,
});
