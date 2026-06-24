# Refactor Audit — Phase 0 Baseline

Generated: 2026-06-24

## Current State Summary

### Routes (app/)
| Route Group | Pages | Client Files |
|---|---|---|
| `(auth)/login` | page.tsx | LoginClient, SigninInner, OtpInner |
| `(front)/(statics)` | about, contact, faq, privacy, shipping, terms | — |
| `(front)/basket` | page.tsx | CartPageClient |
| `(front)/checkout` | page, failure, success, zp-callback | CheckoutClient, SuccessClient |
| `(front)/occasions` | page | OccasionsClient, AddOccasionSheet, OccasionRow |
| `(front)/product/[id]` | page, error, loading | ActionBar, ProductComments, ProductDescription, ProductInfo, ProductReview, ProductSpecs, ProductTags |
| `(front)/products` | page, error, loading | AllFiltersSheet, CategoriesSheet, FiltersBar, OccasionsSheet, PriceSheet, SheetsPortal, SortSheet |
| `(front)/profile` | page, info/page, orders/page, orders/[id]/page | ProfilePageClient, InfoForm, OrdersPageClient, OrderDetailClient |
| `(front)/` | page.tsx (home) | — |

### API Routes (app/api/)
| Route | Purpose |
|---|---|
| `auth/logout` | Clear session |
| `auth/otp/start` | Send OTP SMS |
| `auth/otp/verify` | Verify OTP code |
| `auth/session` | Get current session from WP |
| `checkout/start` | Create WooCommerce order |
| `occasions/[id]` | Delete occasion |
| `occasions/new` | Create occasion |
| `orders/[id]` | Get order detail |
| `orders/` | List customer orders |
| `pay/start` | Initiate Zarinpal payment |
| `pay/verify` | Verify Zarinpal payment |
| `products/bulk` | Bulk product lookup |
| `products/` | Product listing with LRU cache |
| `profile/update` | Update customer profile |
| `reviews/` | Create product review |
| `store/categories/` | List store categories |
| `wp-proxy/[...path]` | WordPress proxy |
| `wp/[...path]` | WordPress proxy (authenticated) |

### Domains (src/domains/)
| Domain | Components | Services | Hooks | Models | State |
|---|---|---|---|---|---|
| auth | — | session.server (real), otp.server (empty) | useAuth (empty) | session (real), user (empty) | session-context.tsx |
| basket | BasketList (empty), BasketSummary (empty) | — | — | basket (empty) | basket-context.tsx |
| catalog | CategoryCarousel, ImageGallery, ProductCard, ProductCarousel, ProductGallery (empty), ProductList | categories.ts (real) | useCatalogFilters (empty) | product (real), category (empty), tag (empty) | — |
| checkout | CheckoutForm (empty) | pay.server (empty) | — | order (empty) | — |
| content | — | wp.server (empty) | — | media (empty), page (empty), post (empty) | — |
| occasions | OccasionCarousel, OccasionLabel, OccasionCart | — | — | — | — |
| statics | AboutSection | — | — | — | — |

### Services (src/services/)
| Service | Purpose |
|---|---|
| wordpress/index.ts | Core fetch wrapper (retry, dedup, ETag, proxy fallback) |
| wordpress/client.ts | Client-side useWordPressFetch hook |
| http/errors.ts | Custom error classes |
| http/retry.ts | Retry with exponential backoff + jitter |
| http/proxy.client.ts | Client-side proxy GET helper |
| http/serialize-fetch-error.ts | Error serialization |
| payment/zarinpal.ts | Zarinpal SDK wrapper |
| cache/revalidate.ts | ISR revalidation helpers |

### Data Fetching Pattern
- **Server**: `wordpressFetch()` / `wooFetch()` from `services/wordpress/` + `lib/api/woo.ts`
- **Client**: Raw `fetch()` to `/api/...` endpoints (34 occurrences)
- **No React Query / SWR / Axios**
- **No Zod** — types manually declared
- ISR via `export const revalidate` and `next.revalidate`

### Styling
- **58 CSS Modules** across all components
- **CSS Custom Properties** in `styles/tokens.css` (design tokens)
- **No Tailwind** — no tailwind.config, no postcss config
- Font: IRANSansXFaNum (Persian)

### Empty Stub Files (19 total)
auth/models/user.ts, auth/hooks/useAuth.ts, auth/services/otp.server.ts,
basket/models/basket.ts, basket/components/BasketList.tsx, basket/components/BasketSummary.tsx,
catalog/models/category.ts, catalog/models/tag.ts, catalog/components/ProductGallery/*,
catalog/hooks/useCatalogFilters.ts,
checkout/models/order.ts, checkout/components/CheckoutForm.tsx, checkout/services/pay.server.ts,
content/* (4 files), content/utils/seo.ts

### CI Status
- `npm run lint`: 0 errors, 229 warnings
- No test framework installed
- No typecheck script in package.json (only dev, build, start, lint)
