import type { z } from "zod";
import type {
  categoryQuerySchema,
  categorySchema,
  createProductReviewInputSchema,
  productQuerySchema,
  productReviewSchema,
  productReviewSubmissionSchema,
  productSchema,
  reviewQuerySchema,
} from "./schema/products";

export type Product = z.infer<typeof productSchema>;
export type ProductImage = Product["images"][number];
export type ProductAttribute = Product["attributes"][number];
export type ProductCategory = z.infer<typeof categorySchema>;
export type ProductQuery = z.input<typeof productQuerySchema>;
export type CategoryQuery = z.input<typeof categoryQuerySchema>;
export type ProductReview = z.infer<typeof productReviewSchema>;
export type CreateProductReviewInput = z.input<typeof createProductReviewInputSchema>;
export type ProductReviewSubmission = z.infer<typeof productReviewSubmissionSchema>;
export type ReviewQuery = z.input<typeof reviewQuerySchema>;
export type SimilarProductsQuery = { categoryId?: number; excludeId: number; perPage?: number };
