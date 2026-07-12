import { z } from "zod";
import { addressSchema, cartSchema } from "../../cart/schema/cart";

export const checkoutStateSchema = z.object({ cart: cartSchema, paymentMethods: z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), supports: z.array(z.string()) })) });
export const submitCheckoutSchema = z.object({ billingAddress: addressSchema, shippingAddress: addressSchema.optional(), paymentMethod: z.string().trim().min(1).max(100), paymentData: z.array(z.object({ key: z.string().min(1).max(100), value: z.string().max(4_000) })).max(30).default([]), operationId: z.string().uuid() }).strict();
export const checkoutResultSchema = z.object({ orderId: z.number().int().positive().optional(), status: z.string(), paymentResult: z.object({ paymentStatus: z.string(), paymentDetails: z.record(z.string(), z.unknown()).optional(), redirectUrl: z.string().url().optional() }).optional() });
