import { bffJson } from "@/lib/http/browser";
import {
  createProductReviewInputSchema,
  productListResultSchema,
  productQuerySchema,
  productReviewSubmissionSchema,
  productActionsSchema,
  updateProductActionInputSchema,
} from "../schema/products";
import type {
  CreateProductReviewInput,
  ProductListResult,
  ProductQuery,
  ProductReviewSubmission,
  ProductActions,
} from "../types";

/** Submits a customer review through the same-origin BFF; no auth token reaches the browser. */
export function createProductReview(
  productId: number,
  input: Omit<CreateProductReviewInput, "productId">,
): Promise<ProductReviewSubmission> {
  const payload = createProductReviewInputSchema.parse({ productId, ...input });
  return bffJson(
    `/api/products/${payload.productId}/reviews`,
    { method: "POST", body: JSON.stringify({ rating: payload.rating, content: payload.content }) },
    (value) => productReviewSubmissionSchema.parse(value),
  );
}

export function getProductActions(productId: number): Promise<ProductActions> {
  return bffJson(`/api/products/${productId}/actions`, { method: "GET" }, (value) => productActionsSchema.parse(value));
}

export function updateProductAction(productId: number, action: "like" | "save", active: boolean): Promise<ProductActions> {
  const payload = updateProductActionInputSchema.parse({ productId, action, active });
  return bffJson(`/api/products/${payload.productId}/actions`, { method: "PUT", body: JSON.stringify({ action: payload.action, active: payload.active }) }, (value) => productActionsSchema.parse(value));
}

/** Fetches a subsequent public catalog page through the same-origin BFF. */
export function fetchProductsPage(
  query: ProductQuery,
  options: Pick<RequestInit, "signal"> = {},
): Promise<ProductListResult> {
  const input = productQuerySchema.parse(query);
  const params = new URLSearchParams({
    page: String(input.page),
    perPage: String(input.perPage),
  });
  if (input.search) params.set("search", input.search);
  if (input.category) params.set("category", String(input.category));
  if (input.tags?.length) params.set("tag", input.tags.join(","));
  if (input.tagOperator) params.set("tagOperator", input.tagOperator);
  if (input.minPrice) params.set("minPrice", input.minPrice);
  if (input.maxPrice) params.set("maxPrice", input.maxPrice);
  if (input.order) params.set("order", input.order);
  if (input.orderby) params.set("orderby", input.orderby);
  if (input.sameDayDelivery) params.set("sameDayDelivery", "1");

  return bffJson(
    `/api/products?${params}`,
    { method: "GET", ...options },
    (value) => productListResultSchema.parse(value),
  );
}
