# Products contract

`listProducts`, `getProductById`, `getProductBySlug`, and `listCategories` use Woo Store API product/category routes server-to-server. Inputs and upstream responses are Zod-validated; catalog reads are cached for 60 seconds (categories 300 seconds) and may retry only when a caller explicitly retries the failed read. They never carry customer cookies, cart tokens, or credentials.
