# Products contract

`listProducts`, `getProductById`, `getProductBySlug`, `listCategories`, `listProductReviews`, and `listSimilarProducts` use Woo Store API product/category/review routes server-to-server. Inputs and upstream responses are Zod-validated; catalog reads are cached for 60 seconds (categories 300 seconds, reviews 120 seconds) and may retry only when a caller explicitly retries the failed read. They never carry customer cookies, cart tokens, or credentials.

`getProductBySlug` filters upstream with `?slug=` (`perPage: 5`) and still verifies the result client-side with `.find()` — if the upstream `slug` filter were ever ignored, that guard is the difference between an honest 404 and silently serving the wrong product.
