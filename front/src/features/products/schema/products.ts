import { z } from "zod";

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.coerce.number().int().positive().optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  exclude: z.array(z.coerce.number().int().positive()).max(20).optional(),
  /** Product tag IDs resolved by the PLP before querying the Store API. */
  tags: z.array(z.coerce.number().int().positive()).min(1).max(20).optional(),
  tagOperator: z.enum(["in", "and"]).optional(),
  /** Displayed Toman amounts; the service translates them to Woo's IRR unit. */
  minPrice: z.string().regex(/^\d{1,12}$/).optional(),
  maxPrice: z.string().regex(/^\d{1,12}$/).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  orderby: z.enum(["date", "id", "menu_order", "popularity", "rating", "price", "title"]).optional(),
});

export const categoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
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

const upstreamAttributeSchema = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  taxonomy: z.string().nullable().optional(),
  has_variations: z.boolean().optional(),
  terms: z.array(z.object({ id: z.number().int().optional(), name: z.string(), slug: z.string().optional() })).default([]),
});

const upstreamProductTagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
});

const upstreamProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  prices: priceSchema,
  images: z.array(imageSchema).default([]),
  categories: z.array(z.object({ id: z.number().int(), name: z.string(), slug: z.string() })).default([]),
  tags: z.array(upstreamProductTagSchema).default([]),
  attributes: z.array(upstreamAttributeSchema).default([]),
  is_in_stock: z.boolean().default(false),
  is_purchasable: z.boolean().default(false),
  average_rating: z.union([z.string(), z.number()]).optional(),
  review_count: z.number().int().optional(),
});

export const upstreamProductsSchema = z.array(upstreamProductSchema);
export const upstreamProductSchemaExport = upstreamProductSchema;
export const upstreamCategoriesSchema = z.array(z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string(), parent: z.number().int().nonnegative().default(0), count: z.number().int().nonnegative().default(0), image: imageSchema.nullable().optional() }));
export const upstreamProductTagsSchema = z.array(z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  description: z.string().default(""),
  count: z.number().int().nonnegative().default(0),
}));

export const moneySchema = z.object({ amount: z.string().regex(/^\d+$/), currencyCode: z.string().length(3), minorUnit: z.number().int().min(0).max(4) });
export const productAttributeSchema = z.object({ name: z.string().min(1), value: z.string().min(1) });
export const productTermSchema = z.object({ id: z.number().int().positive(), name: z.string().min(1), slug: z.string().min(1) });
export const productSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  price: moneySchema,
  regularPrice: moneySchema.optional(),
  salePrice: moneySchema.optional(),
  images: z.array(z.object({ id: z.number().int().optional(), url: z.string().url(), thumbnailUrl: z.string().url().optional(), alt: z.string() })),
  categories: z.array(z.object({ id: z.number().int(), name: z.string(), slug: z.string() })),
  tags: z.array(productTermSchema),
  attributes: z.array(productAttributeSchema),
  averageRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  inStock: z.boolean(),
  purchasable: z.boolean(),
});
export const productListResultSchema = z.object({
  items: z.array(productSchema),
  page: z.number().int().positive(),
  perPage: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const categorySchema = z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string(), parentId: z.number().int().nonnegative(), productCount: z.number().int().nonnegative(), imageUrl: z.string().url().optional() });
export const productTagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  productCount: z.number().int().nonnegative(),
});

export const reviewQuerySchema = z.object({
  productId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(50).default(20),
});

const upstreamReviewSchema = z.object({
  id: z.number().int().positive(),
  date_created: z.string(),
  product_id: z.number().int(),
  reviewer: z.string().default(""),
  review: z.string().default(""),
  rating: z.number().min(0).max(5).nullable().optional(),
  verified: z.boolean().default(false),
  reviewer_avatar_urls: z.record(z.string(), z.string()).optional(),
});
export const upstreamReviewsSchema = z.array(upstreamReviewSchema);

export const productReviewSchema = z.object({
  id: z.number().int().positive(),
  author: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  rating: z.number().min(0).max(5).nullable(),
  createdAt: z.string(),
  content: z.string(),
  verified: z.boolean(),
});

export const createProductReviewInputSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(3).max(1000),
}).strict();

export const productReviewSubmissionSchema = z.object({
  id: z.number().int().positive(),
  status: z.literal("pending"),
});
