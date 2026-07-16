# Products contract

`listProducts`, `getProductById`, `getProductBySlug`, `listCategories`, and `listSimilarProducts` use Woo Store API product/category routes server-to-server. `listProductReviews` reads Kadochi Core's public review route, which returns only approved WooCommerce reviews. Inputs and upstream responses are Zod-validated; catalog reads are cached for 60 seconds (categories 300 seconds, reviews 120 seconds) and may retry only when a caller explicitly retries the failed read. They never carry customer cookies, cart tokens, or credentials.

`createProductReview` is an authenticated, no-store mutation. The browser posts only to `POST /api/products/:productId/reviews`; that BFF validates the body, forwards the user's opaque JWT to `POST /wp-json/kadochi/v1/reviews`, and invalidates the associated review cache tags. Kadochi Core saves the review with pending status, so it is visible only after WooCommerce moderation.

`getProductBySlug` filters upstream with `?slug=` (`perPage: 5`) and still verifies the result client-side with `.find()` — if the upstream `slug` filter were ever ignored, that guard is the difference between an honest 404 and silently serving the wrong product.
