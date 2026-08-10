import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ServiceError } from "@/lib/http/errors";
import { otpInternalHeaders } from "./internal-auth";

describe("private OTP transport authentication", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("binds purpose, timestamp, request id, and payload with the deployment secret", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00Z"));
    vi.stubEnv("KADOCHI_INTERNAL_API_SECRET", "a-production-secret-that-is-long-enough");
    const payload = "+989121234567";

    const headers = otpInternalHeaders("otp-start", payload, "request-123");

    const timestamp = "1786363200";
    const expected = createHmac("sha256", "a-production-secret-that-is-long-enough")
      .update(`kadochi-internal-v1\notp-start\n${timestamp}\nrequest-123\n${payload}`)
      .digest("hex");
    expect(headers).toEqual({
      "X-Kadochi-Internal-Timestamp": timestamp,
      "X-Kadochi-Internal-Auth": expected,
    });
  });

  it("fails closed when production has no strong internal secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("KADOCHI_INTERNAL_API_SECRET", "short");

    expect(() => otpInternalHeaders("otp-verify", "+989121234567\n1234", "request-123"))
      .toThrowError(ServiceError);
  });
});
