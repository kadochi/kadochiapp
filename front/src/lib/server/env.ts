import "server-only";

import { z } from "zod";

import { ServiceError } from "../http/errors";

const wordpressPathSchema = z.string().startsWith("/").max(500).refine(
  (path) => !path.includes("//") && !path.includes("?") && !path.includes("#"),
  "WordPress REST paths must be relative paths without a query or fragment.",
);

const optionalEnvironmentString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().optional(),
);

const optionalUrlSchema = optionalEnvironmentString.pipe(z.string().url().optional());
const optionalSecretSchema = optionalEnvironmentString.pipe(z.string().min(32).optional());
const optionalCredentialSchema = optionalEnvironmentString.pipe(z.string().min(1).optional());

const serverEnvironmentSchema = z.object({
  WORDPRESS_INTERNAL_URL: z.string().url().default("http://wordpress"),
  WORDPRESS_URL: z.string().url().default("http://localhost:8080"),
  KADOCHI_AUTH_MODE: z.enum(["local", "wordpress-cookie", "wordpress-jwt", "melipayamak"]).optional(),
  KADOCHI_LOCAL_AUTH_SECRET: z.string().min(16).default("kadochi-local-development-only"),
  KADOCHI_AUTH_SECRET: optionalSecretSchema,
  WORDPRESS_OTP_REQUEST_PATH: wordpressPathSchema.default("/wp-json/kadochi/v1/auth/otp/start"),
  WORDPRESS_OTP_VERIFY_PATH: wordpressPathSchema.default("/wp-json/kadochi/v1/auth/otp/verify"),
  WORDPRESS_OTP_REVOKE_PATH: wordpressPathSchema.optional(),
  MELIPAYAMAK_OTP_URL: optionalUrlSchema,
  REDIS_URL: optionalUrlSchema,
  WOO_CONSUMER_KEY: optionalCredentialSchema,
  WOO_CONSUMER_SECRET: optionalCredentialSchema,
  OTP_CODE_TTL_SEC: z.coerce.number().int().min(60).max(600).default(180),
  OTP_ATTEMPT_RATE_PER_HOUR: z.coerce.number().int().min(1).max(20).default(3),
  OTP_VERIFY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
});

export const env = serverEnvironmentSchema.parse({
  WORDPRESS_INTERNAL_URL: process.env.WORDPRESS_INTERNAL_URL,
  WORDPRESS_URL: process.env.WORDPRESS_URL,
  KADOCHI_AUTH_MODE: process.env.KADOCHI_AUTH_MODE ?? (process.env.NODE_ENV === "development" ? "local" : undefined),
  KADOCHI_LOCAL_AUTH_SECRET: process.env.KADOCHI_LOCAL_AUTH_SECRET,
  KADOCHI_AUTH_SECRET: process.env.KADOCHI_AUTH_SECRET,
  WORDPRESS_OTP_REQUEST_PATH: process.env.WORDPRESS_OTP_REQUEST_PATH,
  WORDPRESS_OTP_VERIFY_PATH: process.env.WORDPRESS_OTP_VERIFY_PATH,
  WORDPRESS_OTP_REVOKE_PATH: process.env.WORDPRESS_OTP_REVOKE_PATH,
  MELIPAYAMAK_OTP_URL: process.env.MELIPAYAMAK_OTP_URL,
  REDIS_URL: process.env.REDIS_URL,
  WOO_CONSUMER_KEY: process.env.WOO_CONSUMER_KEY,
  WOO_CONSUMER_SECRET: process.env.WOO_CONSUMER_SECRET,
  OTP_CODE_TTL_SEC: process.env.OTP_CODE_TTL_SEC,
  OTP_ATTEMPT_RATE_PER_HOUR: process.env.OTP_ATTEMPT_RATE_PER_HOUR,
  OTP_VERIFY_ATTEMPTS: process.env.OTP_VERIFY_ATTEMPTS,
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

export type MeliPayamakAuthConfig = {
  authSecret: string;
  otpAttemptRatePerHour: number;
  otpCodeTtlSeconds: number;
  otpUrl: string;
  otpVerifyAttempts: number;
  redisUrl: string;
  wooConsumerKey: string;
  wooConsumerSecret: string;
};

/** Returns the complete server-only configuration needed for direct SMS OTP authentication. */
export function requireMeliPayamakIdentity(requestId: string): MeliPayamakAuthConfig {
  if (env.KADOCHI_AUTH_MODE !== "melipayamak") {
    throw new ServiceError({
      code: "configuration",
      status: 500,
      message: "MeliPayamak authentication is not configured.",
      requestId,
      retryable: false,
    });
  }

  const missing = [
    !env.KADOCHI_AUTH_SECRET && "KADOCHI_AUTH_SECRET",
    !env.MELIPAYAMAK_OTP_URL && "MELIPAYAMAK_OTP_URL",
    !env.REDIS_URL && "REDIS_URL",
    !env.WOO_CONSUMER_KEY && "WOO_CONSUMER_KEY",
    !env.WOO_CONSUMER_SECRET && "WOO_CONSUMER_SECRET",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new ServiceError({
      code: "configuration",
      status: 500,
      message: "Production OTP authentication is incomplete.",
      requestId,
      retryable: false,
    });
  }

  return {
    authSecret: env.KADOCHI_AUTH_SECRET!,
    otpAttemptRatePerHour: env.OTP_ATTEMPT_RATE_PER_HOUR,
    otpCodeTtlSeconds: env.OTP_CODE_TTL_SEC,
    otpUrl: env.MELIPAYAMAK_OTP_URL!,
    otpVerifyAttempts: env.OTP_VERIFY_ATTEMPTS,
    redisUrl: env.REDIS_URL!,
    wooConsumerKey: env.WOO_CONSUMER_KEY!,
    wooConsumerSecret: env.WOO_CONSUMER_SECRET!,
  };
}
