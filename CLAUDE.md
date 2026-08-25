# Daniil Arz's portfolio

Daniil Arz's portfolio is a TanStack Start (React 19, SSR) app built around file-based content. Pages are added by dropping `.md` or `.mdx` files into `src/content/`, then routed, rendered through a shared layout, and prerendered automatically at build time.

## What can't be compromised

- **Blazing-fast is measured, not assumed.** The site should feel fast everywhere, not just on a powerful desktop. Ship what measurements actually show — Lighthouse on mobile with throttling, across several runs — even when they contradict bundle-size intuition. DotsArt's statically imported `pixi.js` is the clearest example: the "obviously worse" larger bundle measured better TBT and a more stable Lighthouse score than the smaller, lazy-loaded version.

- **One source of truth per fact.** File↔URL mapping is defined by one function ([path.ts](src/lib/content/path.ts)) and shared by every part of the system that needs it, including the build-time Vite plugin and the runtime manifest. Don't maintain parallel lists or duplicate logic that can drift apart.

- **Decorative work yields to the visitor.** `DotsArt` skips its WebGL/rAF work under `prefers-reduced-motion` and pauses when the tab is backgrounded — decoration must not cost users who didn't ask for it or aren't looking.

- **No content page is invisible to the prerenderer.** Every file under `src/content/` prerenders whether anything links to it yet or not — an unlinked page silently missing prerendering is a bug, not an edge case.

- **Prefer modern platform APIs.** Use modern web platform APIs when they are a good fit instead of reaching for older patterns or unnecessary abstractions — for example, the View Transitions API and Temporal API.

## The ways to hurt yourself

Each of these has happened before and was diagnosed and reverted.

- **Lazy-loading DotsArt's `pixi.js` import.** It looks like a bundle-size win, but measured worse TBT and a less stable Lighthouse score. Don't split it again on chunk-size grounds without measuring the actual impact.

- **Adding `eager: true` to either glob in [manifest.ts](src/lib/content/manifest.ts).** This silently kills per-page code-splitting. When it happens, `bun run build` prints `[INEFFECTIVE_DYNAMIC_IMPORT]` for each content file.

- **Skipping `page.Component.preload?.()` in `loadPage`.** Client-side navigation renders an empty `<main>` while the page chunk loads, with no visible error.

- **Treating every non-`/` `href` as an external link in [Link](src/components/Link.tsx).** This opens `mailto:` and `#` links in a blank tab.

- **Letting `fonts.css`'s relative `url()` and `__root.tsx`'s `?url` import resolve to different emitted files.** Vite emits the font twice, and the preload warms a URL the CSS never requests — costing 48 KB instead of saving it.

## Commands

Package manager is `bun`; the scripts themselves are in [package.json](package.json) (`dev`, `build`, `preview`, `lint` → `oxlint --fix`, `fmt` → `oxfmt`).

There is no test suite or runner in this repo — `bun run build` (which runs `tsc -b` first) is the only gate. To type-check without a full build: `tsc --noEmit -p tsconfig.app.json` for app code, or `-p tsconfig.node.json` for `vite.config.ts`, `vite/`, and `scripts/`.

## Taste

- Components are arrow-function expressions (`export const Foo = (...) => {...}`), not `function Foo()` declarations.
- Props are typed via a named `interface FooProps` declared above the component, not inline in the destructure.
- `clsx` for conditional/combined `className`s, not manual template-string concatenation.
- Comments are rare (see the root-level default: only when the _why_ is non-obvious) — and when one is warranted, it's written in Russian, matching the existing convention in e.g. [DotsArt.tsx](src/components/DotsArt/DotsArt.tsx). Identifiers, docs, and this file stay English; match whichever language a given file's existing comments already use rather than defaulting to English.

## Where code lives

- [src/routes/](src/routes/) — file-based routes; `$.tsx` is the one content route, `__root.tsx` the document shell. Generated `routeTree.gen.ts` lives here too — never hand-edit it.
- [src/content/](src/content/) — every `.md`/`.mdx` page; a file's path is its URL.
- [src/lib/content/](src/lib/content/) — resolves content → route data (`path.ts`, `paths.gen.ts`, `manifest.ts`, `loader.ts`); no rendering or layout.
- [src/components/](src/components/) — one directory per component (`Component.tsx` + `Component.module.css` + `index.ts`); [Link.tsx](src/components/Link.tsx)/[NotFound.tsx](src/components/NotFound.tsx) are flat exceptions.
- [src/styles/](src/styles/) — global CSS (`reset`, `fonts`, `index`, `markdown`), imported once from `__root.tsx`.
- [src/assets/fonts/](src/assets/fonts/) — self-hosted `.woff2` files, fingerprinted by Vite.
- [vite/](vite/) — build-time Vite plugins (`content-paths.ts`).
- [scripts/](scripts/) — one-off tooling (`font-metrics.ts`).
