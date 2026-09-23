import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";

import { getCurrentCustomer, getStoredAuthToken, wordpressBearerHeaders } from "@/features/auth/services/auth.server";
import { retryProfileOrderPayment } from "@/features/profile/services/profile.server";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, UpstreamError, wordpressFetch } from "@/lib/http/upstream";
import { isTrustedGatewayRedirect, paymentProvider, SNAPPPAY_GATEWAY_ID, ZARINPAL_GATEWAY_ID } from "@/lib/payments/redirect-hosts";
import { env } from "@/lib/server/env";
import { upstreamCartSchema } from "../../cart/schema/cart";
import { mapCart } from "../../cart/utils/map-cart";
import { createDeliverySlots } from "../utils/delivery-slots";
import {
  checkoutResultSchema,
  checkoutStateSchema,
  createSavedAddressSchema,
  mapCheckoutResult,
  orderSummarySchema,
  paymentMethodSchema,
  postcardDesignSchema,
  savedAddressListSchema,
  savedAddressSchema,
  submitCheckoutSchema,
  upstreamCheckoutDraftSchema,
  upstreamPaymentOptionsSchema,
} from "../schema/checkout";

const cartTokenCookie = "kadochi_cart_token";
const deliveryField = "kadochi/delivery-slot";
const packagingField = "kadochi/packaging";
const postcardField = "kadochi/postcard";
const postcardDesignField = "kadochi/postcard-design";
const locationField = "kadochi/location";
const operationField = "kadochi/operation-id";

type PaymentMetadata = NonNullable<import("@/lib/http/errors").ApiError["payment"]>;
type PaymentMethod = z.infer<typeof paymentMethodSchema>;
type Cart = ReturnType<typeof mapCart>;

const zarinpalCategories: Record<number, PaymentMetadata["category"]> = {
  "-9": "rejected",
  "-10": "configuration",
  "-11": "configuration",
  "-12": "temporarily_unavailable",
  "-15": "configuration",
  "-16": "configuration",
  "-17": "configuration",
  "-18": "configuration",
  "-19": "rejected",
  "-51": "cancelled",
};

/** Tags emitted by Kadochi_SnappPay::start_error_message() as `[snapppay:<code>]`. */
const snapppayCategories: Record<string, PaymentMetadata["category"]> = {
  "1000": "temporarily_unavailable",
  unavailable: "temporarily_unavailable",
  timeout: "temporarily_unavailable",
  network: "temporarily_unavailable",
  "1005": "rejected",
  "1048": "rejected",
  "1051": "configuration",
  auth: "configuration",
  configuration: "configuration",
  invalid_redirect: "configuration",
  payload: "configuration",
};

const upstreamGatewayErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  data: z.object({ status: z.number().int().optional(), code: z.union([z.number().int(), z.string()]).optional() }).passthrough().optional(),
  errors: z.array(z.object({ code: z.union([z.number().int(), z.string()]).optional(), message: z.string().optional() }).passthrough()).optional(),
}).passthrough();

function paymentFailure(requestId: string, provider: PaymentMetadata["provider"], gatewayCode: number | undefined, category: PaymentMetadata["category"]) {
  const retryable = category === "temporarily_unavailable" || category === "unknown";
  console.error("[payment] gateway_rejected_checkout", { requestId, provider, gatewayCode, category });
  return new ServiceError({
    code: "upstream_failure",
    status: category === "configuration" ? 503 : 422,
    message: "The payment gateway could not start a payment.",
    requestId,
    retryable,
    payment: { provider, ...(gatewayCode !== undefined ? { code: gatewayCode } : {}), category },
  });
}

/**
 * Classifies a Woo Store API gateway notice. WooCommerce gateway errors are
 * user-facing notices, so only the documented numeric code or Kadochi's
 * `[snapppay:…]` tag is kept; the raw notice is never forwarded to browsers.
 */
function gatewayFailure(value: unknown, requestId: string, methodId: string): ServiceError | null {
  const response = upstreamGatewayErrorSchema.safeParse(value);
  if (!response.success) return null;
  const message = response.data.message ?? response.data.errors?.[0]?.message ?? "";
  const snapppayTag = /\[snapppay:([a-z0-9_-]{1,40})\]/i.exec(message)?.[1]?.toLowerCase();
  if (snapppayTag || paymentProvider(methodId) === "snapppay") {
    if (!snapppayTag) return null;
    const gatewayCode = /^\d+$/.test(snapppayTag) ? Number(snapppayTag) : undefined;
    return paymentFailure(requestId, "snapppay", gatewayCode, snapppayCategories[snapppayTag] ?? "unknown");
  }
  const code = response.data.errors?.[0]?.code ?? response.data.data?.code
    ?? /(?:zarin\s*pal|زرین\s*پال).{0,80}?(?:code|کد)?\s*[:：#-]?\s*(-?\d+)/iu.exec(message)?.[1]
    ?? /(?:code|کد)\s*[:：#-]?\s*(-?\d+)/iu.exec(message)?.[1];
  const gatewayCode = code !== undefined && /^-?\d+$/.test(String(code)) ? Number(code) : undefined;
  // Some ZarinPal plugin releases omit the provider name from their Store API
  // notice, so a documented numeric code is sufficient for the ZarinPal method.
  if (!/zarin\s*pal|زرین\s*پال/iu.test(message) && (gatewayCode === undefined || methodId !== ZARINPAL_GATEWAY_ID)) return null;
  return paymentFailure(requestId, "zarinpal", gatewayCode, gatewayCode === undefined ? "unknown" : zarinpalCategories[gatewayCode] ?? "unknown");
}

async function authenticatedCustomer(requestId: string) {
  const token = await getStoredAuthToken();
  return getCurrentCustomer(token, requestId);
}

async function checkoutHeaders(cartToken?: string): Promise<Record<string, string>> {
  const storedCartToken = cartToken ?? (await cookies()).get(cartTokenCookie)?.value;
  return {
    ...(storedCartToken ? { "Cart-Token": storedCartToken } : {}),
    ...(await wordpressBearerHeaders()),
  };
}

/** Allow-listed gateway IDs that Woo also offers for this cart, in allow-list order. */
function offeredPaymentMethodIds(requestId: string, cart: Cart) {
  const ids = env.paymentMethodIds.filter((id) => cart.paymentMethodIds.includes(id));
  if (!ids.length) noPaymentMethod(requestId);
  return ids;
}

function noPaymentMethod(requestId: string): never {
  throw new ServiceError({
    code: "configuration",
    status: 503,
    message: "Online payment is not available for this cart.",
    requestId,
    retryable: false,
  });
}

/** Converts Woo's authoritative cart total to whole Rials, or null for an unsupported currency. */
export function cartTotalIrr(total: Cart["totals"]["totalPrice"]): number | null {
  if (!/^\d+$/.test(total.amount)) return null;
  const major = Number(total.amount) / (10 ** total.minorUnit);
  if (!Number.isSafeInteger(Math.round(major))) return null;
  if (total.currencyCode === "IRR") return Math.round(major);
  if (total.currencyCode === "IRT") return Math.round(major * 10);
  return null;
}

/**
 * Asks WordPress (and through it Snapp!) whether Snapp! Pay may be offered for
 * this exact amount. Any failure hides the method rather than blocking checkout.
 */
async function snapppayOffer(cart: Cart, requestId: string): Promise<PaymentMethod | null> {
  const amount = cartTotalIrr(cart.totals.totalPrice);
  if (!amount) return null;
  try {
    const response = await wordpressFetch(`/wp-json/kadochi/v1/checkout/payment-options?amount=${amount}`, {
      headers: await wordpressBearerHeaders(),
      cache: "no-store",
      requestId,
      timeoutMs: 12_000,
    });
    const options = await parseUpstreamJson(response, (value) => upstreamPaymentOptionsSchema.parse(value), requestId);
    const offer = options.items.find((item) => item.id === SNAPPPAY_GATEWAY_ID && item.eligible && item.title.trim());
    return offer ? paymentMethodSchema.parse({
      id: SNAPPPAY_GATEWAY_ID,
      title: offer.title.trim(),
      ...(offer.description.trim() ? { description: offer.description.trim() } : {}),
      provider: "snapppay",
    }) : null;
  } catch (error) {
    console.error("[payment] snapppay_eligibility_unavailable", { requestId, code: error instanceof UpstreamError ? error.detail.code : "invalid" });
    return null;
  }
}

async function paymentMethods(requestId: string, cart: Cart): Promise<PaymentMethod[]> {
  const ids = offeredPaymentMethodIds(requestId, cart);
  const snapppay = ids.includes(SNAPPPAY_GATEWAY_ID) ? await snapppayOffer(cart, requestId) : null;
  const methods = ids.flatMap((id): PaymentMethod[] => {
    if (id === SNAPPPAY_GATEWAY_ID) return snapppay ? [snapppay] : [];
    return [{ id, title: "پرداخت آنلاین", description: "از طریق درگاه پرداخت الکترونیک", provider: "zarinpal" }];
  });
  if (!methods.length) noPaymentMethod(requestId);
  return methods;
}

function unavailablePaymentMethod(requestId: string): never {
  throw new ServiceError({
    code: "validation",
    status: 400,
    message: "The selected payment method is no longer available.",
    requestId,
    retryable: false,
    fieldErrors: { paymentMethodId: ["این روش پرداخت برای مبلغ فعلی سفارش در دسترس نیست. روش دیگری انتخاب کنید."] },
  });
}

function checkoutCart(requestId: string, cart: ReturnType<typeof mapCart>) {
  if (cart.items.length === 0) {
    throw new ServiceError({
      code: "conflict",
      status: 409,
      message: "The cart is empty.",
      requestId,
      retryable: false,
    });
  }
  return cart;
}

function unavailableSlot(requestId: string) {
  throw new ServiceError({
    code: "validation",
    status: 400,
    message: "The selected delivery slot is no longer available.",
    requestId,
    retryable: false,
    fieldErrors: { deliverySlotId: ["زمان ارسال را دوباره انتخاب کنید."] },
  });
}

function checkoutAddresses(input: ReturnType<typeof submitCheckoutSchema.parse>, customer: Awaited<ReturnType<typeof authenticatedCustomer>>) {
  const recipient = input.recipient.kind === "self"
    ? { ...input.sender, phone: customer.phone }
    : { firstName: input.recipient.firstName, lastName: input.recipient.lastName, phone: input.recipient.phone };
  const sharedAddress = {
    address_1: input.address.address1,
    address_2: [input.address.buildingNumber ? `پلاک ${input.address.buildingNumber}` : "", input.address.unitNumber ? `واحد ${input.address.unitNumber}` : "", input.address.address2 ?? ""].filter(Boolean).join("، "),
    city: "تهران",
    country: "IR",
  };
  return {
    billing_address: {
      first_name: input.sender.firstName,
      last_name: input.sender.lastName,
      email: customer.email,
      phone: customer.phone,
      ...sharedAddress,
    },
    shipping_address: {
      first_name: recipient.firstName,
      last_name: recipient.lastName,
      phone: recipient.phone,
      ...sharedAddress,
    },
  };
}

function additionalFields(input: ReturnType<typeof submitCheckoutSchema.parse>) {
  return {
    [deliveryField]: input.deliverySlotId,
    [packagingField]: input.packagingId,
    [postcardField]: input.postcardText,
    [postcardDesignField]: input.postcardEnabled && input.postcardDesignId ? String(input.postcardDesignId) : "",
    [locationField]: input.address.location
      ? `${input.address.location.latitude},${input.address.location.longitude}`
      : "",
    [operationField]: input.operationId,
  };
}

/** Starts the gateway through the owner-protected endpoint used by payment retries. */
async function startGatewayPayment(orderId: number, attemptId: string, requestId: string) {
  const { redirectUrl } = await retryProfileOrderPayment(orderId, attemptId, requestId);
  return { paymentStatus: "pending", redirectUrl };
}

function checkoutFailureAfterUnmaterializedOrder(responseBody: unknown, requestId: string, methodId: string): never {
  const failure = gatewayFailure(responseBody, requestId, methodId);
  if (failure) throw failure;
  throw new ServiceError({
    code: "validation",
    status: 400,
    message: "The checkout could not be completed.",
    requestId,
    retryable: false,
  });
}

async function cartForCheckout(headers: Record<string, string>, requestId: string) {
  const response = await wordpressFetch("/wp-json/wc/store/v1/cart", { headers, cache: "no-store", requestId });
  return {
    cart: mapCart(await parseUpstreamJson(response, (value) => upstreamCartSchema.parse(value), requestId)),
    cartToken: response.headers.get("cart-token"),
  };
}

export async function checkoutState(requestId: string) {
  const customer = await authenticatedCustomer(requestId);
  const initialHeaders = await checkoutHeaders();
  const { cart: currentCart, cartToken } = await cartForCheckout(initialHeaders, requestId);
  const cart = checkoutCart(requestId, currentCart);
  const bearerHeaders = await wordpressBearerHeaders();
  const [addressesResponse, postcardDesignsResponse] = await Promise.all([
    wordpressFetch("/wp-json/kadochi/v1/customer/addresses", { headers: bearerHeaders, cache: "no-store", requestId }),
    wordpressFetch("/wp-json/kadochi/v1/checkout/postcard-designs", { headers: bearerHeaders, cache: "no-store", requestId }),
  ]);
  const [savedAddresses, postcardDesigns] = await Promise.all([
    parseUpstreamJson(addressesResponse, (value) => savedAddressListSchema.parse(value), requestId),
    parseUpstreamJson(postcardDesignsResponse, (value) => z.object({ items: z.array(postcardDesignSchema).max(50) }).strict().parse(value), requestId),
  ]);
  const state = checkoutStateSchema.parse({
    cart,
    customer,
    deliverySlots: createDeliverySlots(cart),
    packagingOptions: [
      { id: "gift", label: "بسته‌بندی هدیه", imageUrl: "/images/special-pack.png", fee: { amount: "0", currencyCode: "IRR", minorUnit: 0 }, default: true },
      { id: "normal", label: "بسته‌بندی معمولی", imageUrl: "/images/normal-pack.png", fee: { amount: "0", currencyCode: "IRR", minorUnit: 0 }, default: false },
    ],
    postcardDesigns: postcardDesigns.items,
    paymentMethods: await paymentMethods(requestId, cart),
    savedAddresses: savedAddresses.items,
  });
  return { state, cartToken };
}

/** Re-evaluates payment methods after the cart total changes (for example, a coupon). */
export async function checkoutPaymentMethods(requestId: string) {
  await authenticatedCustomer(requestId);
  const { cart: currentCart, cartToken } = await cartForCheckout(await checkoutHeaders(), requestId);
  const cart = checkoutCart(requestId, currentCart);
  return { items: await paymentMethods(requestId, cart), cartToken };
}

export async function createSavedAddress(input: unknown, requestId: string) {
  const address = createSavedAddressSchema.parse(input);
  const response = await wordpressFetch("/wp-json/kadochi/v1/customer/addresses", {
    method: "POST",
    body: JSON.stringify(address),
    headers: { ...await wordpressBearerHeaders(), "Content-Type": "application/json" },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => savedAddressSchema.parse(value), requestId);
}

export async function listSavedAddresses(requestId: string) {
  const response = await wordpressFetch("/wp-json/kadochi/v1/customer/addresses", {
    headers: await wordpressBearerHeaders(), cache: "no-store", requestId,
  });
  return parseUpstreamJson(response, (value) => savedAddressListSchema.parse(value), requestId);
}

export async function updateSavedAddress(addressId: string, input: unknown, requestId: string) {
  const address = createSavedAddressSchema.parse(input);
  const response = await wordpressFetch(`/wp-json/kadochi/v1/customer/addresses/${encodeURIComponent(addressId)}`, {
    method: "PUT",
    body: JSON.stringify(address),
    headers: { ...await wordpressBearerHeaders(), "Content-Type": "application/json" },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => savedAddressSchema.parse(value), requestId);
}

export async function deleteSavedAddress(addressId: string, requestId: string) {
  const response = await wordpressFetch(`/wp-json/kadochi/v1/customer/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    headers: await wordpressBearerHeaders(),
    cache: "no-store",
    requestId,
  });
  if (!response.ok && response.status !== 204) {
    await parseUpstreamJson(response, () => undefined, requestId);
  }
}

export async function orderSummary(orderId: number, requestId: string) {
  await authenticatedCustomer(requestId);
  const response = await wordpressFetch(`/wp-json/kadochi/v1/orders/${orderId}`, {
    headers: await checkoutHeaders(),
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => orderSummarySchema.parse(value), requestId);
}

async function orderSummaryForOperation(operationId: string, requestId: string) {
  await authenticatedCustomer(requestId);
  const response = await wordpressFetch(`/wp-json/kadochi/v1/checkout/operations/${operationId}`, {
    headers: await checkoutHeaders(),
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => orderSummarySchema.parse(value), requestId);
}

export async function checkout(input: unknown, requestId: string) {
  const parsed = submitCheckoutSchema.parse(input);
  const customer = await authenticatedCustomer(requestId);
  let lastCartToken: string | null = null;
  let paymentSubmitted = false;

  try {
    const initialHeaders = await checkoutHeaders();
    const { cart: currentCart, cartToken } = await cartForCheckout(initialHeaders, requestId);
    const cart = checkoutCart(requestId, currentCart);
    lastCartToken = cartToken;
    const offeredIds = offeredPaymentMethodIds(requestId, cart);
    const methodId = parsed.paymentMethodId ?? offeredIds[0];
    if (!offeredIds.includes(methodId)) unavailablePaymentMethod(requestId);
    const provider = paymentProvider(methodId);
    if (!createDeliverySlots(cart).some((slot) => slot.id === parsed.deliverySlotId && slot.available)) unavailableSlot(requestId);

    const draftHeaders = await checkoutHeaders(cartToken ?? undefined);
    const draft = await wordpressFetch("/wp-json/wc/store/v1/checkout?__experimental_calc_totals=true", {
      method: "PUT",
      headers: { ...draftHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_method: methodId,
        additional_fields: additionalFields(parsed),
      }),
      cache: "no-store",
      requestId,
    });
    lastCartToken = draft.headers.get("cart-token") ?? lastCartToken;
    await parseUpstreamJson(draft, (value) => upstreamCheckoutDraftSchema.parse(value), requestId);
    // Snapp! Pay eligibility depends on the exact amount, which may have changed
    // since the payment step loaded. Snapp requires a fresh check per amount.
    if (provider === "snapppay" && !(await snapppayOffer(cart, requestId))) unavailablePaymentMethod(requestId);

    paymentSubmitted = true;
    const response = await wordpressFetch("/wp-json/wc/store/v1/checkout", {
      method: "POST",
      headers: {
        ...(await checkoutHeaders(lastCartToken ?? undefined)),
        "Content-Type": "application/json",
        "Idempotency-Key": parsed.operationId,
      },
      body: JSON.stringify({
        ...checkoutAddresses(parsed, customer),
        payment_method: methodId,
        payment_data: [],
        // Required again on POST by current Woo versions even when PUT stored the
        // values in the shopper session or an older persisted draft order.
        additional_fields: additionalFields(parsed),
      }),
      cache: "no-store",
      requestId,
      // Woo represents a gateway-declared payment failure as HTTP 400 with a
      // normal checkout result body. The schema below still rejects error DTOs.
      acceptStatuses: [400],
      // Snapp! Pay requests its payment token inside this POST.
      ...(provider === "snapppay" ? { timeoutMs: 25_000 } : {}),
    });
    lastCartToken = response.headers.get("cart-token") ?? lastCartToken;
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new UpstreamError({ code: "malformed_upstream_response", status: 502, message: "The upstream service returned invalid JSON.", requestId, retryable: true });
    }
    if (response.status === 400) {
      // ZarinPal can return a Store API 400 after Woo has already materialized
      // the order. The operation ID is the owner-scoped source of truth; never
      // trust the partial Store API response to choose an order for payment.
      try {
        const summary = await orderSummaryForOperation(parsed.operationId, requestId);
        if (summary.paid) {
          return {
            result: checkoutResultSchema.parse({
              orderId: summary.id,
              status: summary.status,
              reconciliation: "paid",
            }),
            cartToken: lastCartToken,
          };
        }
        const paymentResult = await startGatewayPayment(summary.id, parsed.operationId, requestId);
        return {
          result: checkoutResultSchema.parse({
            orderId: summary.id,
            status: summary.status,
            paymentResult,
          }),
          cartToken: lastCartToken,
        };
      } catch (error) {
        if (error instanceof UpstreamError && error.detail.code === "not_found") {
          checkoutFailureAfterUnmaterializedOrder(responseBody, requestId, methodId);
        }
        throw error;
      }
    }
    let result;
    try {
      result = mapCheckoutResult(responseBody);
    } catch {
      throw new UpstreamError({ code: "malformed_upstream_response", status: 502, message: "The upstream service returned an unexpected response.", requestId, retryable: true });
    }
    // The pinned ZarinPal gateway normally returns Woo's intermediate order-pay
    // URL from Store API. Its retry endpoint performs the real authority request.
    // A direct, validated ZarinPal URL is already a completed gateway start and
    // must not create a second authority.
    if (result.orderId && methodId === ZARINPAL_GATEWAY_ID && !isTrustedGatewayRedirect(result.paymentResult?.redirectUrl, methodId, env)) {
      const paymentResult = await startGatewayPayment(result.orderId, parsed.operationId, requestId);
      return {
        result: checkoutResultSchema.parse({ ...result, paymentResult }),
        cartToken: lastCartToken,
      };
    }
    // Snapp! Pay's process_payment() returns its payment page directly. Never
    // send the customer to an unexpected host; the order's failure page can retry.
    if (provider === "snapppay" && result.paymentResult?.redirectUrl && !isTrustedGatewayRedirect(result.paymentResult.redirectUrl, methodId, env)) {
      console.error("[payment] untrusted_gateway_redirect", { requestId, provider });
      return {
        result: checkoutResultSchema.parse({ orderId: result.orderId, status: result.status, reconciliation: result.orderId ? "unpaid" : "unknown" }),
        cartToken: lastCartToken,
      };
    }
    return { result, cartToken: lastCartToken };
  } catch (error) {
    // A known gateway rejection is definitive: move the customer to the order's
    // failure result so a later explicit retry gets a fresh payment-attempt ID.
    if (paymentSubmitted && error instanceof UpstreamError && error.detail.code === "upstream_failure" && !error.detail.retryable) {
      try {
        const summary = await orderSummaryForOperation(parsed.operationId, requestId);
        return {
          result: checkoutResultSchema.parse({
            orderId: summary.id,
            status: summary.status,
            reconciliation: summary.paid ? "paid" : "unpaid",
          }),
          cartToken: lastCartToken,
        };
      } catch {
        // Preserve the definite gateway rejection if its operation cannot be read.
      }
    }
    // A retryable failure after POST may hide a completed gateway call. Reconcile the
    // recorded operation, then ask the payment-start endpoint to recover only this
    // same attempt. WordPress returns a saved redirect or an in-progress response;
    // it never creates a second authority for the same attempt ID.
    if (paymentSubmitted && error instanceof UpstreamError && error.detail.retryable) {
      try {
        const summary = await orderSummaryForOperation(parsed.operationId, requestId);
        if (summary.paid) {
          return {
            result: checkoutResultSchema.parse({ orderId: summary.id, status: summary.status, reconciliation: "paid" }),
            cartToken: lastCartToken,
          };
        }
        const paymentResult = await startGatewayPayment(summary.id, parsed.operationId, requestId);
        return {
          result: checkoutResultSchema.parse({
            orderId: summary.id,
            status: summary.status,
            paymentResult,
          }),
          cartToken: lastCartToken,
        };
      } catch {
        return {
          result: checkoutResultSchema.parse({ status: "unknown", reconciliation: "unknown" }),
          cartToken: lastCartToken,
        };
      }
    }
    throw error;
  }
}
