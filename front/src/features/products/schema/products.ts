import { z } from "zod";

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.coerce.number().int().positive().optional(),
});

export const categoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(50).default(20),
  hideEmpty: z.boolean().default(false),
});

const priceSchema = z.object({
  price: z.string(),
  regular_price: z.string().optional(),
  sale_price: z.string().optional(),
  currency_code: z.string().length(3),
  currency_minor_unit: z.number().int().min(0).max(4),
  currency_decimal_separator: z.string().optional(),
  currency_thousand_separator: z.string().optional(),
  currency_prefix: z.string().optional(),
  currency_suffix: z.string().optional(),
});

const imageSchema = z.object({ id: z.number().int().optional(), src: z.string().url(), thumbnail: z.string().url().optional(), alt: z.string().optional(), name: z.string().optional() });

const upstreamProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  prices: priceSchema,
  images: z.array(imageSchema).default([]),
  categories: z.array(z.object({ id: z.number().int(), name: z.string(), slug: z.string() })).default([]),
  is_in_stock: z.boolean().default(false),
  is_purchasable: z.boolean().default(false),
  average_rating: z.string().optional(),
  review_count: z.number().int().optional(),
});

export const upstreamProductsSchema = z.array(upstreamProductSchema);
export const upstreamProductSchemaExport = upstreamProductSchema;
export const upstreamCategoriesSchema = z.array(z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string(), parent: z.number().int().nonnegative().default(0), count: z.number().int().nonnegative().default(0), image: imageSchema.nullable().optional() }));

export const moneySchema = z.object({ amount: z.string().regex(/^\d+$/), currencyCode: z.string().length(3), minorUnit: z.number().int().min(0).max(4) });
export const productSchema = z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string(), description: z.string(), shortDescription: z.string(), price: moneySchema, regularPrice: moneySchema.optional(), salePrice: moneySchema.optional(), images: z.array(z.object({ id: z.number().int().optional(), url: z.string().url(), thumbnailUrl: z.string().url().optional(), alt: z.string() })), categories: z.array(z.object({ id: z.number().int(), name: z.string(), slug: z.string() })), inStock: z.boolean(), purchasable: z.boolean() });
export const categorySchema = z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string(), parentId: z.number().int().nonnegative(), productCount: z.number().int().nonnegative(), imageUrl: z.string().url().optional() });
