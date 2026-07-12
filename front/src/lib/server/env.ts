import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  WORDPRESS_INTERNAL_URL: z.string().url().default("http://wordpress"),
  WORDPRESS_URL: z.string().url().default("http://localhost:8080"),
  KADOCHI_AUTH_MODE: z.enum(["wordpress-cookie"]).optional(),
});

export const env = serverEnvironmentSchema.parse({
  WORDPRESS_INTERNAL_URL: process.env.WORDPRESS_INTERNAL_URL,
  WORDPRESS_URL: process.env.WORDPRESS_URL,
  KADOCHI_AUTH_MODE: process.env.KADOCHI_AUTH_MODE,
});

export function requireConfiguredIdentity(): "wordpress-cookie" {
  if (!env.KADOCHI_AUTH_MODE) {
    throw new Error("KADOCHI_AUTH_MODE is required before identity-dependent operations can be used.");
  }

  return env.KADOCHI_AUTH_MODE;
}
