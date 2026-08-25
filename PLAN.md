# Performance: self-hosted fonts + deferred DotsArt animation

## Context

Site should feel "почти мгновенным". Investigation found two concrete, high-leverage offenders, and ruled out a third suspect:

- **Fonts** ([__root.tsx:63-77](src/routes/__root.tsx#L63-L77)) load from Google's CDN via an external `<link rel="stylesheet">`. That's 2+ extra network round-trips (fonts.googleapis.com CSS, then fonts.gstatic.com file) even with the existing `preconnect`s, and the URL requests the _entire_ Inter weight axis (100–900, both styles) plus 6 DM Mono weight/style combos. Grepping actual usage across `src/styles/markdown.css`, `src/styles/index.css`, and `src/components/PageWrapper/PageWrapper.module.css` shows only **Inter 400/500/600/700 normal + 400 italic**, and **DM Mono 400/500 normal only** (no mono italic, no 300 weight) are ever referenced. No local font files or `@font-face` exist anywhere in the repo yet — this is a clean addition, not a migration.
- **DotsArt** ([DotsArt.tsx](src/components/DotsArt/DotsArt.tsx)) statically imports `pixi.js` + `simplex-noise` into the root route ([__root.tsx:3,41](src/routes/__root.tsx#L3)), so both ship in the bundle needed for hydration on _every_ page for a purely decorative background. Its ticker also runs continuously with no `prefers-reduced-motion` check and no pause when the tab is hidden. **Confirmed on the live prod deploy** (`curl` against `daniilarz-me.vercel.app`): the main entry chunk is **629KB raw / ~199KB after Brotli**, and pixi.js internals (`BufferResource`, `CanvasPool`, `Geometry`, `RenderTargetSystem`, `canvasUtils`, `getTextureBatchBindGroup`) are referenced directly from the homepage HTML — i.e. this isn't theoretical, it's really riding along on every page load today. This is now the single biggest lever in this plan.
- **Ruled out**: the theme-toggle View Transition ([theme.tsx](src/lib/theme.tsx)) is already event-driven, one-shot (native `Element.animate`, no RAF loop), and gated behind `prefers-reduced-motion`. The header's scroll-to-top reveal ([Header.module.css](src/components/Header/Header.module.css)) is a native CSS scroll-driven animation. Neither needs work.

## Work Stream A — Self-hosted, axis-trimmed fonts with a metric-matched fallback

**Files**: `src/assets/fonts/*.woff2` (new), `src/styles/fonts.css` (new), `src/styles/index.css`, `src/routes/__root.tsx`

Measured, not estimated — Google instances the variable file per requested axes, so these are the bytes actually served:

| file                                                                | bytes                                        |
| ------------------------------------------------------------------- | -------------------------------------------- |
| Inter latin var, `opsz`+`wght` — what the current `<link>` requests | 72,920                                       |
| Inter latin var, `wght` only                                        | 48,256                                       |
| Inter latin var, `wght@400..700`                                    | 48,256 (narrowing the range changes nothing) |
| Inter latin italic var                                              | 51,832                                       |
| Inter latin italic static 400                                       | 25,040                                       |
| Inter latin static 400                                              | 23,664                                       |
| Inter cyrillic var (measured, not currently shipped — see below)    | 18,748                                       |
| DM Mono 400 / 500, latin                                            | 14,820 / 14,988                              |

Two conclusions drive the shape of this stream. **Variable beats static**: four used weights as static instances run ~95 KB against 48 KB for one variable file. **The `opsz` axis costs 24.7 KB (34%) on the one file in the critical path** — Inter carries an optical-size axis the browser applies automatically via the `font-optical-sizing: auto` default, and nothing in this codebase asks for it.

### Steps

1. Download four woff2 files with the axes already trimmed and commit them to `src/assets/fonts/` — Vite's convention for build-pipeline assets, where they get fingerprinted (`public/` would not):
   - `inter-latin.woff2` — from `family=Inter:wght@100..900`, the `/* latin */` face
   - `inter-latin-italic.woff2` — from `family=Inter:ital,wght@1,400`, the `/* latin */` face
   - `dm-mono-400.woff2` / `dm-mono-500.woff2` — from `family=DM+Mono:wght@400` and `@500`, the `/* latin */` face

   Fetch with a current-Chrome `User-Agent`; without one Google serves legacy TTF instead of woff2. No cyrillic subset — see the deferred note below.

2. Write `src/styles/fonts.css` (imported from `__root.tsx` next to the other global stylesheets) with one `@font-face` per file, each carrying the `unicode-range` Google publishes for that subset, and `font-display: swap` throughout — including DM Mono, see the note below. Reference the files relatively (`url("../assets/fonts/inter-latin.woff2")`) so Vite fingerprints them.

3. Add three fallback `@font-face` rules in the same file, family `"Inter Fallback"`, `src: local("Arial")`, with `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` computed from the two fonts' metrics. Compute once with `scripts/font-metrics.ts` (`bun run scripts/font-metrics.ts`, using `fontkit` + `wawoff2`) and hardcode the numbers with a comment recording where they came from — the metrics are constants, so a build plugin (`fontaine`) would recompute the same value on every build for a dependency's worth of risk. Arial is the target because its metrics are identical on every platform; `system-ui` resolves to a different font per OS, so only one of them could ever be matched accurately. The overrides split by weight — regular (100–500), bold (600–900), italic — because the ratio differs by weight (107.33% regular against 102.02% bold), and one shared value would leave headings shifting. Measured in Chrome on the site's own prose, the overrides hold fallback width within 0.8% of Inter where bare Arial is off by up to 7%.

4. In `src/styles/index.css`:
   - `--font-sans: Inter, "Inter Fallback", Arial, sans-serif` — the long system stack goes, since the whole point of the metric override is knowing which font the fallback actually is.
   - Trim `Liberation Mono, Courier New` off the tail of `--font-mono`; the closing `monospace` already covers them. Keep `ui-monospace` first.
   - Delete `text-rendering: optimizeLegibility` (line 31). It forces kerning and ligature processing on the critical path and does not improve anything Inter doesn't already do by default.
   - Keep `font-synthesis: none`. With a real 400 italic file present, `<strong><em>` renders as italic at normal weight rather than a smeared synthetic bold — a deliberate trade on a rare selector.

5. In `__root.tsx`, remove both `preconnect` links and the Google `<link rel="stylesheet">` (lines 63–77), and add exactly one preload:

   ```tsx
   import interLatin from "@/assets/fonts/inter-latin.woff2?url";
   // …
   { rel: "preload", href: interLatin, as: "font", type: "font/woff2", crossOrigin: "anonymous" }
   ```

   Only `inter-latin.woff2`. Preload ignores `unicode-range` and competes for bandwidth with the JS bundle, so preloading italic, mono, or cyrillic would take bandwidth from the one file that blocks first paint. `crossOrigin` is required even same-origin — without it the browser fetches the file twice.

### Deferred: cyrillic subset

The cyrillic face (`inter-cyrillic.woff2`, 18.7 KB) and its two fallback rules were cut for now — there's no ru content yet, so shipping them would be pure groundwork with nothing to show it works. `unicode-range` means re-adding them later costs nothing on existing English pages. To bring back: re-download `inter-cyrillic.woff2` the same way as `inter-latin.woff2` but from the `/* cyrillic */` face, re-add the `CYRILLIC_FREQ` table and cyrillic cases to `scripts/font-metrics.ts` (removed along with the rules), and add the `@font-face` + two fallback rules back to `fonts.css` with `unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`.

### Trap to avoid

`fonts.css` reaches the files by relative path and `__root.tsx` reaches `inter-latin.woff2` through `?url`. Both must resolve to the **same** emitted asset. If the paths disagree Vite emits the file twice and the preload warms a URL the CSS never requests — silently costing 48 KB instead of saving anything. Verify by checking that `.output/public/assets/` contains exactly one `inter-latin-*.woff2`.

### Why DM Mono keeps `swap` and needs no fallback rule

Monospace advance widths are effectively standardized at 0.6 em: DM Mono 0.6000, Courier New / Monaco / Andale Mono 0.6001, Menlo 0.6021. Only SF Mono (what `ui-monospace` resolves to on macOS) differs meaningfully, at 0.6182 — 3%, inside a `pre` that already has `overflow-x: auto`. Vertically there is nothing to match either: `line-height` on `.prose` (1.75) and `.prose pre` (1.7142857) is unitless, so line box height comes from `font-size` and the fonts' differing `lineGap` values (DM Mono 0, Menlo 410, Andale 343) never reach layout. Code blocks therefore do not reflow on swap, and `font-display: optional` — which would have cost the real font on every cold first visit — buys nothing here.

### Verify

- `bun run build` succeeds; `.output/public/assets/` holds exactly four woff2 files, one `inter-latin-*.woff2`.
- `bun run preview`: zero requests to `fonts.googleapis.com` / `fonts.gstatic.com`; `inter-latin` starts loading from the preload, not after CSS parse.
- Visual pass in both themes: body text, headings at 600/700, the italic `p.description`, inline code (`DM Mono 500`), a code block (`DM Mono 400`), and the `cd ..` footer.
- Throttle to Slow 3G and watch for layout shift as Inter replaces Arial — that is what the override numbers in step 3 are for.

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
- **ASCII-subsetting the fonts** — measured: DM Mono drops 14,820 → 9,952 bytes per weight (9.7 KB across both), Inter latin 48,256 → 30,492. Not worth a subsetting step in the build for the mono saving, and the Inter saving comes at the cost of every accented character, `—`, `’` and `→` in the content. Revisit only if the mono files ever land on the critical path.
- **`@fontsource*` packages, `fontaine`, `@capsizecss/metrics`** — all rejected in favour of committed woff2 files plus hardcoded override numbers (Work Stream A, steps 1 and 3). The packages ship their own `@font-face` including the `opsz` axis we are dropping, and none of them can express the per-script fallback overrides this plan needs.
- **`font-display: optional` for DM Mono** — considered and rejected on measurement; see the reasoning at the end of Work Stream A.
- **Cyrillic subset** — downloaded, measured, and had working `@font-face` + fallback rules, then pulled before merge: no ru content exists yet to justify shipping it. See "Deferred: cyrillic subset" in Work Stream A for how to bring it back.
- **Shiki dual-theme (light+dark) inline styles per code block** — worth a glance once a content-heavy page exists, but current content is small enough that this isn't measurable yet.

## End-to-end verification

- `bun run build` (includes `tsc -b`) passes cleanly.
- `bun run preview`, load the site: no `fonts.googleapis.com`/`fonts.gstatic.com` requests; `inter-latin-*.woff2` starts loading from the preload rather than after CSS parse, and appears exactly once in `.output/public/assets/`; DotsArt chunk loads deferred, not blocking hydration.
- Devtools: emulate `prefers-reduced-motion: reduce` → no DotsArt canvas mounts. Switch browser tabs → ticker pauses.
- Visual pass in both light and dark themes: body text, headings at 600/700, the italic `p.description`, inline code (DM Mono 500), a code block (DM Mono 400), and the `cd ..` footer all render with the correct self-hosted weights.
- Throttled to Slow 3G, watch the Arial → Inter swap for layout shift; that is what the metric overrides exist to prevent.
- Confirm the main entry chunk shrinks well below the current ~199KB brotli baseline once pixi.js/simplex-noise move to their own async chunk (re-run the same `curl -H "Accept-Encoding: br" -w "%{size_download}"` check against the new build's `index-*.js` to compare against today's measured baseline).
- Speculation Rules: DevTools → Application → Speculative Loads shows same-origin links prerendering on hover.
- Optional directional check: Lighthouse/PageSpeed before vs. after, not a hard gate.
