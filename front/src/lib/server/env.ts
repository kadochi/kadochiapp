import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  WORDPRESS_INTERNAL_URL: z.string().url().default("http://wordpress"),
});

export const env = serverEnvironmentSchema.parse({
  WORDPRESS_INTERNAL_URL: process.env.WORDPRESS_INTERNAL_URL,
});
