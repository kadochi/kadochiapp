import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  WORDPRESS_INTERNAL_URL: z.string().url().default("http://wordpress"),
  KADOCHI_CHECKOUT_ENABLED: z.enum(["true", "false"]).default("false"),
  KADOCHI_PAYMENT_METHOD_ID: z.string().trim().min(1).max(100).default("zarinpal"),
  KADOCHI_FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

export const env = serverEnvironmentSchema.parse({
  WORDPRESS_INTERNAL_URL: process.env.WORDPRESS_INTERNAL_URL,
  KADOCHI_CHECKOUT_ENABLED: process.env.KADOCHI_CHECKOUT_ENABLED,
  KADOCHI_PAYMENT_METHOD_ID: process.env.KADOCHI_PAYMENT_METHOD_ID,
  KADOCHI_FRONTEND_URL: process.env.KADOCHI_FRONTEND_URL,
});
