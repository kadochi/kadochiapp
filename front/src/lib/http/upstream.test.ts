import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { wordpressErrorDetail } from "./upstream";

describe("wordpressErrorDetail", () => {
  it("keeps cooldown separate from the real hourly limit and carries its retry delay", () => {
    expect(wordpressErrorDetail(429, {
      code: "kadochi_otp_cooldown",
      data: { status: 429, retryAfter: 42 },
    }, "request-123")).toMatchObject({
      code: "otp_cooldown",
      status: 429,
      retryAfter: 42,
      retryable: true,
    });

    expect(wordpressErrorDetail(429, {
      code: "kadochi_otp_rate_limited",
      data: { status: 429, retryAfter: 3600 },
    }, "request-123")).toMatchObject({
      code: "otp_rate_limited",
      status: 429,
      retryAfter: 3600,
    });
  });

  it("keeps documented relay failures distinct and safely falls back for unknown errors", () => {
    expect(wordpressErrorDetail(504, { code: "kadochi_otp_provider_timeout" }, "request-123")).toMatchObject({
      code: "otp_provider_timeout",
      status: 504,
      retryable: true,
    });
    expect(wordpressErrorDetail(502, { code: "unexpected_provider_error" }, "request-123")).toMatchObject({
      code: "upstream_failure",
      status: 502,
    });
  });

  it("preserves the payment-in-progress contract and its safe retry delay", () => {
    expect(wordpressErrorDetail(409, {
      code: "kadochi_payment_in_progress",
      data: { status: 409, retryAfter: 12 },
    }, "request-123")).toMatchObject({
      code: "payment_in_progress",
      status: 409,
      retryAfter: 12,
      retryable: true,
    });
  });

  it("does not classify a definite WordPress gateway rejection as a transport retry", () => {
    expect(wordpressErrorDetail(502, { code: "kadochi_payment_unavailable" }, "request-123")).toMatchObject({
      code: "upstream_failure",
      status: 502,
      retryable: false,
    });
  });
});
