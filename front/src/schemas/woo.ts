import { z } from "zod";

export const CurrencyCodeSchema = z.enum(["IRR", "IRT", "USD", "EUR"]);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const WooStockStatusSchema = z.enum([
  "instock",
  "outofstock",
  "onbackorder",
]);
export type WooStockStatus = z.infer<typeof WooStockStatusSchema>;

export const WooImageSchema = z
  .object({
    id: z.number(),
    src: z.string(),
    name: z.string(),
    alt: z.string().optional(),
  })
  .passthrough();
export type WooImage = z.infer<typeof WooImageSchema>;

export const WooCategoryRefSchema = z
  .object({ id: z.number(), name: z.string(), slug: z.string() })
  .passthrough();
export type WooCategoryRef = z.infer<typeof WooCategoryRefSchema>;

export const WooAttributeRefSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    option: z.string().optional(),
  })
  .passthrough();
export type WooAttributeRef = z.infer<typeof WooAttributeRefSchema>;

export const WooProductSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    permalink: z.string(),
    type: z.string(),
    status: z.string(),
    price: z.string(),
    regular_price: z.string(),
    sale_price: z.string(),
    currency: CurrencyCodeSchema.optional(),
    stock_status: WooStockStatusSchema,
    stock_quantity: z.number().nullable(),
    manage_stock: z.boolean(),
    images: z.array(WooImageSchema),
    categories: z.array(WooCategoryRefSchema),
    attributes: z.array(WooAttributeRefSchema),
    short_description: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();
export type WooProduct = z.infer<typeof WooProductSchema>;

const WooMetaDataSchema = z.array(
  z.object({ key: z.string(), value: z.unknown() }).passthrough(),
);

export const WooStoreProductSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    short_description: z.string().optional(),
    images: z
      .array(
        z
          .object({
            id: z.number(),
            src: z.string(),
            alt: z.string().optional(),
            name: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    prices: z
      .object({
        min_price: z.string(),
        max_price: z.string(),
        min_regular_price: z.string().optional(),
        max_regular_price: z.string().optional(),
        price: z.string().optional(),
        regular_price: z.string().optional(),
        sale_price: z.string().optional(),
        currency_code: z.string().optional(),
      })
      .passthrough()
      .optional(),
    average_rating: z.string().optional(),
    rating_count: z.number().optional(),
    categories: z
      .array(
        z
          .object({ id: z.number(), name: z.string(), slug: z.string() })
          .passthrough(),
      )
      .optional(),
    tags: z
      .array(
        z
          .object({ id: z.number(), name: z.string(), slug: z.string() })
          .passthrough(),
      )
      .optional(),
    is_purchasable: z.boolean().optional(),
    type: z.string().optional(),
    meta_data: WooMetaDataSchema.optional(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.string().optional(),
  })
  .passthrough();
export type WooStoreProduct = z.infer<typeof WooStoreProductSchema>;

export const WooOrderLineItemSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().optional(),
    product_id: z.number().optional(),
    variation_id: z.number().optional(),
    quantity: z.number().optional(),
    subtotal: z.string().optional(),
    total: z.string().optional(),
    price: z.number().optional(),
    meta_data: WooMetaDataSchema.optional(),
  })
  .passthrough();
export type WooOrderLineItem = z.infer<typeof WooOrderLineItemSchema>;

export const WooOrderSchema = z
  .object({
    id: z.number(),
    date: z.string().optional(),
    date_gmt: z.string().optional(),
    modified: z.string().optional(),
    modified_gmt: z.string().optional(),
    slug: z.string().optional(),
    link: z.string().optional(),
    number: z.string().optional(),
    status: z.string().optional(),
    currency: z.string().optional(),
    total: z.string().optional(),
    customer_id: z.number().optional(),
    payment_method: z.string().optional(),
    payment_method_title: z.string().optional(),
    line_items: z.array(WooOrderLineItemSchema).optional(),
    shipping_lines: z
      .array(
        z
          .object({
            method_title: z.string().optional(),
            total: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    fee_lines: z
      .array(
        z
          .object({
            name: z.string().optional(),
            total: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    meta_data: WooMetaDataSchema.optional(),
  })
  .passthrough();
export type WooOrder = z.infer<typeof WooOrderSchema>;
