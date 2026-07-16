import { bffJson } from "@/lib/http/browser";
import { createProductReviewInputSchema, productReviewSubmissionSchema } from "../schema/products";
import type { CreateProductReviewInput, ProductReviewSubmission } from "../types";

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
