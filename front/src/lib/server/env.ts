import "server-only";

import { z } from "zod";

import { ServiceError } from "../http/errors";

const wordpressPathSchema = z.string().startsWith("/").max(500).refine(
  (path) => !path.includes("//") && !path.includes("?") && !path.includes("#"),
  "WordPress REST paths must be relative paths without a query or fragment.",
);

const serverEnvironmentSchema = z.object({
  WORDPRESS_INTERNAL_URL: z.string().url().default("http://wordpress"),
  WORDPRESS_URL: z.string().url().default("http://localhost:8080"),
  KADOCHI_AUTH_MODE: z.enum(["local", "wordpress-cookie", "wordpress-jwt"]).optional(),
  KADOCHI_LOCAL_AUTH_SECRET: z.string().min(16).default("kadochi-local-development-only"),
  WORDPRESS_OTP_REQUEST_PATH: wordpressPathSchema.default("/wp-json/kadochi/v1/auth/otp/start"),
  WORDPRESS_OTP_VERIFY_PATH: wordpressPathSchema.default("/wp-json/kadochi/v1/auth/otp/verify"),
  WORDPRESS_OTP_REVOKE_PATH: wordpressPathSchema.optional(),
});

export const env = serverEnvironmentSchema.parse({
  WORDPRESS_INTERNAL_URL: process.env.WORDPRESS_INTERNAL_URL,
  WORDPRESS_URL: process.env.WORDPRESS_URL,
  KADOCHI_AUTH_MODE: process.env.KADOCHI_AUTH_MODE ?? (process.env.NODE_ENV === "development" ? "local" : undefined),
  KADOCHI_LOCAL_AUTH_SECRET: process.env.KADOCHI_LOCAL_AUTH_SECRET,
  WORDPRESS_OTP_REQUEST_PATH: process.env.WORDPRESS_OTP_REQUEST_PATH,
  WORDPRESS_OTP_VERIFY_PATH: process.env.WORDPRESS_OTP_VERIFY_PATH,
  WORDPRESS_OTP_REVOKE_PATH: process.env.WORDPRESS_OTP_REVOKE_PATH,
});

/** Retained for cookie-authenticated legacy domains outside the auth slice. */
export function requireConfiguredIdentity(): "wordpress-cookie" | "wordpress-jwt" {
  if (env.KADOCHI_AUTH_MODE !== "wordpress-cookie" && env.KADOCHI_AUTH_MODE !== "wordpress-jwt") {
    throw new Error("KADOCHI_AUTH_MODE is required before identity-dependent operations can be used.");
  }

  return env.KADOCHI_AUTH_MODE;
}

export function requireLocalIdentity(requestId: string): "local" {
  if (env.KADOCHI_AUTH_MODE !== "local" || process.env.NODE_ENV === "production") {
    throw new ServiceError({
      code: "configuration",
      status: 500,
      message: "Local authentication is available only in development.",
      requestId,
      retryable: false,
    });
  }
  return env.KADOCHI_AUTH_MODE;
}

export function requireWordPressJwtIdentity(requestId: string): "wordpress-jwt" {
  if (env.KADOCHI_AUTH_MODE !== "wordpress-jwt") {
    throw new ServiceError({
      code: "configuration",
      status: 500,
      message: "WordPress JWT authentication is not configured.",
      requestId,
      retryable: false,
    });
  }
  return env.KADOCHI_AUTH_MODE;
}
