import { z } from "zod";

export const magazineCommentQuerySchema = z.object({
  postId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().max(100).default(1),
  perPage: z.coerce.number().int().positive().max(50).default(20),
});

const upstreamMagazineCommentSchema = z.object({
  id: z.number().int().positive(),
  date_created: z.string(),
  post_id: z.number().int().positive(),
  author: z.string().default(""),
  content: z.string().default(""),
  author_avatar_urls: z.record(z.string(), z.string()).optional(),
});

export const upstreamMagazineCommentsSchema = z.array(upstreamMagazineCommentSchema);

export const magazineCommentSchema = z.object({
  id: z.number().int().positive(),
  author: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string(),
  content: z.string(),
});

export const createMagazineCommentInputSchema = z.object({
  postId: z.coerce.number().int().positive(),
  content: z.string().trim().min(3).max(1000),
}).strict();

export const magazineCommentSubmissionSchema = z.object({
  id: z.number().int().positive(),
  status: z.literal("pending"),
});
