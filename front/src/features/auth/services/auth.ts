import { bffJson } from "@/lib/http/browser";
import { customerSchema, otpStartResponseSchema, startOtpInputSchema, verifyOtpInputSchema } from "../schema/auth";
import type { OtpStartResponse, StartOtpInput, VerifyOtpInput } from "../types";

export function startOtp(input: StartOtpInput): Promise<OtpStartResponse> {
  return bffJson(
    "/api/auth/otp/start",
    { method: "POST", body: JSON.stringify(startOtpInputSchema.parse(input)) },
    (value) => otpStartResponseSchema.parse(value),
  );
}

export function verifyOtp(input: VerifyOtpInput) {
  return bffJson(
    "/api/auth/otp/verify",
    { method: "POST", body: JSON.stringify(verifyOtpInputSchema.parse(input)) },
    (value) => customerSchema.parse(value),
  );
}

export const getCurrentCustomer = () => bffJson("/api/auth/current", { method: "GET" }, (value) => customerSchema.parse(value));
export const logout = () => bffJson("/api/auth/logout", { method: "POST" }, () => undefined);
