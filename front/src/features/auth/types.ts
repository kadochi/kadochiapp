import type { z } from "zod";

import type { customerSchema, otpStartResponseSchema, startOtpInputSchema, verifyOtpInputSchema, wordpressOtpVerifyResponseSchema } from "./schema/auth";

export type Customer = z.infer<typeof customerSchema>;
export type StartOtpInput = z.input<typeof startOtpInputSchema>;
export type VerifyOtpInput = z.input<typeof verifyOtpInputSchema>;
export type OtpStartResponse = z.infer<typeof otpStartResponseSchema>;
export type WordPressOtpVerifyResponse = z.infer<typeof wordpressOtpVerifyResponseSchema>;
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";
