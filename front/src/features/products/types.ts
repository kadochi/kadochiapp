import type { z } from "zod";
import type {
  categoryQuerySchema,
  categorySchema,
  createProductReviewInputSchema,
  productQuerySchema,
  productListResultSchema,
  productReviewSchema,
  productReviewSubmissionSchema,
  productActionsSchema,
  productSchema,
  productTagSchema,
  reviewQuerySchema,
} from "./schema/products";

export type Product = z.infer<typeof productSchema>;
export type ProductImage = Product["images"][number];
export type ProductAttribute = Product["attributes"][number];
export type ProductCategory = z.infer<typeof categorySchema>;
export type ProductTag = z.infer<typeof productTagSchema>;
export type ProductQuery = z.input<typeof productQuerySchema>;
export type CategoryQuery = z.input<typeof categoryQuerySchema>;
export type ProductReview = z.infer<typeof productReviewSchema>;
export type CreateProductReviewInput = z.input<typeof createProductReviewInputSchema>;
export type ProductReviewSubmission = z.infer<typeof productReviewSubmissionSchema>;
export type ProductActions = z.infer<typeof productActionsSchema>;
export type ReviewQuery = z.input<typeof reviewQuerySchema>;
export type SimilarProductsQuery = { categoryId?: number; excludeId: number; perPage?: number };
export type ProductListResult = z.infer<typeof productListResultSchema>;
