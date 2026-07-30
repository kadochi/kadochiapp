import { z } from "zod";

export const magazineQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(24).default(12),
  category: z.coerce.number().int().positive().optional(),
  tag: z.coerce.number().int().positive().optional(),
  exclude: z.array(z.coerce.number().int().positive()).max(20).optional(),
});

const embeddedTermSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  taxonomy: z.string().optional(),
});

const featuredMediaSchema = z.object({
  alt_text: z.string().default(""),
  source_url: z.string().url().optional(),
  media_details: z.object({
    sizes: z.record(z.string(), z.object({ source_url: z.string().url() })).optional(),
  }).optional(),
});

const upstreamMagazineSchema = z.object({
  id: z.number().int().positive(),
  date: z.string(),
  modified: z.string(),
  slug: z.string(),
  title: z.object({ rendered: z.string() }),
  excerpt: z.object({ rendered: z.string().default("") }),
  content: z.object({ rendered: z.string().default("") }),
  _embedded: z.object({
    author: z.array(z.object({ name: z.string().default("تحریریه کادوچی") })).optional(),
    "wp:featuredmedia": z.array(featuredMediaSchema).optional(),
    "wp:term": z.array(z.array(embeddedTermSchema)).optional(),
  }).optional(),
});

export const upstreamMagazinesSchema = z.array(upstreamMagazineSchema);
export const upstreamMagazineCategoriesSchema = z.array(z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  description: z.string().default(""),
}));
export const magazineArticleSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string(),
  publishedAt: z.string(),
  modifiedAt: z.string(),
  authorName: z.string(),
  image: z.object({ url: z.string().url(), alt: z.string() }).optional(),
  categories: z.array(z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string() })),
  tags: z.array(z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string() })),
  readingTime: z.number().int().positive(),
});
