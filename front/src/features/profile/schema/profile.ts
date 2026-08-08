import { z } from "zod";

import { customerSchema } from "@/features/auth/schema/auth";
import { moneySchema } from "@/features/cart/schema/cart";
import { productListResultSchema } from "@/features/products/schema/products";

const nameSchema = z.string().trim().max(100, "نام نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد.");

export const updateProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  /** A client-cropped 512px JPEG data URL. It is optional when only names change. */
  avatarData: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "تصویر پروفایل معتبر نیست.").max(1_500_000, "حجم تصویر پروفایل زیاد است.").nullable().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ تولد معتبر نیست.").nullable().optional(),
  gender: z.enum(["female", "male", "undisclosed"]).nullable().optional(),
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

export const profileOrderRetryPaymentSchema = z.object({
  redirectUrl: z.string().url(),
}).strict();

export const profileOrderRetryPaymentRequestSchema = z.object({
  attemptId: z.string().uuid(),
}).strict();

export const profileOrderDetailSchema = profileOrderSchema.extend({
  sender: z.string(),
  receiver: z.string(),
  deliverySlot: z.string().nullable(),
  address: z.string(),
  postcardMessage: z.string().nullable(),
  postcardDesignTitle: z.string().nullable(),
  summary: z.object({
    subtotal: moneySchema,
    shipping: moneySchema,
    service: moneySchema,
    tax: moneySchema,
    discount: moneySchema,
    total: moneySchema,
  }).strict(),
}).strict();

export const profileProductActionSchema = z.enum(["save", "like"]);
export const profileProductActionListSchema = z.object({
  productIds: z.array(z.number().int().positive()),
  page: z.number().int().positive(),
  perPage: z.number().int().positive().max(50),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}).strict();

/** Product cards resolved server-side from the customer's ordered action records. */
export const profileProductListSchema = productListResultSchema;

export const notificationSchema = z.object({
  id: z.number().int().positive(),
  type: z.string().min(1),
  message: z.string().min(1),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
}).strict();

export const notificationListSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
}).strict();

export const notificationReadResultSchema = z.object({
  unreadCount: z.literal(0),
}).strict();

const personalProfileUsernameSchema = z.string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, "نام کاربری باید ۳ تا ۳۰ کاراکتر انگلیسی، عدد یا خط تیره باشد.");

export const personalProfileSchema = z.object({
  username: personalProfileUsernameSchema.nullable(),
  enabled: z.boolean(),
  showAvatar: z.boolean(),
  showFirstName: z.boolean(),
  showLastName: z.boolean(),
  showBirthDate: z.boolean(),
  showWishlist: z.boolean(),
}).strict();

export const updatePersonalProfileSchema = personalProfileSchema.superRefine((profile, context) => {
  if (profile.enabled && !profile.username) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["username"], message: "برای ساخت صفحه عمومی، نام کاربری را وارد کنید." });
  }
});

/** The deliberately limited data returned from a public profile URL. */
export const publicPersonalProfileSchema = z.object({
  username: personalProfileUsernameSchema,
  displayName: z.string().min(1),
  avatarSrc: z.string().url().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  showWishlist: z.boolean(),
  productIds: z.array(z.number().int().positive()),
}).strict();

export { customerSchema };
