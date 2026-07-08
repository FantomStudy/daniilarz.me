# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## File Search

For any file search or grep in the current git-indexed directory, use fff tools.

## Project

Daniil Arz's personal portfolio/blog site — a TanStack Start (React 19, SSR) app that renders MDX content pages (blog posts, project pages, an "about" page, etc.) through a shared layout.

## Commands

Package manager is `bun` (see `bun.lock`).

- `bun run dev` — start the Vite dev server (TanStack Start plugin handles SSR).
- `bun run build` — type-check via `tsc -b` (project references across [tsconfig.app.json](tsconfig.app.json) / [tsconfig.node.json](tsconfig.node.json)), then `vite build`.
- `bun run preview` — preview the production build.
- `bun run lint` — `oxlint --fix`, configured in [oxlint.config.ts](oxlint.config.ts) (type-aware rules enabled via `oxlint-tsgolint`).
- `bun run fmt` — `oxfmt`, configured in [oxfmt.config.ts](oxfmt.config.ts) (enforces import-group ordering, no blank lines between groups).

There is no test suite/runner configured in this repo.

To type-check a single file without a full build, use `tsc --noEmit -p tsconfig.app.json` (or `tsconfig.node.json` for `vite.config.ts`).

## Architecture

**Routing is file-based via TanStack Router**, generated into [src/routeTree.gen.ts](src/routeTree.gen.ts) — never edit that file by hand; it's regenerated from files under `src/routes/` on dev/build. [src/routes/__root.tsx](src/routes/__root.tsx) defines the document shell (`<html>`, theme-init script, `<Header>`, `<main>` outlet).

**Every content page is served by a single catch-all route, not one file per page.** [src/routes/$.tsx](src/routes/$.tsx) is a TanStack Router splat route (param `_splat`) that matches every path, including `/` itself (`_splat` is `""` at the root — there's deliberately no separate `index.tsx`). It resolves the URL against `content/**/*.mdx` via `import.meta.glob` in [src/lib/content.tsx](src/lib/content.tsx) — `content/use.mdx` ⇒ `/use`, `content/blog/foo.mdx` ⇒ `/blog/foo`, `content/index.mdx` ⇒ `/`. **Adding a page is just dropping a new `.mdx` file under `content/`** — no new route file, no manual route registration. Unmatched paths call `notFound()` from the route `loader`.

**Content lives outside `src/`, in `content/*.mdx`.** Each MDX file exports `frontmatter` (typed by [src/types/frontmatter.ts](src/types/frontmatter.ts): `title`, `subtitle`, `date`, `duration`, `wrapperClass`) via `remark-frontmatter` + `remark-mdx-frontmatter` (wired in [vite.config.ts](vite.config.ts)). MDX files are compiled by `@mdx-js/rollup` and processed as JSX by `@vitejs/plugin-react`. The `mdx.d.ts` ambient declaration is what gives `import { frontmatter } from "*.mdx"` its type. `tsconfig.app.json` includes the whole `content` directory — new content files are picked up automatically, nothing to add.

**`src/lib/content.tsx` only resolves content — it doesn't render or lay out anything.** It exports `loadContentPage(slug)` (async; throws `notFound()` if the slug has no matching file, otherwise returns `{ frontmatter }`) and `getContentComponent(slug)` (a plain sync lookup returning the resolved MDX component, or `null`). The route itself ([src/routes/$.tsx](src/routes/$.tsx)) owns the actual page composition — it wraps the resolved component in `<PageWrapper frontmatter={frontmatter}>` ([src/components/PageWrapper](src/components/PageWrapper)). Keep it that way: layout/wrapper JSX belongs in the route, not in the content-resolution helper. `PageWrapper` renders the title/date/duration/subtitle header, the article body, and (on non-root pages) a `cd ..` back-link styled like a terminal prompt; there's no per-page opt-out of it, only `frontmatter.wrapperClass` as an extra class on the header block.

**Content is code-split per page** — `import.meta.glob("/content/**/*.mdx")` in `content.tsx` is used *without* `eager: true`, so each `.mdx` file becomes its own lazily-loaded chunk instead of bloating the main client bundle (verified: `use.mdx`'s text is absent from the main bundle and only appears in its own `use-*.js` chunk). This is why loading a content page is a two-step handoff instead of one lookup, and deliberately does *not* use `React.lazy`/`Suspense`:

1. The route `loader` calls `loadContentPage(slug)`, which `await`s the dynamic import, stashes the resolved component in a module-level `Map` (`resolvedComponents`) keyed by slug, and returns only `{ frontmatter }` to the router — a plain serializable object. Returning the component itself from the loader is required to be avoided: TanStack Start serializes loader data (via `seroval`) to hydrate the client, and a React component function is not serializable (returning the whole module broke prerendering the first time this was tried).
2. The route `component` calls `getContentComponent(slug)`, a synchronous `Map.get`. This is safe *only* because TanStack Router guarantees the `loader` fully resolves before `component` ever renders for that match — by the time the lookup runs, step 1 has already populated the map. No `React.lazy`, no `Suspense`, no `useMemo`: there was an earlier version using `React.lazy` + a `useMemo`-memoized wrapper, but that made correctness (avoiding remounts) depend on `useMemo`'s cache, which React does not guarantee to preserve — a real footgun. The `Map` bridge sidesteps that entirely because the component reference it returns never changes across renders.

Do not "simplify" this back to a single eager lookup (reintroduces the bundle-size regression) or reintroduce `React.lazy`/`Suspense` (unnecessary — the loader/component handoff already guarantees the data is ready).

**Theming**: [src/lib/theme.tsx](src/lib/theme.tsx) provides a `ThemeProvider`/`useTheme` pair supporting `light` / `dark` / `auto`, persisted to `localStorage` under `color-scheme`. Dark mode is applied by toggling a `dark` class on `<html>`. To avoid a flash of incorrect theme on load, `__root.tsx` inlines a small blocking `THEME_INIT_SCRIPT` in `<head>` that reads `localStorage` and sets the class before hydration — keep that script and the `ThemeProvider` logic in sync if you change how theme is stored/resolved. Theme toggling uses the View Transitions API (circular reveal from the click point) when available and not blocked by `prefers-reduced-motion`.

**Styling**: CSS Modules per component (`Component.module.css` next to `Component.tsx`), plus global styles in [src/styles/](src/styles) (`reset.css`, `index.css` for design tokens/utilities, `markdown.css` for MDX/prose content). Design tokens are CSS custom properties on `:root` (e.g. `--fg`, `--bg`, `--font-mono`) redefined under `html.dark`. Global utility classes exist for responsive/theme visibility (`.mobile-only`, `.mobile-hidden`, `.light-only`, `.dark-only`) rather than a utility framework — prefer reusing these over inventing new ones.

**Icons** come from Iconify via `unplugin-icons`, imported as `~icons/<collection>/<name>` (e.g. `~icons/ri/moon-line`), configured to compile to React JSX with a default `icon` class ([vite.config.ts](vite.config.ts)).

**Component export convention**: each component directory has an `index.ts` that does `export * from "./ComponentName"` — import from the directory (`@/components/Header`), not the file directly. The `@/*` path alias maps to `src/*`.

**Path/module conventions to preserve**: `verbatimModuleSyntax` is on in both tsconfigs — always use `import type` for type-only imports (oxfmt's import sorter also separates type imports into their own group first). `noUnusedLocals`/`noUnusedParameters`/`erasableSyntaxOnly` are enforced — don't leave dead code or rely on TS-only runtime constructs (enums, parameter properties, etc.).

**Dates**: use the `Temporal` API (via `temporal-polyfill/global`, imported once in `__root.tsx`) rather than `Date` — see [src/lib/formatDate.ts](src/lib/formatDate.ts) for the existing `Temporal.PlainDate` pattern.
