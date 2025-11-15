## Kadochi API and Routes – Performance Review

Date: 2025-11-15
Author: Engineering
Scope: Next.js routes under `src/app/api/*`, WordPress/WooCommerce client stack, proxy, and middleware.

### Summary

- Observed slow responses and intermittent errors primarily stem from upstream WordPress/WooCommerce latency and the current retry/timeout policies which amplify tail latency under incident conditions.
- Additional contributors include multiple upstream lookups per request (taxonomy resolution), aggressive `no-store` usage preventing cache benefits, and per-instance in-memory caches that are not shared across instances.

### Key Hotspots

1. WordPress Proxy: `src/app/api/wp/[...path]/route.ts`

- Per-attempt timeout: 10s. Retries: up to 3 for idempotent methods with exponential backoff (jitter, max delay ~5s).
- 5xx/429 trigger retries; auth redirects are converted to errors.
- Effect: During upstream spikes, worst-case request time can approach tens of seconds, causing slow tails.

2. Products API: `src/app/api/products/route.ts`

- List mode (PLP) has an outer 7s cap and returns controlled errors on timeout. Good safety net, but the underlying fetch involves:
  - Category/tag resolution (extra HTTP calls) then main listing fetch.
  - Small per-instance in-memory LRU (20s TTL, 100 entries) – reduces bursts but is not shared across instances.
- Include mode fetch relies on ETag and a small in-memory cache; responses use `Cache-Control: no-store`, missing CDN benefits for repeated access patterns.

3. WordPress/Woo clients: `src/services/wordpress/index.ts`, `src/lib/api/woo.ts`

- Defaults: 10s per-attempt timeout, up to 3 retries for idempotent requests; 5xx/429 retried.
- Many helper functions perform extra network calls for taxonomy resolution (category/tag), even though cached via `react.cache` with revalidate windows; cache effectiveness varies across instances.

4. Client proxy helper: `src/services/http/proxy.client.ts`

- Enforces `cache: "no-store"` which disables ISR/CDN caching on read-heavy endpoints; increases upstream load and median latency.

5. Middleware: `src/middleware.ts`

- Runs on `/api/:path*` and adds headers. Overhead is small, not a primary cause.

### Likely Causes of Slowness and Intermittent Errors

- Upstream latency spikes and transient 5xx/429 from WordPress/Woo.
- Retry/backoff plus long per-attempt timeouts cause prolonged waits before failure unless guarded by an outer cap (not all endpoints have one).
- Multiple upstream calls per request (taxonomy resolution) inflate median latency on cache-cold paths.
- `no-store` usage on some clients prevents caching, missing CDN/ISR wins.
- In-memory caches are per-instance; under load balancers, cache hit ratios appear intermittent.

### Recommendations (Prioritized)

1. Cap Worst-Case Latency at the Proxy

- Reduce per-attempt timeout in `src/app/api/wp/[...path]/route.ts` from 10s → 5–6s.
- Reduce retries for idempotent methods from 3 → 2, or add a total time budget per request (outer Promise.race) and stop further retries once exceeded.

2. Enable Caching for Read-Heavy GETs

- Update `proxyGetJSON` to accept `revalidateSeconds`, forwarding `next: { revalidate }` and omitting `cache: "no-store"` when set.
- For `/api/products` list responses, consider increasing `s-maxage` from 30s → 60–120s if product catalog is relatively stable, keeping `stale-while-revalidate` high (e.g., 300s).
- For include mode, consider returning `public, s-maxage=...` where consistent with correctness and rely on ETag for freshness.

3. Reduce Extra Upstream Calls on PLP

- Persist category/tag slug resolutions with a longer TTL (1–6 hours) to avoid repeated lookups.
- Optionally move to a shared cache (Redis/KV) so multiple instances benefit and reduce perceived intermittency.

4. Add Structured Logging and Correlation IDs

- In proxy and WordPress client, log structured records for errors/timeouts/retries: route, method, URL, attempt, status, error code, and total duration; include a request ID.
- Surface aggregated metrics (rate of 5xx/429, p50/p95 response time per endpoint) to correlate with user reports.

5. Apply Outer Time Budgets Where Missing

- Maintain or introduce Promise.race guards around heavy endpoints that currently rely solely on retries (e.g., proxy handler). Align budgets with UX (5–7s typical).

6. Optional: Shared LRU for Hot Keys

- Replace per-instance Map LRUs with a small Redis/KV-backed cache for hot product list keys to improve hit ratios and consistency across instances.

### Proposed Tactical Changes

- Proxy handler (`src/app/api/wp/[...path]/route.ts`):

  - DEFAULT_TIMEOUT_MS: 10_000 → 6_000
  - MAX_RETRIES_IDEMPOTENT: 3 → 2
  - Add optional outer guard: overall budget ~7–8s for GETs.

- Client proxy helper (`src/services/http/proxy.client.ts`):

  - Add optional `revalidateSeconds` param to set `next: { revalidate }` and skip `cache: "no-store"` when provided.

- Products API (`src/app/api/products/route.ts`):

  - Increase `EDGE_S_MAXAGE`=30 → 60–120 if acceptable.
  - Keep `stale-while-revalidate` high (300s).
  - Consider `public` caching for include mode when ETag present.

- Woo/WordPress clients (`src/services/wordpress/index.ts`, `src/lib/api/woo.ts`):
  - Shorten default timeouts by endpoint criticality (e.g., listing 6–7s; taxonomy 3–5s).
  - Keep retries but reduce to 2 attempts for GETs where UX favors fast failover.

### Observability & Metrics to Add

- Log fields: `req_id`, `route`, `method`, `url`, `status`, `attempt`, `error_code`, `duration_ms`, `upstream_host`.
- Counters: upstream 5xx, 429, timeouts, network errors.
- Histograms: response time per endpoint (p50/p95/p99).
- Dashboards/alerts: spikes in 5xx/429 and p95 above SLO thresholds.

### Risks

- Lowering timeouts/retries may surface more 5xx/timeout errors quickly; guard with user-facing fallbacks and clear error messages.
- Expanding caching must respect correctness (auth/stateful endpoints must remain no-store).

### Next Steps

1. Implement proxy timeout/retry reductions and optional total budget.
2. Add `revalidateSeconds` support to client proxy; enable caching on read-heavy paths.
3. Extend taxonomy resolution cache TTL and/or migrate to shared cache.
4. Add structured logging and correlate with production error reports.
5. Reassess p95 latency and error rates after changes; tune further as needed.

---

Appendix – Notable Constants (as of review):

- Proxy per-attempt timeout: 10_000 ms; retries: 3 (idempotent)
- Products list cap: 7_000 ms outer timeout
- Products CDN caching: `s-maxage=30`, `stale-while-revalidate=300`
