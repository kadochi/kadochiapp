import { z } from "zod";

import { customerSchema } from "../../auth/schema/auth";
import { cartSchema, moneySchema } from "../../cart/schema/cart";

export const deliverySlotSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}-(10|13|16)$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.union([z.literal(10), z.literal(13), z.literal(16)]),
  endHour: z.union([z.literal(13), z.literal(16), z.literal(19)]),
  label: z.string().min(1),
}).strict();

export const packagingOptionSchema = z.object({
  id: z.enum(["gift", "normal"]),
  label: z.string().min(1),
  imageUrl: z.string().startsWith("/"),
  fee: moneySchema,
  default: z.boolean(),
}).strict();

export const paymentMethodSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
}).strict();

export const checkoutStateSchema = z.object({
  cart: cartSchema,
  customer: customerSchema,
  deliverySlots: z.array(deliverySlotSchema).max(9),
  packagingOptions: z.array(packagingOptionSchema).length(2),
  paymentMethod: paymentMethodSchema,
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
  }).strict(),
]);

const deliveryAddressSchema = z.object({
  address1: z.string().trim().min(5, "نشانی گیرنده را وارد کنید.").max(200),
  address2: z.string().trim().max(200).optional(),
  postcode: z.string().trim().regex(/^\d{10}$/, "کدپستی باید ۱۰ رقم باشد.").optional(),
}).strict();

/** Browser payload deliberately excludes totals, payment gateway, phone/email, country, and city. */
export const submitCheckoutSchema = z.object({
  sender: senderSchema,
  recipient: recipientSchema,
  address: deliveryAddressSchema,
  deliverySlotId: deliverySlotSchema.shape.id,
  packagingId: z.enum(["gift", "normal"]),
  postcardText: z.string().trim().max(500).optional().default(""),
  operationId: z.string().uuid(),
}).strict();

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
  recipient: z.object({ firstName: z.string(), lastName: z.string() }).strict(),
  deliverySlot: z.string().nullable(),
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
  order_id: z.number().int().positive().optional(),
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
