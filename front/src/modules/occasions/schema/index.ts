import { z } from "zod";

export const occasionAcfSchema = z.object({
  title: z.string().optional(),
  occasion_date: z.string().optional(),
  repeat_yearly: z.boolean().optional(),
  user_id: z.union([z.number(), z.string(), z.null()]).optional(),
});

export const occasionResponseSchema = z.object({
  id: z.number().optional(),
  author: z.number().optional(),
  acf: occasionAcfSchema.optional(),
});

export const occasionListResponseSchema = z.array(occasionResponseSchema);
