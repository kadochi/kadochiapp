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
  upstreamCategorySchema,
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
import { isProductIdIdentifier } from "../utils/product-identifier";
import { decodeProductSlug, wordpressProductSlug } from "../utils/product-slug";
import { stripHtml } from "../utils/strip-html";
import { availabilityFirstPage, type AvailabilityPartition } from "../utils/availability-pagination";

// The WordPress REST lookup is occasionally slower while its PHP workers are
// busy. PDP data is public and cacheable, so it can wait longer than cart and
// authentication requests without turning a temporary delay into a page error.
const productReadTimeoutMs = 20_000;

function productParams(query: ProductQuery, stockStatus?: readonly string[]): string {
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
  stockStatus?.forEach((status) => params.append("stock_status[]", status));
  return params.toString();
}

const availabilityStockStatuses: Record<AvailabilityPartition, readonly string[]> = {
  // WooCommerce considers products accepting backorders purchasable, matching
  // the Store API's is_in_stock flag used by the catalog card.
  available: ["instock", "onbackorder"],
  unavailable: ["outofstock"],
};

async function listProductsByAvailability(
  query: ProductQuery,
  partition: AvailabilityPartition,
  page: number,
): Promise<ProductListResult> {
  const input = productQuerySchema.parse({ ...query, page });
  const id = randomUUID();
  const response = await wordpressFetch(
    `/wp-json/wc/store/v1/products?${productParams(input, availabilityStockStatuses[partition])}`,
    { requestId: id, next: { revalidate: 60, tags: ["products", `products:${partition}`] } },
  );
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

/** Public, cacheable Woo Store API reads. Each method validates upstream data before returning it. */
export async function listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
  const input = productQuerySchema.parse(query);
  const firstPages = await Promise.all([
    listProductsByAvailability(input, "available", 1),
    listProductsByAvailability(input, "unavailable", 1),
  ]);
  const partitions: Record<AvailabilityPartition, ProductListResult> = {
    available: firstPages[0],
    unavailable: firstPages[1],
  };
  const { segments, total, totalPages } = availabilityFirstPage({
    page: input.page,
    perPage: input.perPage,
    availableTotal: partitions.available.total,
    unavailableTotal: partitions.unavailable.total,
  });
  const pages = new Map<AvailabilityPartition, Map<number, ProductListResult>>([
    ["available", new Map([[1, partitions.available]])],
    ["unavailable", new Map([[1, partitions.unavailable]])],
  ]);
  const segmentResults = await Promise.all(segments.map(async (segment) => {
    const partitionPages = pages.get(segment.partition)!;
    let result = partitionPages.get(segment.page);
    if (!result) {
      result = await listProductsByAvailability(input, segment.partition, segment.page);
      partitionPages.set(segment.page, result);
    }
    return { result, segment };
  }));
  const items = segmentResults.flatMap(({ result, segment }) => result.items.slice(segment.offset, segment.offset + segment.take));

  return {
    items,
    page: input.page,
    perPage: input.perPage,
    total,
    totalPages,
  };
}

export async function getProductById(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new ServiceError({ code: "validation", status: 400, message: "A valid product ID is required.", requestId: randomUUID(), retryable: false });
  const requestId = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/${id}`, { requestId, timeoutMs: productReadTimeoutMs, next: { revalidate: 60, tags: [`product:${id}`] } });
  return mapProduct(await parseUpstreamJson(response, (value) => upstreamProductSchemaExport.parse(value), requestId));
}

export async function getProductBySlug(slug: string) {
  const input = decodeProductSlug(z.string().trim().min(1).max(200).parse(slug));
  const requestId = randomUUID();
  const response = await wordpressFetch(
    `/wp-json/wc/store/v1/products?${productParams({ slug: input, perPage: 5 })}`,
    { requestId, timeoutMs: productReadTimeoutMs, next: { revalidate: 60, tags: ["products", `product:slug:${input}`] } },
  );
  const products = await parseUpstreamJson(response, (v) => upstreamProductsSchema.parse(v), requestId);
  const match = products.find((candidate) => decodeProductSlug(candidate.slug) === input);
  if (match) return mapProduct(match);

  // The local Store API does not honor `slug` for imported percent-encoded
  // Persian post names. The core WordPress REST endpoint does, so resolve the
  // exact ID there and keep Store API as the source of the product contract.
  const lookupRequestId = randomUUID();
  const params = new URLSearchParams({ slug: wordpressProductSlug(input), per_page: "5" });
  const lookupResponse = await wordpressFetch(`/wp-json/wp/v2/product?${params}`, {
    acceptStatuses: [404],
    requestId: lookupRequestId,
    timeoutMs: productReadTimeoutMs,
    next: { revalidate: 60, tags: ["products", `product:slug:${input}`] },
  });
  if (lookupResponse.status !== 404) {
    const productsBySlug = await parseUpstreamJson(
      lookupResponse,
      (value) => z.array(z.object({ id: z.number().int().positive(), slug: z.string() })).parse(value),
      lookupRequestId,
    );
    const product = productsBySlug.find((candidate) => decodeProductSlug(candidate.slug) === input);
    if (product) return getProductById(product.id);
  }

  throw new ServiceError({ code: "not_found", status: 404, message: "Product not found.", requestId, retryable: false });
}

/**
 * Resolves both public product URL forms. IDs remain supported for existing
 * links, while all newly generated links use the product slug.
 */
export async function getProductByIdentifier(identifier: string) {
  const input = z.string().trim().min(1).max(200).parse(identifier);
  return isProductIdIdentifier(input) ? getProductById(Number(input)) : getProductBySlug(input);
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

function mapCategory(category: z.infer<typeof upstreamCategorySchema>) {
  return categorySchema.parse({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: stripHtml(category.description),
    parentId: category.parent,
    productCount: category.count,
    imageUrl: category.image?.src,
  });
}

/** Resolves a single public product category for legacy numeric URL redirects. */
export async function getCategoryById(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ServiceError({
      code: "validation",
      status: 400,
      message: "A valid category ID is required.",
      requestId: randomUUID(),
      retryable: false,
    });
  }

  const requestId = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/categories/${id}`, {
    requestId,
    next: { revalidate: 300, tags: ["product-categories", `product-category:${id}`] },
  });
  return mapCategory(
    await parseUpstreamJson(response, (value) => upstreamCategorySchema.parse(value), requestId),
  );
}

export async function listCategories(query: CategoryQuery = {}) {
  const input = categoryQuerySchema.parse(query);
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage), hide_empty: String(input.hideEmpty) });
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/categories?${params}`, { requestId: id, next: { revalidate: 300, tags: ["product-categories"] } });
  return (await parseUpstreamJson(response, (value) => upstreamCategoriesSchema.parse(value), id)).map(mapCategory);
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
