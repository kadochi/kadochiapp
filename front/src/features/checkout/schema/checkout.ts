import { z } from "zod";

import { customerSchema, iranianPhoneSchema } from "../../auth/schema/auth";
import { cartSchema, moneySchema } from "../../cart/schema/cart";

export const deliverySlotSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}-(10|13|16)$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.union([z.literal(10), z.literal(13), z.literal(16)]),
  endHour: z.union([z.literal(13), z.literal(16), z.literal(19)]),
  label: z.string().min(1),
  available: z.boolean(),
}).strict();

export const packagingOptionSchema = z.object({
  id: z.enum(["gift", "normal"]),
  label: z.string().min(1),
  imageUrl: z.string().startsWith("/"),
  fee: moneySchema,
  default: z.boolean(),
}).strict();

export const postcardDesignSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  imageUrl: z.string().url(),
}).strict();

export const paymentMethodSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
}).strict();

export const savedAddressSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  address1: z.string().trim().min(5).max(200),
  address2: z.string().trim().max(200),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).strict().nullable(),
}).strict();

export const createSavedAddressSchema = savedAddressSchema.omit({ id: true });
export const savedAddressListSchema = z.object({ items: z.array(savedAddressSchema).max(20) }).strict();

export const checkoutStateSchema = z.object({
  cart: cartSchema,
  customer: customerSchema,
  // Checkout always shows today and the next two calendar days; unavailable
  // windows remain so the customer can see why they cannot be selected.
  deliverySlots: z.array(deliverySlotSchema).max(120),
  packagingOptions: z.array(packagingOptionSchema).length(2),
  postcardDesigns: z.array(postcardDesignSchema).max(50),
  paymentMethod: paymentMethodSchema,
  savedAddresses: z.array(savedAddressSchema).max(20),
}).strict();

const senderSchema = z.object({
  firstName: z.string().trim().min(1, "نام فرستنده را وارد کنید.").max(100),
  lastName: z.string().trim().min(1, "نام خانوادگی فرستنده را وارد کنید.").max(100),
}).strict();

const recipientSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }).strict(),
  z.object({
    kind: z.literal("other"),
    firstName: z.string().trim().min(1, "نام گیرنده را وارد کنید.").max(100),
    lastName: z.string().trim().min(1, "نام خانوادگی گیرنده را وارد کنید.").max(100),
    phone: iranianPhoneSchema,
  }).strict(),
]);

const deliveryAddressSchema = z.object({
  address1: z.string().trim().min(5, "نشانی گیرنده را وارد کنید.").max(200),
  address2: z.string().trim().max(200).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).strict().optional(),
}).strict();

/**
 * A partial snapshot of checkout progress. Totals, payment method, and the
 * authenticated customer's contact details remain server-owned.
 */
export const checkoutDraftSchema = z.object({
  sender: senderSchema.optional(),
  recipient: recipientSchema.optional(),
  address: deliveryAddressSchema.optional(),
  deliverySlotId: deliverySlotSchema.shape.id.optional(),
  packagingId: z.enum(["gift", "normal"]).optional(),
  postcardEnabled: z.boolean().optional(),
  postcardDesignId: z.number().int().positive().nullable().optional(),
  postcardText: z.string().trim().max(200).optional(),
}).strict().superRefine((value, context) => {
  if (value.postcardEnabled === true && !value.postcardDesignId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["postcardDesignId"], message: "یک طرح کارت پستال انتخاب کنید." });
  }
  if (value.postcardEnabled === false && (value.postcardDesignId || value.postcardText)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["postcardEnabled"], message: "برای ثبت کارت پستال، آن را فعال کنید." });
  }
});

/** Browser payload deliberately excludes totals, payment gateway, sender phone/email, country, and city. */
export const submitCheckoutSchema = z.object({
  sender: senderSchema,
  recipient: recipientSchema,
  address: deliveryAddressSchema,
  deliverySlotId: deliverySlotSchema.shape.id,
  packagingId: z.enum(["gift", "normal"]),
  postcardEnabled: z.boolean().default(false),
  postcardDesignId: z.number().int().positive().nullable().optional().default(null),
  postcardText: z.string().trim().max(200).optional().default(""),
  operationId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.postcardEnabled && !value.postcardDesignId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["postcardDesignId"], message: "یک طرح کارت پستال انتخاب کنید." });
  }
  if (!value.postcardEnabled && (value.postcardDesignId || value.postcardText)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["postcardEnabled"], message: "برای ثبت کارت پستال، آن را فعال کنید." });
  }
});

export const checkoutResultSchema = z.object({
  orderId: z.number().int().positive().optional(),
  status: z.string(),
  paymentResult: z.object({
    paymentStatus: z.string(),
    redirectUrl: z.string().url().optional(),
  }).optional(),
  reconciliation: z.enum(["paid", "unpaid", "unknown"]).optional(),
}).strict();

export const orderSummarySchema = z.object({
  id: z.number().int().positive(),
  paid: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
  total: moneySchema,
  sender: z.string(),
  recipient: z.object({ firstName: z.string(), lastName: z.string() }).strict(),
  deliverySlot: z.string().nullable(),
  address: z.string(),
}).strict();

const upstreamCheckoutResultSchema = z.object({
  order_id: z.number().int().positive().optional(),
  status: z.string(),
  payment_result: z.object({
    payment_status: z.string(),
    redirect_url: z.string().url().optional().or(z.literal("")),
  }).optional().nullable(),
}).passthrough();

export const upstreamCheckoutDraftSchema = z.object({
  // WooCommerce 10.8+ may keep the PUT draft in the shopper session and return 0
  // until POST materializes the real order.
  order_id: z.number().int().nonnegative().optional(),
  status: z.string().optional(),
}).passthrough();

export function mapCheckoutResult(value: unknown) {
  const result = upstreamCheckoutResultSchema.parse(value);
  return checkoutResultSchema.parse({
    orderId: result.order_id,
    status: result.status,
    paymentResult: result.payment_result ? {
      paymentStatus: result.payment_result.payment_status,
      ...(result.payment_result.redirect_url ? { redirectUrl: result.payment_result.redirect_url } : {}),
    } : undefined,
  });
}
