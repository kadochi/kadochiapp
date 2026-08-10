# Performance incident fix plan — 2026-08-10

## Objective

Stop intermittent whole-site slowdowns, upstream `504` responses, and images
that fail on the first request but appear after a reload. The plan prioritizes
removing request amplification and bounding resource use before restoring
optional storefront features.

The code review confirms several mechanisms that can amplify a slow or
cache-cold WordPress request. It does not, by itself, prove which mechanism
initiated the production incident. Production logs and saturation metrics must
be collected during the mitigation and rollout steps below.

## Confirmed findings

### P0: cacheable WordPress reads time out without cancellation

**Code evidence: confirmed. Incident causality: leading hypothesis, not yet
proven. Introduced by `27699f8` on 2026-08-10.**

`front/src/lib/http/upstream.ts` treats cacheable GET requests differently from
mutations and no-store reads:

- the fetch is started without an `AbortSignal`;
- `Promise.race()` stops the caller waiting after eight seconds by default;
- an `UpstreamError` containing `code: "timeout"` and `status: 504` is thrown;
- the original fetch remains active after the caller has stopped waiting.

The focused unit test explicitly verifies that the cacheable request has no
signal and remains uncancelled at the deadline.

This can retain open Next.js-to-WordPress connections during a slow cache miss.
If PHP, Apache, or MySQL is already saturated, retries and new traffic can add
work faster than it completes. Aborting the HTTP client is still not guaranteed
to interrupt an already-running PHP script or MySQL query immediately, so PHP
worker and database evidence is required before calling this the proven root
cause.

The embedded `504` status is preserved by BFF API routes that call
`jsonError()`. It is not guaranteed for every server-rendered page: some pages
catch upstream failures and return a degraded `200`, while an unhandled Server
Component error may become a generic server error.

### P0: the image proxy has the same uncancelled deadline and adds CPU work

**Code evidence: confirmed. Directly matches the reported missing-image
symptom. Expanded by `27699f8` on 2026-08-10.**

WordPress uploads used by `next/image` are routed through `GET /api/images`.
For every uncached width/format variant, the route:

1. downloads the source from the WordPress container;
2. waits up to eight seconds for response headers and up to another eight
   seconds while reading the body;
3. transforms the image to AVIF or WebP with Sharp in the Next.js process; and
4. returns a long-lived cacheable response only after the transformation
   succeeds.

The source fetch is deliberately signal-free. A header or body deadline returns
`504`, but the underlying fetch or stalled read is not reliably cancelled.
Sharp transformation also has no concurrency limit or execution deadline.

This explains images that fail initially and appear after reload: the first
variant request can return `502` or `504`, while a later request succeeds after
load falls or an upstream/cache layer becomes warm. The route currently catches
these failures without structured logging, so the audit's upstream log search
does not include image failures.

Commit `7b03870` made initial and adjacent product-card images eager. This is not
an independent explanation for whole-site server errors, but it can increase the
number of simultaneous image-proxy requests during the failure window.

### P0: article related-product discovery multiplies WordPress traffic

**Code evidence: confirmed. Introduced by `4ca2b89` on 2026-08-07.**

Every article render starts `ArticleRelatedProducts` behind a `Suspense`
boundary. Streaming the fallback does not cancel or defer its server work. On a
cache miss, `listArticleRelatedProducts()` performs:

- two taxonomy requests: all product tags and up to 100 categories;
- up to three `listProducts()` calls in parallel: tag, category, and search;
- a fourth `listProducts()` fallback when there are too few candidates.

For page one, each `listProducts()` call issues one available and one
out-of-stock Woo Store API request. The related-product rail therefore adds up
to **8 WordPress requests**, or **10 with the fallback**, in addition to article,
sidebar, comments, and related-article reads.

### P1: preparation metadata is evaluated for every Store API product

**Code evidence: confirmed. Database cost requires profiling. Introduced by
`2076465` on 2026-08-05.**

The Woo Store API `ProductSchema` extension invokes `get_post_meta()` for every
product emitted by a catalog response. This is definitely an extra callback and
metadata lookup per product, but it is not necessarily a separate SQL query per
product because WordPress or WooCommerce may already have primed the metadata
cache. It becomes more expensive when the object cache and local metadata cache
are cold.

### P1: article view tracking writes to `wp_postmeta`

**Code evidence: confirmed. Introduced by `14776d9` on 2026-08-07.**

An article that remains open for 15 seconds sends a view request. The endpoint
updates the counter using a direct `UPDATE` on `wp_postmeta`. It does not run for
every page load because the browser timer is cancelled if the component
unmounts before 15 seconds. Concurrent engaged views of the same popular article
can still contend on the same metadata row and add writes during a read-heavy
incident.

### P0 operational dependency: Redis object cache status is unknown

**Deployment risk: confirmed. Production state: must be checked.**

The production image installs the pinned Redis Object Cache plugin, and Compose
provides Redis settings plus `WP_CACHE=true`. Normal container startup does not
activate the plugin or create its `object-cache.php` drop-in. The documented
explicit enable command is required. Environment variables alone do not prove
that persistent object caching is active.

## Changes not considered primary causes

- Product-card eager image loading can amplify image request concurrency, but it
  does not by itself explain slow WordPress API queries or PHP/MySQL saturation.
- Cart cross-sells (`2d0a008`) are limited to basket APIs and basket traffic.
- Checkout postcard changes (`642318e`) are limited to authenticated checkout
  and order paths.

These changes can add local load in their respective flows, but they do not have
the same whole-site fan-out as the confirmed P0 mechanisms.

## Target architecture

### API transport and caching

Use one small, predictable WordPress transport for every request. Transport is
responsible only for URL construction, bounded timeouts, cancellation, safe
error mapping, and structured logging. It must not keep a request alive after
the caller deadline merely because the response is cacheable.

Apply caching explicitly at the public service boundary:

- cache public products, categories, tags, articles, and other anonymous reads
  with appropriate revalidation periods and invalidation tags;
- use `no-store` for authentication, cart, checkout, profile, customer-specific
  reads, and every mutation;
- never cache a request carrying authorization, cookies, cart tokens, customer
  identifiers, or other user-specific state;
- do not retry mutations automatically;
- allow only bounded, intentional retries for idempotent public reads.

This separates data policy from network lifecycle: public data can remain
cacheable without requiring an uncancelled HTTP request.

### Image delivery

Use the standard optimized `next/image` pipeline. Remove the handwritten
`/api/images` route and custom loader, but do **not** set `unoptimized` on
WordPress images.

Configure `next.config.ts` with a narrowly scoped remote pattern for
`https://api.kadochi.com/wp-content/uploads/**`, the required quality values,
modern AVIF/WebP output, and an appropriate minimum cache TTL. The browser will
request optimized variants through Next.js's built-in `/_next/image` endpoint.
This remains an image proxy on cache misses, but it replaces the custom fetch,
deadline, body buffering, and Sharp implementation with Next.js's supported
optimizer and cache behavior.

Every `Image` must retain an accurate `sizes` value. Preload only the true LCP
image, eagerly load only images already visible in the initial viewport, and
lazy-load off-screen images. The edge/CDN must cache successful `/_next/image`
responses, and the deployment must avoid losing the entire optimized-image
cache on every restart.

## Fix plan

### Phase 0 — capture evidence before restarting services

Capture the incident window if the deployment is currently unhealthy. Do not
delay containment for an extended investigation.

```sh
docker compose logs --since 24h nextjs | grep '\[upstream\] request_failed'
docker compose logs --since 24h wordpress
docker compose exec --user www-data wordpress wp redis status
docker compose exec mysql mysql -uroot -p -e 'SHOW FULL PROCESSLIST;'
docker compose exec mysql mysql -uroot -p -e 'SHOW GLOBAL STATUS LIKE "Threads_%";'
```

Also use browser Network tools on a failed page and record:

- the request URL, especially `/api/images?...`;
- HTTP status (`502`, `504`, or another status);
- duration, transferred bytes, and response body;
- whether the same URL succeeds on immediate reload.

The current image route does not log failures, so browser or reverse-proxy logs
are required until Phase 2 instrumentation is deployed.

### Phase 1 — immediate containment

Deploy these changes together or in this order:

1. **Disable article related-product discovery.** Remove the component from the
   article page or place it behind a production-disabled feature flag. Keep it
   disabled until a precomputed or single-query implementation passes the load
   criteria below.
2. **Simplify and bound WordPress fetching.** Make every request use the same
   abortable transport and terminate at its caller deadline. Move public
   caching decisions into the product, content, and magazine service functions.
   Keep user-specific reads and mutations `no-store`. Update the transport tests
   to require an aborted signal for a timed-out public read and to prove that
   authenticated/user-specific requests cannot enter a shared cache.
3. **Replace the custom image pipeline.** Remove `GET /api/images`, remove
   `wordpress-image-loader.ts`, and remove `images.loader`/`images.loaderFile`
   from `next.config.ts`. Configure the default Next.js image optimizer with a
   restricted WordPress uploads `remotePatterns` entry, AVIF/WebP formats,
   allowed quality values, and a deliberate cache TTL. Continue using
   `next/image` without the `unoptimized` prop.
4. **Reduce the initial image burst.** Temporarily return non-LCP product-card
   images to lazy loading. Keep only the actual above-the-fold LCP candidate at
   high priority.
5. **Verify Redis rather than assuming it is enabled.** If the plugin, drop-in,
   and connection are healthy, enable it with the documented command and verify
   database `1` plus the `kadochi:wordpress:` prefix. If Redis is unhealthy,
   disable it cleanly and continue without an uncertain cache layer.

Containment is complete when new requests stop accumulating after their
deadlines, article renders no longer start the product-discovery fan-out, and
the custom image route is no longer in the production request path. Confirm
that WordPress uploads are accepted only through the configured Next.js remote
pattern and that optimized variants load successfully through `/_next/image`.

### Phase 2 — instrument every failure path

Add structured logs and metrics before attempting feature restoration:

- For `wordpressFetch()`: endpoint, method, cacheable flag, timeout phase,
  duration, request ID, result status, and in-flight request count.
- For optimized images: `/_next/image` status and duration, requested width and
  quality, negotiated format, source-host status, cache hit/miss when available,
  Next.js CPU/memory during cold transformations, and first-attempt success
  rate. Use sanitized upload pathnames or hashes rather than full source URLs.
- For WordPress: Apache/PHP active and queued workers, request duration by REST
  path, and slow-request samples.
- For MySQL: slow query log, active threads, connection count, lock waits, and
  query duration grouped by normalized query.
- For Redis: connection state, hit/miss ratio, evictions, memory usage, and
  drop-in status.

Do not log query credentials, authorization headers, cookies, customer data,
payment data, or full source URLs containing sensitive query strings.

Alert separately on:

- cacheable upstream timeouts;
- built-in image optimizer `4xx`/`5xx` rates;
- PHP/Apache worker saturation;
- MySQL thread or lock pressure;
- Next.js CPU/memory pressure during cold image optimization;
- Redis disconnection or a missing drop-in.

### Phase 3 — make the built-in image optimizer cache-efficient

After the custom image route has been removed:

1. Verify that only the WordPress uploads origin/path is allowed by
   `remotePatterns`; do not permit a general-purpose remote image proxy.
2. Keep the configured `deviceSizes`, `imageSizes`, and `qualities` small and
   intentional so arbitrary variants cannot create an unbounded cache surface.
3. Verify that the edge/CDN caches successful `/_next/image` responses while
   respecting format negotiation. Record cold and warm optimizer latency.
4. Make the optimized-image cache durable enough for the deployment model, or
   rely on a verified edge cache, so routine container replacement does not
   trigger a site-wide cold transformation burst.
5. Preserve accurate `sizes` declarations and inspect generated `srcset`
   candidates on mobile and desktop. Do not send desktop-sized sources to
   narrow product cards.
6. Prefer WordPress-generated source sizes close to the maximum rendered size
   where the API exposes them, avoiding downloads of unnecessarily large
   originals before Next.js optimization.
7. If built-in optimization still causes unacceptable cold-cache CPU or latency,
   move image transformation to a dedicated image CDN rather than recreating a
   custom application route.
8. Add a user-visible fallback and a bounded client retry for transient image
   failures. The retry is resilience only and must not conceal optimizer or
   upstream capacity problems.

### Phase 4 — replace request-heavy recommendations

Do not restore the existing article rail unchanged. Replace it with one of:

- editor-assigned product IDs stored with the article;
- a precomputed recommendation list refreshed on article/product changes;
- one dedicated WordPress endpoint that performs bounded ranking server-side
  and returns the final products;
- a cached lookup keyed by normalized article taxonomy.

The restored implementation must use at most one recommendation request on an
article cache miss and must not issue parallel available/out-of-stock queries
for several speculative sources.

### Phase 5 — remove hot-path metadata and counter pressure

1. Profile Store API queries with Redis both enabled and disabled. If
   preparation-time metadata is measurable, bulk-prime the relevant meta keys,
   expose the value through WooCommerce's existing product data, or denormalize
   it into a lookup optimized for catalog reads.
2. Replace direct per-view article counter writes with analytics events, a
   Redis counter flushed in batches, or another atomic counter designed for
   write volume.
3. If the `wp_postmeta` counter remains temporarily, confirm its query plan and
   row-lock behavior under concurrent updates before adding an index. Do not add
   an index based only on assumption; WordPress already has a `post_id` index,
   and the benefit of a composite index depends on the actual data distribution.

## Verification and acceptance criteria

Run cold-cache, warm-cache, and sustained-load tests against a production-like
stack. Include homepage, catalog, magazine article, product detail, BFF APIs,
and multiple image widths/formats.

The mitigation is accepted only when all of the following are true:

- timed-out WordPress API requests are observably aborted;
- in-flight request counts return to baseline after the test instead of growing;
- article requests do not execute the old 8–10 request recommendation fan-out;
- no generated page or asset URL references the removed `/api/images` route;
- optimized WordPress images are served through `/_next/image` with responsive
  widths and modern formats;
- `/_next/image` has no unexplained `4xx`/`5xx` responses during expected load;
- cold image optimization does not exhaust Next.js CPU or memory, and warm
  requests demonstrate the expected cache behavior;
- no PHP/Apache worker queue grows continuously;
- MySQL threads, connections, and lock waits recover after a burst;
- Redis status confirms the intended drop-in, database, prefix, and healthy
  connection when caching is enabled;
- page and API error rates remain within the production SLO for at least one
  cache-expiry cycle and one sustained-load window;
- images load on first attempt across the tested pages and responsive widths.

Record p50, p95, and p99 TTFB and total duration, error rate, maximum in-flight
requests, PHP worker utilization, MySQL active threads, Redis hit rate, cold and
warm `/_next/image` latency, Next.js CPU/memory, image cache effectiveness, and
image first-attempt success rate. A few warm manual requests are not sufficient
to close the incident.

## Rollout and rollback order

1. Capture the available incident evidence.
2. Disable article related products and reduce nonessential eager images.
3. Deploy the simplified abortable API transport and explicit public caching.
4. Replace the custom image route with the built-in Next.js optimizer and add
   optimizer/reverse-proxy observability.
5. Verify or explicitly disable Redis object caching.
6. Run production-like load tests, then canary the deployment.
7. Monitor one full data and image cache-expiry cycle before broad rollout.
8. Complete edge image caching and the replacement recommendation design.
9. Address metadata reads and view-counter writes using measured profiles.

Keep each phase independently reversible. If error rate, latency, worker queues,
or image failures regress during rollout, revert the most recent phase while
retaining the containment flags and observability needed to diagnose it.
