import type { z } from "zod";
import type { categoryQuerySchema, categorySchema, productQuerySchema, productSchema } from "./schema/products";

export type Product = z.infer<typeof productSchema>;
export type ProductCategory = z.infer<typeof categorySchema>;
export type ProductQuery = z.input<typeof productQuerySchema>;
export type CategoryQuery = z.input<typeof categoryQuerySchema>;
