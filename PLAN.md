# Performance: self-hosted fonts + deferred DotsArt animation

## Context

Site should feel "почти мгновенным". Investigation found two concrete, high-leverage offenders, and ruled out a third suspect:

- **Fonts** ([__root.tsx:63-77](src/routes/__root.tsx#L63-L77)) load from Google's CDN via an external `<link rel="stylesheet">`. That's 2+ extra network round-trips (fonts.googleapis.com CSS, then fonts.gstatic.com file) even with the existing `preconnect`s, and the URL requests the _entire_ Inter weight axis (100–900, both styles) plus 6 DM Mono weight/style combos. Grepping actual usage across `src/styles/markdown.css`, `src/styles/index.css`, and `src/components/PageWrapper/PageWrapper.module.css` shows only **Inter 400/500/600/700 normal + 400 italic**, and **DM Mono 400/500 normal only** (no mono italic, no 300 weight) are ever referenced. No local font files or `@font-face` exist anywhere in the repo yet — this is a clean addition, not a migration.
- **DotsArt** ([DotsArt.tsx](src/components/DotsArt/DotsArt.tsx)) statically imports `pixi.js` + `simplex-noise` into the root route ([__root.tsx:3,41](src/routes/__root.tsx#L3)), so both ship in the bundle needed for hydration on _every_ page for a purely decorative background. Its ticker also runs continuously with no `prefers-reduced-motion` check and no pause when the tab is hidden. **Confirmed on the live prod deploy** (`curl` against `daniilarz-me.vercel.app`): the main entry chunk is **629KB raw / ~199KB after Brotli**, and pixi.js internals (`BufferResource`, `CanvasPool`, `Geometry`, `RenderTargetSystem`, `canvasUtils`, `getTextureBatchBindGroup`) are referenced directly from the homepage HTML — i.e. this isn't theoretical, it's really riding along on every page load today. This is now the single biggest lever in this plan.
- **Ruled out**: the theme-toggle View Transition ([theme.tsx](src/lib/theme.tsx)) is already event-driven, one-shot (native `Element.animate`, no RAF loop), and gated behind `prefers-reduced-motion`. The header's scroll-to-top reveal ([Header.module.css](src/components/Header/Header.module.css)) is a native CSS scroll-driven animation. Neither needs work.
- **Ruled out — hosting/caching**: verified directly against the live deploy (`https://daniilarz-me.vercel.app/`). Content-hashed assets already come back `Cache-Control: public, max-age=31536000, immutable` with Brotli (`Content-Encoding: br`) applied automatically, and HTML documents are served from Vercel's edge cache (`X-Vercel-Cache: HIT`, growing `Age`) with revalidation. Whatever Nitro preset is actually in effect on Vercel's build, the platform is already doing the right thing here — no migration and no manual cache-header work needed. (A local `bun run build` reports preset `"node-server"` in `.output/nitro.json`, but that's just the local/default build target, not what's live — don't read anything into it.)

## Work Stream A — Self-host & subset fonts

**Files**: `src/routes/__root.tsx`, `src/styles/index.css` (or a new `src/styles/fonts.css` imported from `__root.tsx`), `package.json`

1. `bun add @fontsource/inter @fontsource/dm-mono` (self-hosted static-weight packages, one file per weight/style — avoids pulling a full variable-font axis we don't need).
2. Import only the weight/style CSS files actually used (confirm exact per-package filenames at implementation time, but the convention is `<weight>.css` / `<weight>-italic.css`):
   - `@fontsource/inter`: `400.css`, `500.css`, `600.css`, `700.css`, `400-italic.css`
   - `@fontsource/dm-mono`: `400.css`, `500.css`
     Put these imports in `__root.tsx` alongside the existing style imports (or a dedicated `fonts.css`), not the Google Fonts link.
3. Remove the Google Fonts `<link rel="stylesheet">` and the two `fonts.googleapis.com`/`fonts.gstatic.com` `preconnect` entries from `__root.tsx`'s `head.links` (lines 63–77) — no longer needed once self-hosted.
4. Add a `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the single most critical file (Inter 400 normal, the body-text weight) so the browser fetches it in parallel with HTML parsing rather than discovering it via CSSOM. Resolve its emitted URL the same way other static assets are referenced in this codebase (e.g. `?url` import) so Vite fingerprints it correctly.
5. Optional polish (not blocking): add fallback-font metric overrides (`size-adjust`/`ascent-override`/`descent-override`, e.g. via `fontaine`) to minimize layout shift during the swap from system fallback to Inter. Call this out as a nice-to-have, not required for this pass.
6. Verify: `bun run build` succeeds; `bun run preview` and check the Network tab shows zero requests to `fonts.googleapis.com`/`fonts.gstatic.com`; visually confirm both themes and a page using code blocks (DM Mono) plus the italic description text (index/about page) render correctly.

## Work Stream B — Defer & gate the DotsArt animation

**Files**: `src/routes/__root.tsx`, `src/components/DotsArt/DotsArt.tsx`

1. Replace the static `import { DotsArt } from "@/components/DotsArt"` in `__root.tsx` with `React.lazy(() => import("@/components/DotsArt"))`, wrapped in `<Suspense fallback={null}>` where it's rendered (line 41). This is plain `React.lazy`, not `lazyRouteComponent` — DotsArt isn't a route, so the router-specific helper used elsewhere (`loader.ts`, `NotFound.tsx`) doesn't apply here.
2. In `DotsArt.tsx`'s `setup()`, before calling `Application.init`, check `window.matchMedia("(prefers-reduced-motion: reduce)").matches`. If true, skip mounting pixi entirely (leave the empty container div, no canvas, no ticker).
3. Add a `visibilitychange` listener (on the existing `AbortController`'s signal) that calls `app.ticker.stop()`/`app.ticker.start()` based on `document.visibilityState`, so the animation stops consuming CPU while the tab is backgrounded.
4. Verify: `bun run build`; confirm `pixi.js`/`simplex-noise` now land in their own async chunk under `.output/public/assets` rather than the main entry chunk; in the browser, confirm the chunk loads after initial paint (Network waterfall); toggle "emulate prefers-reduced-motion: reduce" in devtools and confirm no canvas mounts; switch tabs and confirm the ticker pauses.

## Work Stream C — Speculation Rules for near-instant in-app navigation

**Files**: `src/routes/__root.tsx` (or wherever a small inline script can be injected into `<head>`)

`router.tsx:10` already sets `defaultPreload: "intent"`, so TanStack Router prefetches the target route's JS chunk on hover/touchstart — that part's already optimal. The next step up is the **Speculation Rules API**: a `<script type="speculationrules">` block telling Chrome/Edge to _prerender_ same-origin links (not just fetch their JS) in a hidden tab, so a click can paint an already-fully-rendered page instead of just an already-loaded bundle.

1. Add a `speculationrules` JSON script to the document `<head>` (in `__root.tsx`'s `head()` or `RootDocument`) with a broad same-origin `prerender` rule (e.g. `"eagerness": "moderate"` or `"conservative"`, scoped to same-origin links) — start conservative since prerendering fires the target page's own effects (including a second, wasted mount of the lazy DotsArt background from Work Stream B) if not careful; each prerendered page is disposed if never activated, so this is generally safe but worth watching.
2. No-op / silently ignored in Safari and Firefox — safe to ship unconditionally, no feature detection needed.
3. Verify: DevTools → Application → Speculative Loads (Chrome) shows prerenders firing on hover; clicking a prerendered link shows near-zero navigation time in the Performance panel.

## Explicitly out of scope (flagged, not actioned)

- **`temporal-polyfill` conditional loading** — `tsconfig.app.json` deliberately types against `Temporal` via `lib: ["ESNext.Temporal"]`; both SSR (Node) and client need it, and support is inconsistent enough that conditional-loading needs its own investigation. Low expected payoff, skip for now.
- **Bundle visualizer tooling** — no analyzer currently configured; could add `vite-bundle-visualizer` later to double-check totals after this pass, not required to implement the plan itself.
- **Shiki dual-theme (light+dark) inline styles per code block** — worth a glance once a content-heavy page exists, but current content is small enough that this isn't measurable yet.

## End-to-end verification

- `bun run build` (includes `tsc -b`) passes cleanly.
- `bun run preview`, load the site: no `fonts.googleapis.com`/`fonts.gstatic.com` requests; DotsArt chunk loads deferred, not blocking hydration.
- Devtools: emulate `prefers-reduced-motion: reduce` → no DotsArt canvas mounts. Switch browser tabs → ticker pauses.
- Visual pass in both light and dark themes: body text, headings, italic description, and code blocks (inline + block) all render with the correct self-hosted weights.
- Confirm the main entry chunk shrinks well below the current ~199KB brotli baseline once pixi.js/simplex-noise move to their own async chunk (re-run the same `curl -H "Accept-Encoding: br" -w "%{size_download}"` check against the new build's `index-*.js` to compare against today's measured baseline).
- Speculation Rules: DevTools → Application → Speculative Loads shows same-origin links prerendering on hover.
- Optional directional check: Lighthouse/PageSpeed before vs. after, not a hard gate.
