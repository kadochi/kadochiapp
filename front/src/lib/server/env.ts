import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  WORDPRESS_INTERNAL_URL: z.string().url().default("http://wordpress"),
  KADOCHI_PAYMENT_METHOD_ID: z.string().trim().min(1).max(100).default("WC_ZPal"),
  KADOCHI_FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

export const env = serverEnvironmentSchema.parse({
  WORDPRESS_INTERNAL_URL: process.env.WORDPRESS_INTERNAL_URL,
  KADOCHI_PAYMENT_METHOD_ID: process.env.KADOCHI_PAYMENT_METHOD_ID,
  KADOCHI_FRONTEND_URL: process.env.KADOCHI_FRONTEND_URL,
});
