## Performance Improvements Implemented

Date: 2025-11-15
Author: Engineering
Scope: Next.js API routes, proxy, WordPress/Woo clients, and client proxy helper.

### Summary

- Reduced worst-case latency and tail amplification by tightening per-attempt timeouts, lowering retries, and adding an outer time budget to the WP proxy.
- Enabled CDN/ISR caching for read-heavy GETs when explicitly requested or when safe (ETag present), reducing upstream load and median latency.
- Tuned products API caching TTLs to better leverage the CDN for hot lists.

### Code Changes

- Proxy route (`src/app/api/wp/[...path]/route.ts`)

  - DEFAULT_TIMEOUT_MS: 10_000 → 6_000
  - MAX_RETRIES_IDEMPOTENT: 3 → 2
  - Added OUTER_BUDGET_MS_GET ≈ 8_000 with Promise.race for GET/HEAD/OPTIONS

- Client proxy helper (`src/services/http/proxy.client.ts`)

  - Added `revalidateSeconds` option
  - When `revalidateSeconds` is provided: use `cache: "force-cache"` and `next: { revalidate }`
  - Otherwise default to `cache: "no-store"` (preserves previous behavior)

- Products API (`src/app/api/products/route.ts`)

  - Increased `EDGE_S_MAXAGE` 30 → 120; kept `stale-while-revalidate=300`
  - Include-mode: if an ETag is available, return `public` cache control with short TTL; otherwise `no-store`

- WordPress client (`src/services/wordpress/index.ts`)

  - DEFAULT_TIMEOUT_MS: 10_000 → 7_000
  - DEFAULT_RETRIES: 3 → 2

- Woo client (`src/lib/api/woo.ts`)
  - Default timeout: 8_000 → 7_000

### Expected Impact

- Faster failover on upstream incidents; reduced p95/p99 due to lower per-attempt timeout and retries with an outer cap.
- Lower upstream traffic and improved cache hit ratios for product listings and include-mode responses.
- More consistent perceived performance across instances due to CDN caching of read-heavy endpoints.

### Backwards Compatibility

- Proxy behavior for non-idempotent methods (POST/PUT/PATCH/DELETE) unchanged aside from lower per-attempt timeout.
- Client proxy still defaults to `no-store`; caching is opt-in via `revalidateSeconds` to avoid accidental caching of stateful endpoints.

### Operational Notes

- Consider monitoring upstream 5xx/429 and timeouts after deploy to tune timeouts further.
- Ensure any endpoints that must remain dynamic do not pass `revalidateSeconds`.

### How to Verify

1. Proxy budget:
   - Hit `/api/wp/wp-json/…` on a test endpoint that sleeps > 8s; expect timeout response within ~8s rather than >20s.
2. Products list:
   - Call `/api/products?page=1&per_page=12` twice; second call should be served faster with `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`.
3. Include mode:
   - Call `/api/products?include=ID1,ID2`; verify ETag-based short-term caching when ETag is present.
4. Client proxy helper:
   - From server components or route handlers, call `proxyGetJSON("/wp-json/...",{ revalidateSeconds: 120 })`; confirm CDN caching headers are present.

### Risks

- More visible 5xx/timeout surfacing during upstream incidents due to reduced retries/timeouts; mitigated by faster feedback to users and outer caps.
- Caching must only be enabled on safe, read-only endpoints.
