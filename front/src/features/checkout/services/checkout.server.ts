import "server-only";

import { z } from "zod";
import { cookies } from "next/headers";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { upstreamCartSchema } from "../../cart/schema/cart";
import { mapCart } from "../../cart/utils/map-cart";
import { checkoutResultSchema, checkoutStateSchema, submitCheckoutSchema } from "../schema/checkout";

const paymentMethodsSchema = z.array(z.object({ id: z.string(), title: z.string(), description: z.string().default(""), supports: z.array(z.string()).default([]) }));
async function tokenHeaders(): Promise<Record<string, string>> { const token = (await cookies()).get("kadochi_cart_token")?.value; return token ? { "Cart-Token": token } : {}; }
function checkoutEnabled(requestId: string) { if (process.env.KADOCHI_CHECKOUT_ENABLED !== "true") throw new ServiceError({ code: "configuration", status: 503, message: "Checkout is disabled until payment and shipping configuration is verified.", requestId, retryable: false }); }

export async function checkoutState(requestId: string) {
  checkoutEnabled(requestId);
  const headers = await tokenHeaders();
  const [cartResponse, gatewayResponse] = await Promise.all([
    wordpressFetch("/wp-json/wc/store/v1/cart", { headers, cache: "no-store", requestId }),
    wordpressFetch("/wp-json/wc/store/v1/checkout", { headers, cache: "no-store", requestId }),
  ]);
  const cart = mapCart(await parseUpstreamJson(cartResponse, (value) => upstreamCartSchema.parse(value), requestId));
  const paymentMethods = await parseUpstreamJson(gatewayResponse, (value) => paymentMethodsSchema.parse(value), requestId);
  return checkoutStateSchema.parse({ cart, paymentMethods });
}

export async function checkout(input: unknown, requestId: string) {
  checkoutEnabled(requestId);
  const parsed = submitCheckoutSchema.parse(input);
  const headers = await tokenHeaders();
  const response = await wordpressFetch("/wp-json/wc/store/v1/checkout", { method: "POST", headers: { ...headers, "Content-Type": "application/json", "Idempotency-Key": parsed.operationId }, body: JSON.stringify({ billing_address: parsed.billingAddress, shipping_address: parsed.shippingAddress, payment_method: parsed.paymentMethod, payment_data: parsed.paymentData }), cache: "no-store", requestId });
  return parseUpstreamJson(response, (value) => checkoutResultSchema.parse(value), requestId);
}
