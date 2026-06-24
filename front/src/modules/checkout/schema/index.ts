import { z } from "zod";

export const checkoutSenderSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const checkoutReceiverSchema = z.object({
  isSelf: z.boolean(),
  name: z.string().min(0),
  phone: z.string().optional(),
  address: z.string().min(1),
});

export const checkoutFiguresSchema = z.object({
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
  shipping: z.number().min(0).optional(),
  packaging: z.number().min(0).optional(),
});

export const checkoutDeliverySchema = z.union([
  z.string(),
  z.object({ slot_id: z.string().optional(), label: z.string().optional() }),
  z.null(),
]);

export const checkoutPackagingSchema = z
  .object({
    id: z.enum(["normal", "gift"]).optional(),
    title: z.string().optional(),
    price: z.number().optional(),
    postcard_message: z.string().optional(),
  })
  .nullable();

export const checkoutStartPayloadSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.number().min(1),
      quantity: z.number().min(1),
    }),
  ),
  sender: checkoutSenderSchema,
  receiver: checkoutReceiverSchema,
  figures: checkoutFiguresSchema,
  delivery: checkoutDeliverySchema.optional(),
  packaging: checkoutPackagingSchema.optional(),
  payMethod: z.literal("online"),
});
