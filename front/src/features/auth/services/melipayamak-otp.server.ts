import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { getRedis } from "@/lib/server/redis";
import { requireMeliPayamakIdentity } from "@/lib/server/env";
import { customerSchema } from "../schema/auth";
import type { Customer, OtpStartResponse, StartOtpInput, VerifyOtpInput } from "../types";

const rateLimitWindowSeconds = 60 * 60;
const resendAfterSeconds = 60;

const wooCustomerSchema = z.object({
  billing: z.object({ phone: z.string().optional() }).passthrough().optional(),
  email: z.string().email(),
  first_name: z.string().optional(),
  id: z.number().int().positive(),
  last_name: z.string().optional(),
  role: z.string().optional(),
  username: z.string().optional(),
}).passthrough();

type WooCustomer = z.infer<typeof wooCustomerSchema>;

function serviceError(
  code: "configuration" | "network" | "rate_limited" | "timeout" | "unauthenticated" | "upstream_failure",
  status: number,
  message: string,
  requestId: string,
  retryable: boolean,
): ServiceError {
  return new ServiceError({ code, status, message, requestId, retryable });
}

function stableKey(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function challengeKey(phone: string): string {
  return `kadochi:auth:otp:${stableKey(phone)}`;
}

function rateKey(scope: "request:phone" | "request:ip" | "verify", value: string): string {
  return `kadochi:auth:otp:rate:${scope}:${stableKey(value)}`;
}

function codeDigest(phone: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("base64url");
}

function equalDigest(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function nationalPhone(phone: string): string {
  return `0${phone.replace(/\D/g, "").slice(-10)}`;
}

function forwardedIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function providerCode(value: unknown): string | null {
  if (typeof value === "number") value = String(value);
  if (typeof value === "string") {
    const match = value.trim().match(/\b(\d{4,6})\b/);
    return match?.[1] ?? null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  return providerCode(record.code)
    ?? providerCode(record.otp)
    ?? providerCode(record.data)
    ?? providerCode(record.result);
}

async function extractProviderCode(response: Response, requestId: string): Promise<string> {
  const text = await response.text();
  if (!response.ok) {
    throw serviceError("upstream_failure", 502, "The SMS service could not send a verification code.", requestId, true);
  }

  let value: unknown = text;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    // Some existing MeliPayamak relay deployments return the code as plain text.
  }
  const code = providerCode(value);
  if (!code) {
    throw serviceError("upstream_failure", 502, "The SMS service returned an invalid response.", requestId, true);
  }
  return code;
}

async function consumeRateLimit(
  redis: ReturnType<typeof getRedis>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const hits = await redis.incr(key);
  if (hits === 1) await redis.expire(key, windowSeconds);
  return hits <= limit;
}

async function fetchProviderCode(phone: string, requestId: string): Promise<string> {
  const { otpUrl } = requireMeliPayamakIdentity(requestId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(otpUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ to: nationalPhone(phone) }),
      cache: "no-store",
      signal: controller.signal,
    });
    return extractProviderCode(response, requestId);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    const timedOut = controller.signal.aborted;
    throw serviceError(
      timedOut ? "timeout" : "network",
      timedOut ? 504 : 502,
      timedOut ? "The SMS service timed out." : "The SMS service is unavailable.",
      requestId,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

function basicAuthorization(consumerKey: string, consumerSecret: string): string {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

function mapCustomer(customer: WooCustomer): Customer {
  const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || "کاربر کادوچی";
  return customerSchema.parse({
    id: customer.id,
    email: customer.email,
    displayName,
    roles: [customer.role || "customer"],
  });
}

function matchesPhone(customer: WooCustomer, phone: string): boolean {
  const normalized = nationalPhone(phone);
  const billingPhone = customer.billing?.phone ? nationalPhone(customer.billing.phone) : undefined;
  const username = customer.username ? nationalPhone(customer.username) : undefined;
  return billingPhone === normalized || username === normalized;
}

function customerUpstreamError(requestId: string): ServiceError {
  return serviceError("upstream_failure", 502, "The customer service is unavailable.", requestId, true);
}

async function wooRequest<T>(
  path: string,
  requestId: string,
  parse: (value: unknown) => T,
  init?: { body?: unknown; method?: "GET" | "POST" },
): Promise<T> {
  const config = requireMeliPayamakIdentity(requestId);
  try {
    const response = await wordpressFetch(path, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: basicAuthorization(config.wooConsumerKey, config.wooConsumerSecret),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      requestId,
    });
    return await parseUpstreamJson(response, parse, requestId);
  } catch {
    throw customerUpstreamError(requestId);
  }
}

async function ensureCustomer(phone: string, requestId: string): Promise<Customer> {
  const phoneForProvider = nationalPhone(phone);
  const customers = await wooRequest(
    `/wp-json/wc/v3/customers?search=${encodeURIComponent(phoneForProvider)}`,
    requestId,
    (value) => z.array(wooCustomerSchema).parse(value),
  );
  const existing = customers.find((customer) => matchesPhone(customer, phone));
  if (existing) return mapCustomer(existing);

  const phoneDigits = phone.replace(/\D/g, "");
  return mapCustomer(await wooRequest(
    "/wp-json/wc/v3/customers",
    requestId,
    (value) => wooCustomerSchema.parse(value),
    {
      method: "POST",
      body: {
        billing: { email: `${phoneDigits}@customer.kadochi.invalid`, phone: phoneForProvider },
        email: `${phoneDigits}@customer.kadochi.invalid`,
        username: phoneForProvider,
      },
    },
  ));
}

export async function startMeliPayamakOtp(input: StartOtpInput, requestId: string, request: Request): Promise<OtpStartResponse> {
  const config = requireMeliPayamakIdentity(requestId);
  const redis = getRedis(config.redisUrl);
  let phoneAllowed: boolean;
  let ipAllowed: boolean;
  try {
    [phoneAllowed, ipAllowed] = await Promise.all([
      consumeRateLimit(redis, rateKey("request:phone", input.phone), config.otpAttemptRatePerHour, rateLimitWindowSeconds),
      consumeRateLimit(redis, rateKey("request:ip", forwardedIp(request)), config.otpAttemptRatePerHour, rateLimitWindowSeconds),
    ]);
  } catch {
    throw serviceError("network", 503, "The verification service is temporarily unavailable.", requestId, true);
  }
  if (!phoneAllowed || !ipAllowed) {
    throw serviceError("rate_limited", 429, "Too many verification-code requests. Please try again later.", requestId, true);
  }

  const code = await fetchProviderCode(input.phone, requestId);
  try {
    await redis.set(challengeKey(input.phone), codeDigest(input.phone, code, config.authSecret), "EX", config.otpCodeTtlSeconds);
  } catch {
    throw serviceError("network", 503, "The verification service is temporarily unavailable.", requestId, true);
  }

  return {
    expiresIn: config.otpCodeTtlSeconds,
    retryAfter: Math.min(resendAfterSeconds, config.otpCodeTtlSeconds),
    codeLength: code.length,
  };
}

export type VerifiedMeliPayamakOtp = {
  customerId: number;
  phone: string;
};

export async function verifyMeliPayamakOtp(input: VerifyOtpInput, requestId: string): Promise<VerifiedMeliPayamakOtp> {
  const config = requireMeliPayamakIdentity(requestId);
  const redis = getRedis(config.redisUrl);
  const key = challengeKey(input.phone);
  try {
    const attempts = await consumeRateLimit(redis, rateKey("verify", input.phone), config.otpVerifyAttempts, config.otpCodeTtlSeconds);
    if (!attempts) {
      await redis.del(key);
      throw serviceError("unauthenticated", 401, "The verification code is incorrect or has expired.", requestId, false);
    }

    const storedDigest = await redis.get(key);
    if (!storedDigest || !equalDigest(storedDigest, codeDigest(input.phone, input.code, config.authSecret))) {
      throw serviceError("unauthenticated", 401, "The verification code is incorrect or has expired.", requestId, false);
    }
    await Promise.all([redis.del(key), redis.del(rateKey("verify", input.phone))]);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw serviceError("network", 503, "The verification service is temporarily unavailable.", requestId, true);
  }

  const customer = await ensureCustomer(input.phone, requestId);
  return { customerId: customer.id, phone: input.phone };
}

export async function getMeliPayamakCustomer(customerId: number, requestId: string): Promise<Customer> {
  return mapCustomer(await wooRequest(
    `/wp-json/wc/v3/customers/${customerId}`,
    requestId,
    (value) => wooCustomerSchema.parse(value),
  ));
}
