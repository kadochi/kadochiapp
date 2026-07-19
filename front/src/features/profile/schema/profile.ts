import { z } from "zod";

import { customerSchema } from "@/features/auth/schema/auth";
import { moneySchema } from "@/features/cart/schema/cart";

const nameSchema = z.string().trim().max(100, "نام نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد.");

export const updateProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
}).strict();

export const profileOrderItemSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string(),
  quantity: z.number().int().nonnegative(),
  imageUrl: z.string().url().nullable(),
}).strict();

export const profileOrderSchema = z.object({
  id: z.number().int().positive(),
  status: z.string().min(1),
  createdAt: z.string().min(1),
  total: moneySchema,
  items: z.array(profileOrderItemSchema),
}).strict();

export const profileOrderListSchema = z.object({
  items: z.array(profileOrderSchema),
  page: z.number().int().positive(),
  perPage: z.number().int().positive().max(50),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}).strict();

export const profileOrderDetailSchema = profileOrderSchema.extend({
  sender: z.string(),
  receiver: z.string(),
  deliverySlot: z.string().nullable(),
  address: z.string(),
  summary: z.object({
    subtotal: moneySchema,
    tax: moneySchema,
    shipping: moneySchema,
    service: moneySchema,
    total: moneySchema,
  }).strict(),
}).strict();

export { customerSchema };
