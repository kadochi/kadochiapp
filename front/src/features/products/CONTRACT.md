# Products contract

`listProducts`, `getProductById`, `getProductBySlug`, `listCategories`, `listProductTags`, and `listSimilarProducts` use Woo Store API product/category routes server-to-server. `listProducts` returns Woo's validated pagination metadata and translates displayed Toman price filters to Woo's IRR unit. `listProductReviews` reads Kadochi Core's public review route, which returns only approved WooCommerce reviews. Inputs and upstream responses are Zod-validated; catalog reads are cached for 60 seconds (categories/tags 300 seconds, reviews 120 seconds) and may retry only when a caller explicitly retries the failed read. They never carry customer cookies, cart tokens, or credentials.

`createProductReview` is an authenticated, no-store mutation. The browser posts only to `POST /api/products/:productId/reviews`; that BFF validates the body, forwards the user's opaque JWT to `POST /wp-json/kadochi/v1/reviews`, and invalidates the associated review cache tags. Kadochi Core saves the review with pending status, so it is visible only after WooCommerce moderation.

`getProductActions` and `updateProductAction` use the authenticated same-origin `/api/products/:productId/actions` BFF. Kadochi Core persists each like or save as one row per customer, product, and action in the `wp_kadochi_product_actions` table (the `wp_` prefix varies by installation), so WooCommerce product-list engagement counts are durable and count distinct users.

The authenticated `/api/profile/product-actions` BFF resolves a customer's ordered saved or liked product IDs into the standard validated product-card contract. It is used exclusively by the profile wishlist and favorites pages, which retain the newest-first action order.

`getProductBySlug` filters upstream with `?slug=` (`perPage: 5`) and still verifies the result client-side with `.find()` — if the upstream `slug` filter were ever ignored, that guard is the difference between an honest 404 and silently serving the wrong product.
