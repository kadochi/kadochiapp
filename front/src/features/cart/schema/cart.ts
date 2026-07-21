import { z } from "zod";

const quantitySchema = z.coerce.number().int().min(0).max(9_999);
const variationAttributeSchema = z.object({
  attribute: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(200),
}).strict();

/** The Store API expects a product/variation ID plus its selected attributes. */
export const addItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(9_999),
  variation: z.array(variationAttributeSchema).max(20).optional(),
}).strict();

export const updateQuantitySchema = z.object({
  quantity: quantitySchema.refine((quantity) => quantity > 0, "Quantity must be at least one; use removeItem to remove an item."),
}).strict();

export const addressSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  company: z.string().trim().max(100).optional(),
  address1: z.string().trim().max(200).optional(),
  address2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postcode: z.string().trim().max(20).optional(),
  country: z.string().trim().length(2).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().trim().max(30).optional(),
}).strict();

export const updateCustomerSchema = z.object({
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
}).refine((input) => input.billingAddress || input.shippingAddress, "At least one address is required.");

export const selectShippingRateSchema = z.object({
  packageId: z.coerce.number().int().nonnegative(),
  rateId: z.string().trim().min(1).max(200),
}).strict();

/** Coupon codes are normalized by WooCommerce; keep browser input bounded before forwarding it. */
export const couponCodeSchema = z.object({
  code: z.string().trim().min(1, "کد تخفیف را وارد کنید.").max(100),
}).strict();

export const moneySchema = z.object({
  amount: z.string().regex(/^\d+$/),
  currencyCode: z.string().length(3),
  minorUnit: z.number().int().min(0).max(4),
}).strict();

const quantityLimitsSchema = z.object({
  minimum: z.number().int().min(1),
  maximum: z.number().int().min(1),
  multipleOf: z.number().int().min(1),
  editable: z.boolean(),
}).strict().refine((limits) => limits.maximum >= limits.minimum, "Quantity maximum must be at least the minimum.");

export const cartSchema = z.object({
  items: z.array(z.object({
    key: z.string().min(1),
    productId: z.number().int().positive(),
    name: z.string(),
    quantity: z.number().int().positive(),
    quantityLimits: quantityLimitsSchema,
    price: moneySchema,
    lineTotal: moneySchema,
    imageUrl: z.string().url().optional(),
    fastDeliveryEligible: z.boolean(),
  }).strict()),
  totals: z.object({
    totalItems: moneySchema,
    totalItemsTax: moneySchema,
    totalFees: moneySchema,
    totalFeesTax: moneySchema,
    totalDiscount: moneySchema,
    totalDiscountTax: moneySchema,
    totalShipping: moneySchema,
    totalShippingTax: moneySchema,
    totalTax: moneySchema,
    totalPrice: moneySchema,
  }).strict(),
  shipping: z.object({
    needsShipping: z.boolean(),
    hasCalculatedShipping: z.boolean(),
  }).strict(),
  paymentMethodIds: z.array(z.string().min(1)),
  coupons: z.array(z.object({
    code: z.string().min(1),
  }).strict()),
  shippingRates: z.array(z.object({
    packageId: z.number().int().nonnegative(),
    selectedRate: z.string().nullable(),
    rates: z.array(z.object({
      rateId: z.string(),
      name: z.string(),
      price: moneySchema,
      selected: z.boolean(),
    }).strict()),
  }).strict()),
}).strict();

const upstreamExtensionSchema = z.record(z.string(), z.unknown()).default({});

export const upstreamCartSchema = z.object({
  items: z.array(z.object({
    key: z.string(),
    id: z.number().int(),
    quantity: z.number().int(),
    quantity_limits: z.object({
      minimum: z.number().int().min(1),
      maximum: z.number().int().min(1),
      multiple_of: z.number().int().min(1),
      editable: z.boolean(),
    }).default({ minimum: 1, maximum: 9_999, multiple_of: 1, editable: true }),
    name: z.string(),
    prices: z.object({
      price: z.string().regex(/^\d+$/),
      currency_code: z.string().length(3),
      currency_minor_unit: z.number().int(),
    }),
    totals: z.object({
      line_total: z.string().regex(/^\d+$/),
      currency_code: z.string().length(3),
      currency_minor_unit: z.number().int(),
    }),
    images: z.array(z.object({ src: z.string().url() })).default([]),
    extensions: upstreamExtensionSchema,
  }).passthrough()),
  totals: z.object({
    total_items: z.string().regex(/^\d+$/),
    total_items_tax: z.string().regex(/^\d+$/),
    total_fees: z.string().regex(/^\d+$/),
    total_fees_tax: z.string().regex(/^\d+$/),
    total_discount: z.string().regex(/^\d+$/),
    total_discount_tax: z.string().regex(/^\d+$/),
    // WooCommerce returns null rather than "0" before it has calculated
    // shipping (for example, for a new empty cart).
    total_shipping: z.string().regex(/^\d+$/).nullable(),
    total_shipping_tax: z.string().regex(/^\d+$/).nullable(),
    total_tax: z.string().regex(/^\d+$/),
    total_price: z.string().regex(/^\d+$/),
    currency_code: z.string().length(3),
    currency_minor_unit: z.number().int().min(0).max(4),
  }).passthrough(),
  needs_shipping: z.boolean().default(false),
  has_calculated_shipping: z.boolean().default(false),
  payment_methods: z.array(z.string()).default([]),
  coupons: z.array(z.object({
    code: z.string(),
  }).passthrough()).default([]),
  shipping_rates: z.array(z.object({
    package_id: z.number().int().nonnegative(),
    shipping_rates: z.array(z.object({
      rate_id: z.string(),
      name: z.string(),
      price: z.string().regex(/^\d+$/),
      selected: z.boolean(),
    }).passthrough()),
  }).passthrough()).default([]),
}).passthrough();
