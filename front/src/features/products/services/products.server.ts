import "server-only";

import { randomUUID } from "crypto";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { categoryQuerySchema, categorySchema, productQuerySchema, upstreamCategoriesSchema, upstreamProductSchemaExport, upstreamProductsSchema } from "../schema/products";
import type { CategoryQuery, ProductQuery } from "../types";
import { mapProduct } from "../utils/map-product";

function productParams(query: ProductQuery): string {
  const input = productQuerySchema.parse(query);
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage) });
  if (input.search) params.set("search", input.search);
  if (input.category) params.set("category", String(input.category));
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
  const products = await listProducts({ search: slug, perPage: 20 });
  const product = products.find((candidate) => candidate.slug === slug);
  if (!product) throw new ServiceError({ code: "not_found", status: 404, message: "Product not found.", requestId: randomUUID(), retryable: false });
  return product;
}

export async function listCategories(query: CategoryQuery = {}) {
  const input = categoryQuerySchema.parse(query);
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage), hide_empty: String(input.hideEmpty) });
  const id = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products/categories?${params}`, { requestId: id, next: { revalidate: 300, tags: ["product-categories"] } });
  return (await parseUpstreamJson(response, (value) => upstreamCategoriesSchema.parse(value), id)).map((category) => categorySchema.parse({ id: category.id, name: category.name, slug: category.slug, parentId: category.parent, productCount: category.count, imageUrl: category.image?.src }));
}
