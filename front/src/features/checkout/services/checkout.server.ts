import "server-only";

import { cookies } from "next/headers";

import { getCurrentCustomer, getStoredAuthToken, wordpressBearerHeaders } from "@/features/auth/services/auth.server";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, UpstreamError, wordpressFetch } from "@/lib/http/upstream";
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
  savedAddressListSchema,
  savedAddressSchema,
  submitCheckoutSchema,
  upstreamCheckoutDraftSchema,
} from "../schema/checkout";

const cartTokenCookie = "kadochi_cart_token";
const deliveryField = "kadochi/delivery-slot";
const packagingField = "kadochi/packaging";
const postcardField = "kadochi/postcard";
const locationField = "kadochi/location";
const operationField = "kadochi/operation-id";

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

function paymentMethod(requestId: string, paymentMethodIds: string[]) {
  const id = env.KADOCHI_PAYMENT_METHOD_ID;
  if (!paymentMethodIds.includes(id)) {
    throw new ServiceError({
      code: "configuration",
      status: 503,
      message: "Online payment is not available for this cart.",
      requestId,
      retryable: false,
    });
  }
  return { id, title: "پرداخت آنلاین زرین‌پال" };
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
    address_2: input.address.address2 ?? "",
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
    [locationField]: input.address.location
      ? `${input.address.location.latitude},${input.address.location.longitude}`
      : "",
    [operationField]: input.operationId,
  };
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
  const addressesResponse = await wordpressFetch("/wp-json/kadochi/v1/customer/addresses", {
    headers: await wordpressBearerHeaders(), cache: "no-store", requestId,
  });
  const savedAddresses = await parseUpstreamJson(addressesResponse, (value) => savedAddressListSchema.parse(value), requestId);
  const state = checkoutStateSchema.parse({
    cart,
    customer,
    deliverySlots: createDeliverySlots(cart),
    packagingOptions: [
      { id: "gift", label: "بسته‌بندی هدیه", imageUrl: "/images/special-pack.png", fee: { amount: "0", currencyCode: "IRR", minorUnit: 0 }, default: true },
      { id: "normal", label: "بسته‌بندی معمولی", imageUrl: "/images/normal-pack.png", fee: { amount: "0", currencyCode: "IRR", minorUnit: 0 }, default: false },
    ],
    paymentMethod: paymentMethod(requestId, cart.paymentMethodIds),
    savedAddresses: savedAddresses.items,
  });
  return { state, cartToken };
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
    paymentMethod(requestId, cart.paymentMethodIds);
    if (!createDeliverySlots(cart).some((slot) => slot.id === parsed.deliverySlotId)) unavailableSlot(requestId);

    const draftHeaders = await checkoutHeaders(cartToken ?? undefined);
    const draft = await wordpressFetch("/wp-json/wc/store/v1/checkout?__experimental_calc_totals=true", {
      method: "PUT",
      headers: { ...draftHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_method: env.KADOCHI_PAYMENT_METHOD_ID,
        additional_fields: additionalFields(parsed),
      }),
      cache: "no-store",
      requestId,
    });
    lastCartToken = draft.headers.get("cart-token") ?? lastCartToken;
    await parseUpstreamJson(draft, (value) => upstreamCheckoutDraftSchema.parse(value), requestId);

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
        payment_method: env.KADOCHI_PAYMENT_METHOD_ID,
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
    });
    lastCartToken = response.headers.get("cart-token") ?? lastCartToken;
    return { result: await parseUpstreamJson(response, mapCheckoutResult, requestId), cartToken: lastCartToken };
  } catch (error) {
    // A retryable failure after POST may hide a completed gateway call. Reconcile the
    // recorded operation instead of issuing a second payment attempt automatically.
    if (paymentSubmitted && error instanceof UpstreamError && error.detail.retryable) {
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
        return {
          result: checkoutResultSchema.parse({ status: "unknown", reconciliation: "unknown" }),
          cartToken: lastCartToken,
        };
      }
    }
    throw error;
  }
}
