import { z } from "zod";

const storeImageSchema = z.object({
  id: z.number(),
  src: z.string(),
  alt: z.string().optional(),
  name: z.string().optional(),
});

const storePriceSchema = z.object({
  price: z.string().optional(),
  regular_price: z.string().optional(),
  sale_price: z.string().optional(),
  currency_code: z.string().optional(),
  currency_minor_unit: z.number().optional(),
});

const storeAttributeSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  terms: z.array(z.object({ name: z.string(), slug: z.string().optional() })).optional(),
  options: z.array(z.string()).optional(),
});

const storeCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  image: z.object({ src: z.string().nullable().optional() }).nullable().optional(),
});

const storeTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const wooStoreProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  permalink: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  images: z.array(storeImageSchema).optional(),
  prices: storePriceSchema.optional(),
  is_in_stock: z.boolean().optional().nullable(),
  is_purchasable: z.boolean().optional().nullable(),
  stock_status: z.string().optional().nullable(),
  stock_quantity: z.number().optional().nullable(),
  average_rating: z.string().optional().nullable(),
  rating_count: z.number().optional().nullable(),
  review_count: z.number().optional().nullable(),
  categories: z.array(storeCategorySchema).optional(),
  tags: z.array(storeTagSchema).optional(),
  attributes: z.array(storeAttributeSchema).optional(),
  type: z.string().optional(),
  meta_data: z.array(z.object({ key: z.string(), value: z.unknown() })).optional(),
});

export const wooV3ProductSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  slug: z.string().optional(),
  permalink: z.string().optional(),
  description: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  regular_price: z.string().optional().nullable(),
  sale_price: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  images: z.array(z.object({ src: z.string().optional().nullable(), alt: z.string().optional().nullable() })).optional(),
  stock_status: z.string().optional().nullable(),
  manage_stock: z.boolean().optional().nullable(),
  stock_quantity: z.number().optional().nullable(),
  is_in_stock: z.boolean().optional().nullable(),
  is_purchasable: z.boolean().optional().nullable(),
  purchasable: z.boolean().optional().nullable(),
  average_rating: z.string().optional().nullable(),
  rating_count: z.number().optional().nullable(),
  categories: z.array(z.object({ id: z.number().optional(), name: z.string().optional(), slug: z.string().optional() })).optional(),
  tags: z.array(z.object({ id: z.number().optional(), name: z.string().optional(), slug: z.string().optional() })).optional(),
  attributes: z.array(z.any()).optional(),
  meta_data: z.array(z.object({ key: z.string().optional(), value: z.unknown() })).optional(),
});

export const wooStoreCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  image: z.object({ id: z.number(), src: z.string(), alt: z.string().optional() }).nullable().optional(),
});

export const wooStoreCategoriesSchema = z.array(wooStoreCategorySchema);

export const wooStoreProductsSchema = z.array(wooStoreProductSchema);

export type WooStoreProduct = z.infer<typeof wooStoreProductSchema>;
export type WooV3Product = z.infer<typeof wooV3ProductSchema>;
export type WooStoreCategory = z.infer<typeof wooStoreCategorySchema>;
export type WooStoreImage = z.infer<typeof storeImageSchema>;
export type WooStorePrice = z.infer<typeof storePriceSchema>;
