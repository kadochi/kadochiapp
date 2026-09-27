import "server-only";

import { z } from "zod";

const gatewayIdSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,100}$/);

const serverEnvironmentSchema = z.object({
  WORDPRESS_INTERNAL_URL: z.string().url().default("http://wordpress"),
  /** Legacy single gateway; used only when KADOCHI_PAYMENT_METHOD_IDS is unset. */
  KADOCHI_PAYMENT_METHOD_ID: gatewayIdSchema.default("WC_ZPal"),
  /** Ordered, comma-separated gateway allow-list, e.g. `WC_ZPal,kadochi_snapppay`. */
  KADOCHI_PAYMENT_METHOD_IDS: z.string().optional(),
  KADOCHI_FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  /** Snapp! Pay API origin; its host also serves the staging payment page. */
  SNAPPPAY_BASE_URL: z.string().url().optional().or(z.literal("")),
  /** Additional comma-separated Snapp! Pay payment-page hosts. */
  SNAPPPAY_PAYMENT_HOSTS: z.string().optional(),
}).transform((value) => {
  const ids = (value.KADOCHI_PAYMENT_METHOD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id, index, all) => gatewayIdSchema.safeParse(id).success && all.indexOf(id) === index);
  return { ...value, paymentMethodIds: ids.length ? ids : [value.KADOCHI_PAYMENT_METHOD_ID] };
});

export const env = serverEnvironmentSchema.parse({
  WORDPRESS_INTERNAL_URL: process.env.WORDPRESS_INTERNAL_URL,
  KADOCHI_PAYMENT_METHOD_ID: process.env.KADOCHI_PAYMENT_METHOD_ID,
  KADOCHI_PAYMENT_METHOD_IDS: process.env.KADOCHI_PAYMENT_METHOD_IDS,
  KADOCHI_FRONTEND_URL: process.env.KADOCHI_FRONTEND_URL,
  SNAPPPAY_BASE_URL: process.env.SNAPPPAY_BASE_URL,
  SNAPPPAY_PAYMENT_HOSTS: process.env.SNAPPPAY_PAYMENT_HOSTS,
});
