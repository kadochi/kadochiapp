import { z } from "zod";

export const WPMetaSchema = z
  .object({
    id: z.number(),
    key: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })
  .passthrough();
export type WPMeta = z.infer<typeof WPMetaSchema>;

export const WPMediaSchema = z
  .object({
    id: z.number(),
    date: z.string(),
    slug: z.string(),
    link: z.string(),
    source_url: z.string(),
    alt_text: z.string().optional(),
    media_type: z.string().optional(),
    mime_type: z.string().optional(),
    title: z.object({ rendered: z.string() }).optional(),
    media_details: z
      .object({
        width: z.number().optional(),
        height: z.number().optional(),
        sizes: z
          .record(
            z.string(),
            z.object({
              source_url: z.string(),
              width: z.number(),
              height: z.number(),
            }),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type WPMedia = z.infer<typeof WPMediaSchema>;

export const WPPostBaseSchema = z
  .object({
    id: z.number(),
    date: z.string(),
    slug: z.string(),
    link: z.string(),
    status: z.string(),
    title: z.object({ rendered: z.string() }),
    content: z
      .object({
        rendered: z.string(),
        protected: z.boolean().optional(),
      })
      .optional(),
    excerpt: z.object({ rendered: z.string() }).optional(),
  })
  .passthrough();
export type WPPostBase = z.infer<typeof WPPostBaseSchema>;

export const WPPostSchema = WPPostBaseSchema.extend({
  type: z.literal("post"),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.number()).optional(),
  featured_media: z.number().optional(),
});
export type WPPost = z.infer<typeof WPPostSchema>;

export const WPPageSchema = WPPostBaseSchema.extend({
  type: z.literal("page"),
  parent: z.number().optional(),
});
export type WPPage = z.infer<typeof WPPageSchema>;
