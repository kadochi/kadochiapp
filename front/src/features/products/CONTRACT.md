# Products contract

`listProducts`, `getProductById`, `getProductBySlug`, `getProductByIdentifier`, `getCategoryById`, `listCategories`, `listProductTags`, and `listSimilarProducts` use Woo Store API product/category routes server-to-server. `listProducts` returns Woo's validated pagination metadata and translates displayed Toman price filters to Woo's IRR unit. `listProductReviews` reads Kadochi Core's public review route, which returns only approved WooCommerce reviews. Inputs and upstream responses are Zod-validated; catalog reads are cached for 60 seconds (categories/tags 300 seconds, reviews 120 seconds) and may retry only when a caller explicitly retries the failed read. They never carry customer cookies, cart tokens, or credentials.

`createProductReview` is an authenticated, no-store mutation. The browser posts only to `POST /api/products/:productId/reviews`; that BFF validates the body, forwards the user's opaque JWT to `POST /wp-json/kadochi/v1/reviews`, and invalidates the associated review cache tags. Kadochi Core saves the review with pending status, so it is visible only after WooCommerce moderation.

`getProductActions` and `updateProductAction` use the authenticated same-origin `/api/products/:productId/actions` BFF. Kadochi Core persists each like or save as one row per customer, product, and action in the `wp_kadochi_product_actions` table (the `wp_` prefix varies by installation), so WooCommerce product-list engagement counts are durable and count distinct users.

The authenticated `/api/profile/product-actions` BFF resolves a customer's ordered saved or liked product IDs into the standard validated product-card contract. It is used exclusively by the profile wishlist and favorites pages, which retain the newest-first action order.

`getProductBySlug` first filters the Store API with `?slug=` (`perPage: 5`) and verifies the result client-side with `.find()`. When that filter returns no exact match, it uses WordPress's core product REST endpoint to resolve the product ID before fetching the validated Store API representation. Both cacheable PDP reads allow 20 seconds for a temporarily busy WordPress worker; cart and authentication reads keep the shared 8-second timeout.

WordPress's local Store API exposes imported Persian product `post_name` values percent-encoded but does not honor its own `slug` filter for those records. Product mapping decodes those values for frontend routes; on a Store API miss, the service resolves the exact encoded post name through `wp/v2/product` and then fetches the product by its Store API ID. WordPress's WooCommerce product base remains `product`, matching the frontend's `/product/:identifier` route.

The product detail route accepts both `/product/:id` and `/product/:slug`. Numeric IDs are resolved through the Woo Store API and permanently redirected to `/product/:slug`, which is the sole canonical/indexable URL. This preserves existing indexed links without splitting SEO signals between two pages.

The product catalog accepts both `/products?category=:id` and `/products?category=:slug`. Numeric category IDs are resolved through the Woo Store API and permanently redirected to the slug form while preserving every other query parameter. Newly generated category links always use slugs; a missing numeric category retains the catalog's unknown-filter empty state.
