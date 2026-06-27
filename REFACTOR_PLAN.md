# Refactor Loop — kadochiapp/front

## Context

The repo root is `/Volumes/Files/Works/kadochiapp`; the Next.js app lives in `front/`.
A generic "refactor loop" prompt was supplied assuming a **pnpm + ReactQuery + Tailwind v4 + Axios + Zod** stack. The audit found the real app uses **none** of those:

- Package manager: **npm** (`package-lock.json`), not pnpm.
- Data: custom `fetch` wrappers (`services/http`, `services/wordpress`, `lib/api/woo.ts`) + React Context. No ReactQuery, no Axios.
- Styling: **CSS Modules** (58 `.module.css`) + CSS-variable tokens in `src/styles/tokens.css`. No Tailwind.
- Validation: hand-written interfaces in `src/types/*`; Zod barely used (an optional `schema` param in `wordpressJson()` that is mostly unused).
- Scripts: only `dev/build/start/lint`. No `typecheck`, no tests, no Lighthouse.

**Decision (confirmed with user):** migrate to the template stack (TanStack Query + Axios + Tailwind v4 + Zod), add typecheck + lint gates now (defer test framework + Lighthouse CI), and **start with structure (splitting oversized files).**

This is a substantial migration. It will be executed as sequenced slices, one concern per pass, per the loop's guardrails. Library introductions are isolated to their own phases so a restyle and a refactor never land in the same commit.

### Stack-agnostic problems the audit surfaced (fix regardless of migration)
- Oversized files: `lib/api/woo.ts` (1340 LOC), `checkout/CheckoutClient.tsx` (1047), `profile/orders/OrdersPageClient.tsx` (472), `products/sheets/AllFiltersSheet.client.tsx` (440), `products/page.tsx` (458), `app/page.tsx` (257), `Header.tsx` (267), `Footer.tsx` (279).
- No skip-to-content link; no visible `:focus-visible` rings.
- JSON-LD objects (`siteLd`, `orgLd` in `app/page.tsx`) are built but never rendered.
- All images are raw `<img>` (no `next/image`); fonts via manual `@font-face` (no `next/font`).
- `'use client'` pushed too high (every `components/ui/*` leaf is client; `app/providers.tsx` is a client boundary near the root).
- `noUncheckedIndexedAccess` / `noImplicitOverride` not enabled.

---

## Loop bookkeeping

Create `front/.refactor-state.json` (npm-adjusted commands):
```json
{ "pass": 0, "phase": "tooling", "lastFile": null,
  "lighthouse": {}, "openIssues": [], "doneSlices": [] }
```
Validation per slice: `npm run typecheck && npm run lint && npm run build` (tests added later). One concern per commit; conventional commits (`refactor:`/`perf:`/`a11y:`/`feat:`/`chore:`). On any validation regression → revert, log to state, retry narrower.

---

## Phase 0 — Tooling gates (do first, enables every later slice)

1. `package.json`: add `"typecheck": "tsc --noEmit"`.
2. `tsconfig.json`: add `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`. Expect new errors — fix them as the `types` phase, not here; if too many to absorb in one pass, land the flags in a dedicated pass that also fixes fallout.
3. Confirm `npm run lint` is clean as a baseline; record counts in state.
4. Write `.refactor-state.json`.

Commit: `chore(front): add typecheck script and stricter tsconfig flags`.

---

## Phase 1 — Structure: split oversized files (FIRST refactor slice)

Pure mechanical extraction — **no behavior, no restyle, no library change.** One file per pass.

**Slice 1 (first iteration): `checkout/CheckoutClient.tsx` (1047 LOC).**
Extract, co-located under `app/(front)/checkout/`:
- Pure helpers (`buildStepper`, `faDay/faDate`, `addDays`, `isFriday`, `sameDay`, `priceFromWP`, `irrToIrt`, `toman`, slot-building) → `checkout.helpers.ts`.
- `fetchWithTimeout` + product-price fetching → a hook `useCheckoutPricing.ts` (this becomes a TanStack Query hook in the data-layer phase — leave as plain hook for now).
- Step UIs (sender/receiver form, delivery/packaging, payment) → `steps/*.tsx` sub-components, props-only.
- Target: parent < 150 LOC orchestrator; each step < 150 LOC; each fn < 40 LOC.

**Subsequent structure slices (one per pass, priority order):**
`products/page.tsx` (458) → split server fetch vs view; `AllFiltersSheet.client.tsx` (440); `OrdersPageClient.tsx` (472); `Footer.tsx` (279, also moves its category fetch out of an effect); `Header.tsx` (267); `app/page.tsx` (257, extract JSON-LD + sections). `lib/api/woo.ts` (1340) is split in the data-layer phase, not here.

Kill the single barrel that risks cycles only if a cycle exists (`components/layout/Price/index.ts`); otherwise leave. Push `'use client'` to leaves opportunistically only when a split already isolates the interactive part.

---

## Phase 2 — Data-layer: Axios + TanStack Query + Zod

Introduced in this order so each pass is one concern:

1. **Axios instance** — `lib/api/axios.ts`: single instance, `baseURL`, request/response interceptors, a typed error normalizer that maps onto the **existing** `services/http/errors.ts` taxonomy (reuse it; do not duplicate). Server-side WooCommerce/WordPress fetchers keep their resilient wrappers — Axios is for the **client/proxy** calls now scattered as raw `fetch` (e.g. `basket/CartPageClient.tsx`, `lib/client/auth.ts`).
2. **Zod schemas** — `src/schemas/` mirroring `src/types/woo.ts` / `wp.ts`. Parse responses with `.safeParse()` at boundaries; infer types via `z.infer`; delete the duplicated hand-written interfaces once a schema replaces them. Wire schemas into the existing `wordpressJson({ schema })` hook that already supports them.
3. **TanStack Query** — add `@tanstack/react-query`; create `QueryClient` + provider (fold into `app/providers.tsx`, keeping it a thin client boundary). `lib/queryKeys.ts` factory (`keys.products.list(filters)` style). One hook per query/mutation under `hooks/queries/`. Move every in-component fetch (CartPageClient, etc.) into a hook. Set `staleTime`/`gcTime` intentionally. Mutations: optimistic update + `onError` rollback + invalidate. For initial server fetches, prefetch in RSC and hydrate via `HydrationBoundary`. Fill the empty `domains/auth/hooks/useAuth.ts` and `domains/catalog/hooks/useCatalogFilters.ts` or delete them.
4. Split `lib/api/woo.ts` along the way (catalog / customer / reviews / mappers).

---

## Phase 3 — Types
`import type` everywhere; eliminate `any` (the `CheckoutClient` `deps: any[]`, manual casts in woo mapping) → `unknown` + narrow. All external types become `z.infer`. Resolve `noUncheckedIndexedAccess` fallout from Phase 0.

## Phase 4 — Components: Tailwind v4 migration
Biggest restyle effort. Add Tailwind v4; port `styles/tokens.css` into `@theme`. Add a real `cn()` (clsx + tailwind-merge), replacing the local `cx()`. Migrate **feature-by-feature, never mixed with a structural refactor in the same commit** (`refactor:` vs `feat:`/`style:` stay separate). Keep CSS Modules until a component is fully ported; no half-migrated files. Memoize only proven hot paths. Explicit loading/empty/error for every async surface.

## Phase 5 — a11y (target 100)
Skip-to-content link in `app/layout.tsx`; `:focus-visible` rings in global tokens; verify heading order / one `<h1>` per page; `prefers-reduced-motion` for the shimmer animations; live region for toasts.

## Phase 6 — seo (target 100)
Render the existing `siteLd`/`orgLd` JSON-LD as `<script type="application/ld+json">`; add `viewport`; per-route metadata audit (most exist already); confirm `sitemap.ts`/`robots.ts`.

## Phase 7 — vitals (perf ≥90)
`next/image` for all `<img>` (priority on LCP hero, width/height to kill CLS); `next/font` for IRANSansX (replace manual preload); `dynamic()` for below-fold heavy clients (Swiper sheets); route segment cache hints + RQ `staleTime`. **Defer until user adds Lighthouse/test tooling** (Phase 0 deferred those) — flag for a go/no-go before this phase since EXIT CRITERIA's Lighthouse gate can't be measured yet.

## Phase 8 — final-sweep
`npx knip`/`depcheck` for dead code + unused deps; re-run full validation; confirm EXIT CRITERIA.

---

## Critical files
- `front/package.json`, `front/tsconfig.json` (Phase 0)
- `front/src/app/(front)/checkout/CheckoutClient.tsx` (Slice 1)
- `front/src/app/providers.tsx` (RQ provider)
- `front/src/lib/api/woo.ts`, `front/src/services/http/errors.ts` (data-layer, reuse error taxonomy)
- `front/src/services/wordpress/index.ts` (`wordpressJson({ schema })` — wire Zod here)
- `front/src/app/page.tsx` (unrendered JSON-LD), `front/src/app/layout.tsx` (skip link, fonts)
- `front/src/styles/tokens.css` (→ `@theme` in Phase 4)

## Verification
- Per slice: `cd front && npm run typecheck && npm run lint && npm run build`.
- Behavioral smoke for Slice 1: `npm run dev`, walk the 3-step checkout flow (info → packaging/delivery → payment), confirm totals resolve before the payment step and the Zarinpal redirect still builds.
- After data-layer: confirm cart/product/orders screens still load and mutate (add/remove basket) with no console errors; check RQ devtools cache.
- Tests + Lighthouse are out of scope until the user opts into that tooling; revisit before Phase 7.

## Open decisions to confirm before their phase
- Tailwind v4 migration (Phase 4) is the largest, highest-risk slice — confirm appetite before starting it.
- Lighthouse/test tooling needed for Phases 7–8 EXIT CRITERIA — currently deferred per user's "typecheck + lint gates" choice.
