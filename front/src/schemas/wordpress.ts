import { z } from "zod";
import { WooOrderLineItemSchema, WooOrderSchema, WooStoreProductSchema } from "./woo";

export { WooStoreProductSchema, WooOrderLineItemSchema, WooOrderSchema };
export type { WooStoreProduct, WooOrderLineItem, WooOrder } from "./woo";

const WordPressIDSchema = z.number();
const WordPressSlugSchema = z.string();

const WordPressRenderedTextSchema = z
  .object({
    rendered: z.string(),
    protected: z.boolean().optional(),
  })
  .passthrough();

export const WordPressBaseEntitySchema = z
  .object({
    id: WordPressIDSchema,
    date: z.string().optional(),
    date_gmt: z.string().optional(),
    modified: z.string().optional(),
    modified_gmt: z.string().optional(),
    slug: WordPressSlugSchema.optional(),
    link: z.string().optional(),
  })
  .passthrough();
export type WordPressBaseEntity = z.infer<typeof WordPressBaseEntitySchema>;

export const WordPressPostSchema = WordPressBaseEntitySchema.extend({
  type: z.string(),
  title: WordPressRenderedTextSchema.nullable().optional(),
  content: WordPressRenderedTextSchema.nullable().optional(),
  excerpt: WordPressRenderedTextSchema.nullable().optional(),
  author: WordPressIDSchema.optional(),
  featured_media: WordPressIDSchema.optional(),
  categories: z.array(WordPressIDSchema).optional(),
  tags: z.array(WordPressIDSchema).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type WordPressPost = z.infer<typeof WordPressPostSchema>;

export const WordPressPageSchema = WordPressBaseEntitySchema.extend({
  type: z.string(),
  title: WordPressRenderedTextSchema.nullable().optional(),
  content: WordPressRenderedTextSchema.nullable().optional(),
  template: z.string().optional(),
  parent: WordPressIDSchema.nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type WordPressPage = z.infer<typeof WordPressPageSchema>;

export const WordPressMediaSchema = WordPressBaseEntitySchema.extend({
  mime_type: z.string().optional(),
  source_url: z.string().optional(),
  alt_text: z.string().optional(),
  media_type: z.string().optional(),
  media_details: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      sizes: z
        .record(
          z.string(),
          z.object({
            file: z.string(),
            width: z.number(),
            height: z.number(),
            mime_type: z.string(),
            source_url: z.string(),
          }),
        )
        .optional(),
    })
    .passthrough()
    .optional(),
});
export type WordPressMedia = z.infer<typeof WordPressMediaSchema>;

export const WordPressCategorySchema = z
  .object({
    id: WordPressIDSchema,
    name: z.string(),
    slug: WordPressSlugSchema,
    description: z.string().optional(),
    parent: WordPressIDSchema.optional(),
    count: z.number().optional(),
  })
  .passthrough();
export type WordPressCategory = z.infer<typeof WordPressCategorySchema>;

export const WordPressTagSchema = z
  .object({
    id: WordPressIDSchema,
    name: z.string(),
    slug: WordPressSlugSchema,
    description: z.string().optional(),
  })
  .passthrough();
export type WordPressTag = z.infer<typeof WordPressTagSchema>;

export const WordPressOccasionSchema = z
  .object({
    id: z.number().optional(),
    author: z.number().optional(),
    acf: z
      .object({
        title: z.string().optional(),
        occasion_date: z.string().optional(),
        repeat_yearly: z.boolean().optional(),
        user_id: z.union([z.number(), z.string(), z.null()]).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type WordPressOccasion = z.infer<typeof WordPressOccasionSchema>;
