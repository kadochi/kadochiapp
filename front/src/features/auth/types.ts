import type { z } from "zod";

import type { customerSchema, otpStartResponseSchema, startOtpInputSchema, verifyOtpInputSchema, wordpressJwtSchema } from "./schema/auth";

export type Customer = z.infer<typeof customerSchema>;
export type StartOtpInput = z.input<typeof startOtpInputSchema>;
export type VerifyOtpInput = z.input<typeof verifyOtpInputSchema>;
export type OtpStartResponse = z.infer<typeof otpStartResponseSchema>;
export type WordPressJwt = z.infer<typeof wordpressJwtSchema>;
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";
