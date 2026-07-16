import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import {
  categoryQuerySchema,
  categorySchema,
  productQuerySchema,
  reviewQuerySchema,
  upstreamCategoriesSchema,
  upstreamProductSchemaExport,
  upstreamProductsSchema,
  upstreamReviewsSchema,
} from "../schema/products";
import type { CategoryQuery, ProductQuery, ReviewQuery, SimilarProductsQuery } from "../types";
import { mapProduct } from "../utils/map-product";
import { mapReview } from "../utils/map-review";

function productParams(query: ProductQuery): string {
  const input = productQuerySchema.parse(query);
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage) });
  if (input.search) params.set("search", input.search);
  if (input.category) params.set("category", String(input.category));
  if (input.slug) params.set("slug", input.slug);
  if (input.orderby) params.set("orderby", input.orderby);
  if (input.exclude?.length) params.set("exclude", input.exclude.join(","));
  return params.toString();
}

/** Public, cacheable Woo Store API reads. Each method validates upstream data before returning it. */
export async function listProducts(query: ProductQuery = {}) {
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products?${productParams(query)}`, { requestId: id, next: { revalidate: 60, tags: ["products"] } });
  return (await parseUpstreamJson(response, (value) => upstreamProductsSchema.parse(value), id)).map(mapProduct);
}

export async function getProductById(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new ServiceError({ code: "validation", status: 400, message: "A valid product ID is required.", requestId: randomUUID(), retryable: false });
  const requestId = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/${id}`, { requestId, next: { revalidate: 60, tags: [`product:${id}`] } });
  return mapProduct(await parseUpstreamJson(response, (value) => upstreamProductSchemaExport.parse(value), requestId));
}

export async function getProductBySlug(slug: string) {
  const input = z.string().trim().min(1).max(200).parse(slug);
  const requestId = randomUUID();
  const response = await wordpressFetch(
    `/wp-json/wc/store/v1/products?${productParams({ slug: input, perPage: 5 })}`,
    { requestId, next: { revalidate: 60, tags: ["products", `product:slug:${input}`] } },
  );
  const products = await parseUpstreamJson(response, (v) => upstreamProductsSchema.parse(v), requestId);
  const match = products.find((candidate) => candidate.slug === input);
  if (!match) throw new ServiceError({ code: "not_found", status: 404, message: "Product not found.", requestId, retryable: false });
  return mapProduct(match);
}

export async function listProductReviews(query: ReviewQuery) {
  const input = reviewQuerySchema.parse(query);
  const params = new URLSearchParams({
    product_id: String(input.productId),
    page: String(input.page),
    per_page: String(input.perPage),
  });
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/reviews?${params}`, {
    requestId: id,
    next: { revalidate: 120, tags: ["product-reviews", `product:${input.productId}:reviews`] },
  });
  return (await parseUpstreamJson(response, (v) => upstreamReviewsSchema.parse(v), id)).map(mapReview);
}

export async function listSimilarProducts({ categoryId, excludeId, perPage = 8 }: SimilarProductsQuery) {
  return listProducts({ category: categoryId, exclude: [excludeId], perPage, orderby: "popularity" });
}

export async function listCategories(query: CategoryQuery = {}) {
  const input = categoryQuerySchema.parse(query);
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage), hide_empty: String(input.hideEmpty) });
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/categories?${params}`, { requestId: id, next: { revalidate: 300, tags: ["product-categories"] } });
  return (await parseUpstreamJson(response, (value) => upstreamCategoriesSchema.parse(value), id)).map((category) => categorySchema.parse({ id: category.id, name: category.name, slug: category.slug, parentId: category.parent, productCount: category.count, imageUrl: category.image?.src }));
}
