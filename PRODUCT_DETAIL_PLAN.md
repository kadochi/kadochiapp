# Product Detail Page (single product)

## Context

`front/src/app/(products)/product/page.tsx` exists but is **empty (0 bytes)** — the route group and its `layout.tsx` are wired to `LayoutContent`, but no page. Meanwhile `features/products/` is fully built and has **zero callers**: `products.server.ts`, `productSchema`, `mapProduct`, `usePrice`, `ProductCard`, `ProductList`, `ProductsSlider` are all shipped but unused. `ProductCard` links to `/products/{slug}`, which matches no route — every card in the app is currently a dead link.

This task ports the legacy PDP (`kadochi.old/app/(front)/product/[id]/`) onto that foundation: a real SSR page, wired to the live Woo Store API, built from the new design system, with the legacy's duplication removed.

The legacy PDP is ~7 thin section components over one product type, but carries real rot worth fixing rather than porting:

- **Four** product mappers (two fully dead), **three** divergent copies of `hasDiscount`, and **three** hand-rolled rial→toman conversions that *disagree* — `Math.round(n/10)` in `ProductInfo` vs `Math.trunc(n/10)` in `ActionBar` means the same product renders ۲۰۰۰ in one place and ۱۹۹۹ in another, on the same screen.
- `ProductInfo`, `ProductSpecs`, and `ProductTags` are all marked `"use client"` with **zero interactivity** — no hooks, no handlers.
- The page rendered its own `<main>` inside the layout's `<main>` (invalid HTML).
- It passed both `reviewsCount` and `commentsCount`, computed from the same field.

**This is the app's first server-fetching page.** There is no precedent to copy — no `async` page, no `generateMetadata`, no React `cache()` anywhere in `front/src`. The patterns established here set the house style.

### Verified against the live store (`localhost:8080`)

| Check | Result |
|---|---|
| `?slug=` filter | **Honored.** Real slug → exactly 1 match; bogus slug → `[]`. Safe to use. |
| `products/reviews?product_id=` | **Public, 200.** No consumer keys needed. |
| Currency | **`IRR`, `minor_unit: 0`, price `"1000"`** — see below. |
| `average_rating` | Returns `'0'` (string) today, but Woo returns a number in some configs. |

## Decisions (settled with the user — do not revisit)

1. **Route `/product/[slug]`** — `(products)/product/[slug]/page.tsx`. Delete the empty stub. Update `product-card.tsx:32` `/products/${slug}` → `/product/${slug}`. This matches the two gates that already exist: `header.tsx:185` (`pathname.startsWith("/product/")`) and `bottom-navigation.tsx:46`.
2. **Sections** — gallery, title/price/meta, description, specs, breadcrumb, sticky action bar, similar-products slider, read-only reviews. **No** review form, **no** tag chips.
3. **Cart** — call the existing `addItem()` in a leaf client component + `useToast()`. No `CartProvider`.
4. **Currency** — fix `usePrice` to convert IRR→Toman. See below.
5. **Breadcrumbs** — port legacy's full crumbs (`خانه / محصولات / {category} / {name}`) and the "مشاهده همه" link, accepting that `/products` 404s until that route ships.

### The currency fix (do this first — it gates the buy button)

The live store returns `IRR` / `minor_unit: 0` / `price: "1000"`. `usePrice` divides by `10**minorUnit` (a no-op at 0) while `Price` hardcodes `تومان` — so **1000 rial renders as "۱٬۰۰۰ تومان" when it is really ۱۰۰ تومان**. Every price in the app is 10× too high. Legacy divided by 10 (`rialToToman`); `usePrice` never did. The showcase mocks say `"IRT"`, which is why this was never noticed — **the mocks don't match the real store.**

`ProductCard` already ships this, but the PDP would put a 10× price directly above "افزودن به سبد خرید". Fix it in the one pure function everything shares:

```ts
// features/products/hooks/usePrice.ts
function toDisplayAmount(money: Money): number {
  const base = Number(money.amount) / 10 ** money.minorUnit;
  return money.currencyCode === "IRR" ? base / 10 : base;
}
```

This corrects `ProductCard`, `ProductList`, `ProductsSlider`, and the PDP at once. Consider updating the `app/page.tsx` showcase mocks to `IRR` so they stop lying about the real shape.

---

## 1. Files

**Create — route** (`src/app/(products)/product/[slug]/`)

| File | Purpose |
|---|---|
| `page.tsx` | Async **server** orchestrator + `generateMetadata` + `notFound()` |
| `loading.tsx` | Route-level skeleton |
| `error.tsx` | `"use client"` (Next requires it) — `StateMessage` + `reset()` |
| `not-found.tsx` | `StateMessage` + link home |

**Create — `src/features/products/components/`**

| File | Boundary | Purpose |
|---|---|---|
| `product-gallery.tsx` | **client** | Swiper main + thumbs |
| `product-info.tsx` | server | `<h1>`, `Price`, meta `Label` chips |
| `product-description.tsx` | server | `SectionHeader` + category `Label` + HTML |
| `expandable-content.tsx` | **client** | Generic clamp/toggle, takes `children` |
| `product-specs.tsx` | server | Real `<table>` |
| `product-action-bar.tsx` | **client** | Sticky bar: qty + add-to-cart |
| `product-reviews.tsx` | server async | Read-only reviews list |
| `similar-products.tsx` | server async | Fetch → existing `ProductsSlider` |
| `product-detail-skeleton.tsx` | server | Exports 3 skeletons (one file, per `price.tsx` precedent) |

**Create — hooks/utils:** `hooks/useAddToCart.ts`, `hooks/useProductGallery.ts`, `hooks/useExpandable.ts`, `utils/map-review.ts`, `utils/strip-html.ts`, `utils/product-breadcrumbs.ts`

**Modify:** `schema/products.ts`, `utils/map-product.ts`, `services/products.server.ts`, `types.ts`, `hooks/usePrice.ts` (currency fix), `components/product-card.tsx` (href), `CONTRACT.md`

**Delete:** `src/app/(products)/product/page.tsx`

## 2. Server/client boundary

Only **three** new `"use client"` files — Swiper, the qty/cart bar, and the clamp toggle. Everything else renders on the server.

```
(products)/layout.tsx → LayoutContent [server] → <main>   ← page renders NO <main> (fixes legacy nesting)
  └ page.tsx  [SERVER, async]
      ├ ProductGallery ............ "use client"  ← LEAF (swiper)
      ├ ProductInfo ............... server        ← was "use client" for nothing
      ├ ProductDescription ........ server
      │   └ ExpandableContent ..... "use client"  ← LEAF; children arrive server-rendered
      │       └ <div dangerouslySetInnerHTML>     ← stays in the SERVER graph
      ├ ProductSpecs .............. server        ← was "use client" for nothing
      ├ <Suspense> SimilarProducts   server async
      │   └ ProductsSlider ........ "use client" (existing) ← LEAF
      ├ <Suspense> ProductReviews    server async
      │   └ Avatar ................ "use client" (existing) ← LEAF
      ├ Breadcrumb ................ "use client" (existing) ← LEAF
      └ ProductActionBar .......... "use client"  ← LEAF
```

Three independent guarantees the page stays server-side:

1. **Compile-time, enforced.** `page.tsx` imports `products.server.ts`, whose first line is `import "server-only"`. Adding `"use client"` to the page becomes a *build error* — not a convention, the module graph enforces it.
2. **`async` + `await params`.** Client components can't be `async`.
3. **The root `<Toaster>` doesn't contaminate anything.** `layout.tsx:41` renders `<Toaster>{children}</Toaster>`; `children` is a prop passed from a server parent, so the subtree renders on the server and is slotted in. This is why `useToast()` works in a leaf while the page above stays server.

**`ExpandableContent` is the load-bearing piece for "client renders at low level".** Legacy shipped the whole description HTML into client props. Passing it as `children` from a server parent keeps the `dangerouslySetInnerHTML` node in the RSC payload — the client component owns only a `max-height` class and a button.

## 3. Schema + mapper

`schema/products.ts` — extend `productQuerySchema` so `productParams()` stays the single URL builder:

```ts
slug: z.string().trim().min(1).max(200).optional(),
exclude: z.array(z.coerce.number().int().positive()).max(20).optional(),
orderby: z.enum(["date","id","menu_order","popularity","rating","price","title"]).optional(),
```

New upstream attribute (Store API v1 uses `terms[]`, **not** wc/v3's `options[]`):

```ts
const upstreamAttributeSchema = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  taxonomy: z.string().nullable().optional(),
  has_variations: z.boolean().optional(),
  terms: z.array(z.object({ id: z.number().int().optional(), name: z.string(), slug: z.string().optional() })).default([]),
});
```

`upstreamProductSchema` additions:

```ts
attributes: z.array(upstreamAttributeSchema).default([]),
average_rating: z.union([z.string(), z.number()]).optional(),   // was z.string().optional()
```

> **`average_rating` is a live latent bug, not a tidy-up.** It's typed `z.string()`, but Woo returns a number in some configs. If it ever does, `upstreamProductsSchema.parse` throws → `parseUpstreamJson` → `malformed_upstream_response` → **the entire product list 502s**, not just the rating. Nobody has hit it because the mapper currently drops the field. The union closes it before we start reading it.

`productSchema` additions:

```ts
export const productAttributeSchema = z.object({ name: z.string().min(1), value: z.string().min(1) });
// productSchema +=
attributes: z.array(productAttributeSchema),
averageRating: z.number().min(0).max(5),
reviewCount: z.number().int().nonnegative(),
```

Reviews (same file — this feature has one schema file, matching `cart`/`occasions`):

```ts
export const reviewQuerySchema = z.object({
  productId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(50).default(10),
});

const upstreamReviewSchema = z.object({
  id: z.number().int().positive(),
  date_created: z.string(),
  product_id: z.number().int(),
  reviewer: z.string().default(""),
  review: z.string().default(""),                        // HTML
  rating: z.number().min(0).max(5).nullable().optional(),// null when ratings disabled
  verified: z.boolean().default(false),
  reviewer_avatar_urls: z.record(z.string(), z.string()).optional(),  // loose on purpose
});
export const upstreamReviewsSchema = z.array(upstreamReviewSchema);

export const productReviewSchema = z.object({
  id: z.number().int().positive(),
  author: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  rating: z.number().min(0).max(5).nullable(),
  createdAt: z.string(),
  content: z.string(),
  verified: z.boolean(),
});
```

`utils/map-product.ts`:

```ts
const rating = Number.parseFloat(String(product.average_rating ?? ""));
// inside productSchema.parse({ … })
attributes: product.attributes
  .map((attribute) => ({
    name: attribute.name.trim(),
    value: attribute.terms.map((term) => term.name.trim()).filter(Boolean).join("، "),
  }))
  .filter((attribute) => attribute.name && attribute.value),
averageRating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
reviewCount: product.review_count ?? 0,
```

The `Number.isFinite` guard is required — **zod 4 rejects `NaN`**, so a malformed `average_rating` would throw inside the mapper's own `productSchema.parse`.

`utils/map-review.ts` — two deliberate calls:

```ts
function safeUrl(value: string | undefined) {
  if (!value) return undefined;
  return z.string().url().safeParse(value).success ? value : undefined;
}

export function mapReview(review: UpstreamReview) {
  const avatars = review.reviewer_avatar_urls ?? {};
  return productReviewSchema.parse({
    id: review.id,
    author: review.reviewer.trim() || "کاربر",
    avatarUrl: safeUrl(avatars["96"] ?? avatars["48"] ?? Object.values(avatars)[0]),
    rating: review.rating ?? null,
    createdAt: review.date_created,
    content: stripHtml(review.review),   // strip — never dangerouslySetInnerHTML
    verified: review.verified,
  });
}
```

`safeUrl` because upstream avatar URLs are loose — a non-URL gravatar string would throw inside `productReviewSchema.parse` and 500 the section. `stripHtml` because `review` is **user-generated HTML** — rendering it raw is the only XSS surface on this page. Legacy stripped it too.

## 4. Services (`products.server.ts`)

Extend the existing `productParams()` builder rather than forking it:

```ts
if (input.slug) params.set("slug", input.slug);
if (input.orderby) params.set("orderby", input.orderby);
if (input.exclude?.length) params.set("exclude", input.exclude.join(","));
```

**`getProductBySlug` — fixed.** Today it does `listProducts({ search: slug, perPage: 20 })` then `.find()`, so a slug ranking past position 20 in fulltext gives a false 404. The `?slug=` param is verified working against the live store:

```ts
export async function getProductBySlug(slug: string) {
  const input = z.string().trim().min(1).max(200).parse(slug);
  const requestId = randomUUID();
  const response = await wordpressFetch(
    `/wp-json/wc/store/v1/products?${productParams({ slug: input, perPage: 5 })}`,
    { requestId, next: { revalidate: 60, tags: ["products", `product:slug:${input}`] } },
  );
  const products = await parseUpstreamJson(response, (v) => upstreamProductsSchema.parse(v), requestId);
  const match = products.find((candidate) => candidate.slug === input);   // ← KEEP
  if (!match) throw new ServiceError({ code: "not_found", status: 404, message: "Product not found.", requestId, retryable: false });
  return mapProduct(match);
}
```

> **Keep the `.find()` and use `perPage: 5`, not `1`.** I verified the store honors `slug=`, but the `.find()` costs nothing and is the difference between two failure modes: if the param were ever ignored (plugin change, WP upgrade, different Woo version), `per_page=1` would return *the first product in the catalog* — shipping **the wrong product under the right URL, silently, cached for 60s**. The `.find()` turns that into an honest 404.

New — `listProductReviews`. `revalidate: 120` matches legacy's review TTL and sits between the file's existing 60 (products) and 300 (categories); the tag extends the existing `product:${id}` convention:

```ts
export async function listProductReviews(query: ReviewQuery) {
  const input = reviewQuerySchema.parse(query);
  const params = new URLSearchParams({
    product_id: String(input.productId), page: String(input.page), per_page: String(input.perPage),
  });
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/reviews?${params}`, {
    requestId: id,
    next: { revalidate: 120, tags: ["product-reviews", `product:${input.productId}:reviews`] },
  });
  return (await parseUpstreamJson(response, (v) => upstreamReviewsSchema.parse(v), id)).map(mapReview);
}
```

New — `listSimilarProducts`, a thin wrapper inheriting `listProducts`'s cache policy. `exclude` fixes a legacy bug where the product appeared in its own "similar" rail:

```ts
export async function listSimilarProducts({ categoryId, excludeId, perPage = 8 }: SimilarProductsQuery) {
  return listProducts({ category: categoryId, exclude: [excludeId], perPage, orderby: "popularity" });
}
```

**Update `CONTRACT.md`** — it enumerates the four current methods; add the two new ones and the 120s review TTL or it's stale on day one.

## 5. Hooks

`usePrice` is pure and already runs server-side (`product-card.tsx:22` proves it). **`ProductInfo` and `ProductActionBar` both consume `usePrice(product)` and nothing else** — that alone kills legacy's three `hasDiscount` copies and the `Math.round`/`Math.trunc` split. No new price hook; just the IRR fix above.

```ts
// hooks/useAddToCart.ts
type UseAddToCartOptions = { productId: number; min?: number; max?: number };
type UseAddToCartResult = {
  quantity: number;
  setQuantity: (quantity: number) => void;
  add: () => Promise<void>;
  isPending: boolean;
};
export function useAddToCart({ productId, min = 1, max = 9 }: UseAddToCartOptions): UseAddToCartResult;
```

`add()` calls `addItem({ productId, quantity })` → `toast({ tone: "success" })`, catches → `toast({ tone: "error" })`, `finally` clears pending. Guard re-entry with `if (isPending) return`.

> **No provider actually simplifies the UX.** Legacy's `mounted`/`basketQty` double-`useEffect` dance (`ActionBar.tsx:45-58`) existed only to sync the stepper to global cart state. Without a provider that's unreachable, so the bar becomes: local qty stepper (default 1) **+** a persistent "افزودن به سبد خرید" button. Stateless, no hydration flash, ~40 fewer lines. Legacy's `qty > 0 ? Stepper : Button` swap is deliberately dropped — it can't be honest without cart state.

```ts
// hooks/useProductGallery.ts
type UseProductGalleryResult = {
  slides: readonly { src: string; alt: string; priority: boolean }[];
  activeThumbs: SwiperClass | null;              // absorbs the !destroyed guard legacy inlined
  setThumbsSwiper: (swiper: SwiperClass | null) => void;
  showThumbs: boolean;                            // requestIdleCallback-deferred
  hasMultiple: boolean;
};
export function useProductGallery(images: readonly ProductImage[], title: string): UseProductGalleryResult;
```

Mirrors the existing `useProductsSlider` shape. Swiper 14.0.5 ships `thumbs` + `swiper/css/thumbs`.

```ts
// hooks/useExpandable.ts — generic, no product knowledge
export function useExpandable<T extends HTMLElement>(): {
  contentRef: RefObject<T | null>;
  isExpanded: boolean;
  canExpand: boolean;
  toggle: () => void;
};
```

```ts
useEffect(() => {
  const element = contentRef.current;
  if (!element || isExpanded) return;            // never measure while expanded
  const measure = () => setCanExpand((prev) => prev || element.scrollHeight > element.clientHeight + 4);
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(element);
  return () => observer.disconnect();
}, [isExpanded]);
```

> Both guards are bug traps, not style. Drop `if (isExpanded) return` and the expanded element measures `scrollHeight === clientHeight` → `canExpand` flips false → **the "نمایش کمتر" button vanishes and the user can never collapse.** Hence the sticky `prev ||` too. ~15 lines against legacy's 4 pieces of state + runtime `getComputedStyle` line-height parsing.

## 6. Components + Tailwind v4

Real token names only. Spacing token == px, value == rem (`p-16` = 1rem). House style always pairs a size with `leading-[var(--text-<name>--line-height)]`. Breakpoints are arbitrary queries (`min-[580px]:`) — no custom ones are defined.

**Sticky action bar** — `product-action-bar.tsx`:

```tsx
<div className="sticky inset-x-0 bottom-0 z-40 border-t border-border-low-emphasis bg-surface-background px-16 pt-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))]">
  <div className="mx-auto grid max-w-[580px] grid-cols-2 items-center gap-8">
    <Price current={current} previous={previous} offPercent={offPercent} size="L" orientation="vertical" showArrowOnLargeH />
    <div className="flex items-center justify-end gap-8">
      {inStock ? (<>
        <InputStepper size="sm" variant="outline" value={quantity} min={1} max={9} onValueChange={setQuantity} />
        <Button variant="primary-filled" size="large" loading={isPending} onClick={add} className="flex-1">افزودن به سبد خرید</Button>
      </>) : (
        <span className="inline-flex w-full items-center justify-center px-16 py-12 text-label-14 font-regular leading-[var(--text-label-14--line-height)] text-surface-neutral-low-emphasis">ناموجود</span>
      )}
    </div>
  </div>
</div>
```

Three deliberate deviations from legacy:

- **`z-40`, not legacy's `z-index: 200`.** `ToastViewport` is `fixed bottom-0 start-0 z-[60]` (`toast.tsx:25`) — bottom-left, exactly where this bar lives. At z-200 the bar **paints over the very toast confirming the add-to-cart**, so the page's primary action gives no feedback.
- **`pb-[max(env(safe-area-inset-bottom),var(--spacing-24))]`**, copying `bottom-navigation.tsx:120`'s house pattern. Legacy's `calc(24px + env(...))` leaves 58px of dead space on a notched iPhone; `max()` gives 34px.
- **No `--ab-height`.** Legacy declared `--ab-height: 112px` in `ActionBar.module.css:2` and **no selector ever read it** — it's dead. `sticky` (unlike `fixed`) is in normal flow, so no spacer is needed. If `BottomNavigation` (`fixed`, `z-[100]`) is ever added to this route group, both pin to the bottom and this needs revisiting; `LayoutContent` doesn't render it today.

**Specs table** — `product-specs.tsx`, a real `<table>`:

```tsx
<div className="mx-16 mt-8 mb-16 overflow-hidden rounded-xl border border-border-mid-emphasis">
  <table className="w-full table-fixed border-collapse [direction:rtl]">
    <tbody>
      {attributes.map((attribute) => (
        <tr key={attribute.name} className="border-b border-border-mid-emphasis last:border-b-0 odd:bg-surface-soft even:bg-surface-background">
          <th scope="row" className="w-1/3 px-16 py-16 text-right align-middle font-sans text-label-14 font-regular leading-[var(--text-label-14--line-height)] text-surface-neutral-mid-emphasis">{attribute.name}</th>
          <td className="px-16 py-16 text-left align-middle font-sans text-body-14 font-bold leading-[var(--text-body-14--line-height)] text-surface-neutral-high-emphasis">{attribute.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

A real table deletes legacy's `role="table"/"row"/"cell"` scaffolding *and* its per-cell `aria-label="ویژگی"`/`"مقدار"` — `<th scope="row">` conveys all of it natively.

**Description clamp** — `expandable-content.tsx`:

```tsx
<div ref={contentRef}
     className={cn("overflow-hidden transition-[max-height] duration-200 [direction:rtl]",
                   "font-sans text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis",
                   !isExpanded && "max-h-[calc(var(--text-body-14--line-height)*10)]")}>
  {children}
</div>
```

`max-h-[calc(var(--text-body-14--line-height)*10)]` = 10 lines, computed from the token at **build** time. Chosen over `line-clamp-10` because `-webkit-line-clamp` needs `display:-webkit-box` and behaves unpredictably across the `<p>/<ul>/<h3>` blocks Woo descriptions contain. This is the whole point of the token migration: legacy read line-height at *runtime* via `getComputedStyle` because it had no token to reference.

**Description source** — legacy's active mapper used `short_description || description` (`woo.ts:1008`), making the long description a *fallback* — so the collapse-at-10-lines UI rarely triggered. Likely accidental. **Render `product.description`, falling back to `shortDescription`** (the inverse). Keep `shortDescription || description` for the *metadata* description, where short-first is correct.

**Meta chips** — `product-info.tsx` uses `Label` and deletes `ProductInfo.module.css` entirely:

```tsx
<Label variant="success" appearance="soft" size="sm" leadingIcon={<Clock />}>ارسال ۱ روزکاری</Label>
<Label variant="neutral" appearance="soft" size="sm" leadingIcon={<MessageSquare />}>{product.reviewCount.toLocaleString("fa-IR")} نظر</Label>
{product.reviewCount > 0 ? (
  <Label variant="neutral" appearance="soft" size="sm" leadingIcon={<Star />}>
    امتیاز {product.averageRating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}
  </Label>
) : null}
```

The rating chip renders only when `reviewCount > 0` — legacy always showed "امتیاز ۰". Only `reviewCount` is passed, so legacy's `commentsCount` twin disappears by construction.

**Note:** `SectionHeader` is **default-export only** (`section-header.tsx:53`). Don't reach for a named import.

## 7. Metadata + notFound

```tsx
import { cache } from "react";
import { notFound } from "next/navigation";

const loadProduct = cache(async (slug: string) => {
  try {
    return await getProductBySlug(slug);
  } catch (error) {
    const detail = (error as ServiceError | UpstreamError)?.detail;
    if (detail?.code === "not_found") return null;   // → not-found.tsx
    throw error;                                     // 502/504 → error.tsx
  }
});
```

> **Catch both error classes.** `getProductBySlug` throws `ServiceError`, but `wordpressFetch` throws `UpstreamError` for an upstream 404 (`errorForStatus` maps 404 → `"not_found"`). They're unrelated classes that both carry `.detail: ApiError`, so duck-type on `detail?.code` — an `instanceof ServiceError` check leaks upstream 404s into `error.tsx` as a red 500 screen.

`generateMetadata` returns `title: product.name`, `description: stripHtml(product.shortDescription || product.description).slice(0, 160)` with the legacy's Persian fallback copy, `alternates: { canonical: '/product/${slug}' }`, plus `openGraph` (type/siteName/locale `fa_IR`/images) and `twitter`. On `null` → "محصول پیدا نشد | کادوچی" + canonical. The page then does `if (!product) notFound()`.

> **On `cache()` — stated exactly, since the app has never used it.** It's `import { cache } from "react"` — **not** `unstable_cache`, not `next/cache`. It memoizes per-request within one server render pass; `generateMetadata` and the page run in the same pass, so the second call is free. Next's `fetch` memoization would dedupe the HTTP call anyway, but **not** the `upstreamProductsSchema.parse` + `mapProduct` + `productSchema.parse` chain — two full zod passes per request. `cache()` also makes the `not_found` → `null` normalization run once, so metadata and page can't disagree. Wrap it in `page.tsx` (both callers live there); **not** in the service, which is shared with future callers and owns *HTTP* caching per PLAN.md — a different concern.

**No `export const revalidate`.** Per PLAN.md, TTL lives per-fetch in the service layer. Legacy's `revalidate = 300` is deliberately not ported.

## 8. Loading + errors

| File | Content |
|---|---|
| `loading.tsx` | `<ProductDetailSkeleton />` — gallery block + title/price/chips + specs rows |
| `error.tsx` | `"use client"`, `({ error, reset })` → `StateMessage imageSrc="/images/illustration-failed.png" title="مشکلی پیش آمد"` + `<Button onClick={reset}>تلاش دوباره</Button>` |
| `not-found.tsx` | `StateMessage imageSrc="/images/illustration-404.png" title="محصول پیدا نشد"` + `<Button asChild><Link href="/">بازگشت به خانه</Link></Button>` |

All three illustrations exist in `public/images/`. `StateMessage`'s `imageSrc` is **required** (`state-message.tsx:5`).

Two Suspense boundaries, both below the fold — the page `await`s only the product, so gallery/info/specs/action-bar flush in the first chunk:

```tsx
<Suspense fallback={<ProductsSliderSkeleton />}><SimilarProducts categoryId={…} excludeId={product.id} /></Suspense>
<Suspense fallback={<ProductReviewsSkeleton />}><ProductReviews productId={product.id} /></Suspense>
```

`ProductsSliderSkeleton` = 5× the existing `<ProductCardSkeleton />` in `grid-cols-[repeat(5,minmax(0,1fr))] gap-12 px-16`, matching the rail's real geometry (`useProductsSlider` → 5 slides at ≥1024).

**Reviews must not take the page down.** `ProductReviews` catches, logs, and renders "تاکنون نظری ثبت نشده است." (legacy did this too). Reviews are the least important section — a flaky endpoint must never 500 a page whose job is add-to-cart. Do **not** catch in `SimilarProducts`; there an empty rail is the honest outcome.

## 9. Verification

1. `cd front && npx tsc --noEmit` and `npm run lint`.
2. Preview via the Browser pane (dev server on :3000, WordPress on :8080 — both already up in Docker).
3. **Currency check first, it gates everything:** product 12 has `price: "1000"` IRR → the page must render **۱۰۰ تومان**, not ۱٬۰۰۰. Confirm the same number appears in the action bar and the info block (legacy disagreed between the two).
4. Navigate to `/product/product` (id 12, slug `product` — the only product in the store). Confirm: 200, `<h1>`, gallery, price, add-to-cart.
5. **Verify SSR properly** — `view-source:` or `curl -s localhost:3000/product/product | grep`. The product name, price, and description must be in the **initial HTML**, not injected by JS. This is the acceptance test for the "SSR + low-level client islands" requirement.
6. `read_console_messages` for hydration errors — the `dir="rtl"` + Swiper + sticky-bar combination is where they'd appear.
7. Add-to-cart: click → `read_network_requests` shows `POST /api/cart/items` 200 → success toast appears. **Confirm the toast is not painted over by the sticky bar** (the z-40 decision).
8. `/product/does-not-exist` → `not-found.tsx`, not a 500.
9. `resize_window` mobile (375×812) + desktop: sticky bar clears the safe area; specs table doesn't overflow horizontally.
10. Screenshot for the user.

**Seed data caveat:** the store has exactly **one** product, named "Product", with `attributes: []`, `review_count: 0`, no discount, and a Latin slug. So specs, reviews, discount pricing, similar products, and Persian-slug encoding **cannot be verified against real data**. Either seed a realistic product in WP admin (preferred — it's the only way to test the specs table and reviews list) or temporarily render the components against `mockProduct()` fixtures from `app/page.tsx`. Flag whatever stays unverified.

## 10. Risks

1. **Currency (fixed in this plan, but verify at runtime).** The IRR→Toman fix touches `usePrice`, which `ProductCard`/`ProductList`/`ProductsSlider` all share — check the showcase page at `/` still looks right after the change, and consider updating its `IRT` mocks to `IRR`.
2. **`/products` doesn't exist** — 3 links (2 crumbs + "مشاهده همه") 404 by explicit decision. No `next.config` file ⇒ `typedRoutes` off ⇒ no compile error, just runtime 404s.
3. **Persian slugs.** The one seeded product has a Latin slug. Real slugs will be Persian → percent-encoded. Next 16 decodes `params.slug`, so `encodeURIComponent` once for the upstream query and never `decodeURIComponent` (legacy did, risking double-decode). Test with a real Persian slug.
4. **`imageSchema.src` requires `.url()`** — one empty `src` from Woo → `malformed_upstream_response` → whole product 502s. Pre-existing; note only.
5. **`InputStepper` renders Latin digits** (`input-stepper.tsx:173`) → "1" beside "۲۰۰,۰۰۰ تومان". Design-system-level, out of scope, worth a follow-up.
6. **`Container.size` is dead under Tailwind v4** — `max-w-screen-*` was removed in v4 and no caller passes `size`. Don't reach for it.
