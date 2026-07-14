import { z } from "zod";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

function latinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    return String(persianIndex >= 0 ? persianIndex : arabicDigits.indexOf(digit));
  });
}

/** Accepts Iranian mobile numbers and emits the canonical E.164 form, for example +989121234567. */
export const iranianPhoneSchema = z.string().trim().transform(latinDigits).refine(
  (phone) => /^(?:09\d{9}|00989\d{9}|\+989\d{9})$/.test(phone),
  "Enter a valid Iranian mobile number.",
).transform((phone) => phone.startsWith("09") ? `+98${phone.slice(1)}` : phone.startsWith("00") ? `+${phone.slice(2)}` : phone);

export const otpCodeSchema = z.string().trim().transform(latinDigits).refine(
  (code) => /^\d{4,6}$/.test(code),
  "Enter a 4 to 6 digit verification code.",
);

export const startOtpInputSchema = z.object({ phone: iranianPhoneSchema }).strict();
export const verifyOtpInputSchema = z.object({ phone: iranianPhoneSchema, code: otpCodeSchema }).strict();

export const otpStartResponseSchema = z.object({
  codeLength: z.number().int().min(4).max(6).optional(),
  expiresIn: z.number().finite().positive(),
  retryAfter: z.number().finite().nonnegative().optional(),
}).strict();

/** The auth plugin response; the JWT is deliberately never returned by a BFF route. */
export const wordpressJwtSchema = z.object({ token: z.string().min(1) }).strict();

export const customerSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  displayName: z.string(),
  roles: z.array(z.string()),
});
