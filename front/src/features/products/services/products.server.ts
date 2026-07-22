import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import {
  categoryQuerySchema,
  createProductReviewInputSchema,
  categorySchema,
  productQuerySchema,
  reviewQuerySchema,
  upstreamCategoriesSchema,
  upstreamProductSchemaExport,
  upstreamProductTagsSchema,
  upstreamProductsSchema,
  upstreamReviewsSchema,
  productReviewSubmissionSchema,
  productActionsSchema,
  updateProductActionInputSchema,
} from "../schema/products";
import { wordpressBearerHeaders } from "@/features/auth/services/auth.server";
import type {
  CategoryQuery,
  CreateProductReviewInput,
  ProductActions,
  ProductListResult,
  ProductQuery,
  ReviewQuery,
  SimilarProductsQuery,
} from "../types";
import { mapProduct } from "../utils/map-product";
import { mapReview } from "../utils/map-review";
import { stripHtml } from "../utils/strip-html";

function productParams(query: ProductQuery): string {
  const input = productQuerySchema.parse(query);
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage) });
  if (input.search) params.set("search", input.search);
  if (input.category) params.set("category", String(input.category));
  if (input.slug) params.set("slug", input.slug);
  if (input.order) params.set("order", input.order);
  if (input.orderby) params.set("orderby", input.orderby);
  if (input.tags?.length) {
    params.set("tag", input.tags.join(","));
    if (input.tagOperator) params.set("tag_operator", input.tagOperator);
  }
  // The storefront presents IRR prices as Toman. The Store API expects the
  // amount in the smallest currency unit, so convert back to Rial here.
  if (input.minPrice) params.set("min_price", String(Number(input.minPrice) * 10));
  if (input.maxPrice) params.set("max_price", String(Number(input.maxPrice) * 10));
  if (input.exclude?.length) params.set("exclude", input.exclude.join(","));
  if (input.include?.length) params.set("include", input.include.join(","));
  return params.toString();
}

/** Public, cacheable Woo Store API reads. Each method validates upstream data before returning it. */
export async function listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
  const input = productQuerySchema.parse(query);
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products?${productParams(input)}`, { requestId: id, next: { revalidate: 60, tags: ["products"] } });
  const total = Number(response.headers.get("x-wp-total"));
  const totalPages = Number(response.headers.get("x-wp-totalpages"));
  const items = (await parseUpstreamJson(response, (value) => upstreamProductsSchema.parse(value), id)).map(mapProduct);
  return {
    items,
    page: input.page,
    perPage: input.perPage,
    total: Number.isSafeInteger(total) && total >= 0 ? total : items.length,
    totalPages: Number.isSafeInteger(totalPages) && totalPages >= 0 ? totalPages : (items.length ? 1 : 0),
  };
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
    productId: String(input.productId),
    page: String(input.page),
    per_page: String(input.perPage),
  });
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/kadochi/v1/reviews?${params}`, {
    requestId: id,
    // Admin-created comments should be visible on the next PDP render rather
    // than waiting for the former two-minute cache window.
    cache: "no-store",
  });
  return (await parseUpstreamJson(response, (v) => upstreamReviewsSchema.parse(v), id)).map(mapReview);
}

/** Creates a pending review through Kadochi Core using the caller's opaque JWT. */
export async function createProductReview(input: CreateProductReviewInput, requestId: string) {
  const review = createProductReviewInputSchema.parse(input);
  const response = await wordpressFetch("/wp-json/kadochi/v1/reviews", {
    method: "POST",
    body: JSON.stringify(review),
    headers: { "Content-Type": "application/json", ...(await wordpressBearerHeaders()) },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => productReviewSubmissionSchema.parse(value), requestId);
}

/** Reads and changes the signed-in customer's durable product likes and saves. */
export async function getProductActions(productId: number, requestId: string): Promise<ProductActions> {
  const id = z.coerce.number().int().positive().parse(productId);
  const response = await wordpressFetch(`/wp-json/kadochi/v1/product-actions?productId=${id}`, {
    headers: await wordpressBearerHeaders(), cache: "no-store", requestId,
  });
  return parseUpstreamJson(response, (value) => productActionsSchema.parse(value), requestId);
}

export async function updateProductAction(input: unknown, requestId: string): Promise<ProductActions> {
  const action = updateProductActionInputSchema.parse(input);
  const response = await wordpressFetch("/wp-json/kadochi/v1/product-actions", {
    method: "PUT", body: JSON.stringify(action), headers: { "Content-Type": "application/json", ...(await wordpressBearerHeaders()) }, cache: "no-store", requestId,
  });
  return parseUpstreamJson(response, (value) => productActionsSchema.parse(value), requestId);
}

/** Records a client-rendered product detail visit for the WooCommerce admin metric. */
export async function recordProductView(productId: number, requestId: string): Promise<void> {
  const id = z.coerce.number().int().positive().parse(productId);
  const response = await wordpressFetch("/wp-json/kadochi/v1/product-views", {
    method: "POST",
    body: JSON.stringify({ productId: id }),
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    requestId,
  });
  await parseUpstreamJson(response, (value) => z.object({ views: z.number().int().nonnegative() }).parse(value), requestId);
}

export async function listSimilarProducts({ categoryId, excludeId, perPage = 8 }: SimilarProductsQuery) {
  const query = { exclude: [excludeId], perPage, orderby: "popularity" as const };
  if (!categoryId) return (await listProducts(query)).items;

  const categoryProducts = await listProducts({ ...query, category: categoryId });
  // A category can be empty or only contain the current product. Keep a useful
  // related-products rail by falling back to the catalog's popular products.
  return categoryProducts.items.length
    ? categoryProducts.items
    : (await listProducts(query)).items;
}

export async function listCategories(query: CategoryQuery = {}) {
  const input = categoryQuerySchema.parse(query);
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage), hide_empty: String(input.hideEmpty) });
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/categories?${params}`, { requestId: id, next: { revalidate: 300, tags: ["product-categories"] } });
  return (await parseUpstreamJson(response, (value) => upstreamCategoriesSchema.parse(value), id)).map((category) => categorySchema.parse({ id: category.id, name: category.name, slug: category.slug, description: stripHtml(category.description), parentId: category.parent, productCount: category.count, imageUrl: category.image?.src }));
}

/** Lists public product tags so URL-friendly PLP filters can resolve to IDs. */
export async function listProductTags() {
  const id = randomUUID();
  const response = await wordpressFetch("/wp-json/wc/store/v1/products/tags?per_page=100&hide_empty=true", {
    requestId: id,
    next: { revalidate: 300, tags: ["product-tags"] },
  });
  return (await parseUpstreamJson(response, (value) => upstreamProductTagsSchema.parse(value), id)).map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    productCount: tag.count,
  }));
}
