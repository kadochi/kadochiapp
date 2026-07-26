import "server-only";

import { wordpressBearerHeaders } from "@/features/auth/services/auth.server";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { listProducts } from "@/features/products/services/products.server";

import {
  customerSchema,
  profileOrderDetailSchema,
  profileOrderListSchema,
  profileOrderRetryPaymentSchema,
  profileProductActionListSchema,
  profileProductActionSchema,
  profileProductListSchema,
  personalProfileSchema,
  publicPersonalProfileSchema,
  updatePersonalProfileSchema,
  updateProfileSchema,
} from "../schema/profile";

export async function updateProfile(input: unknown, requestId: string) {
  const body = updateProfileSchema.parse(input);
  const response = await wordpressFetch("/wp-json/kadochi/v1/customer", {
    method: "PATCH",
    headers: { ...await wordpressBearerHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => customerSchema.parse(value), requestId);
}

export async function listProfileOrders(page: number, perPage: number, requestId: string) {
  const query = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  const response = await wordpressFetch(`/wp-json/kadochi/v1/profile/orders?${query}`, {
    headers: await wordpressBearerHeaders(),
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => profileOrderListSchema.parse(value), requestId);
}

export async function getProfileOrder(orderId: number, requestId: string) {
  const response = await wordpressFetch(`/wp-json/kadochi/v1/profile/orders/${orderId}`, {
    headers: await wordpressBearerHeaders(),
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => profileOrderDetailSchema.parse(value), requestId);
}

export async function retryProfileOrderPayment(orderId: number, requestId: string) {
  const response = await wordpressFetch(`/wp-json/kadochi/v1/profile/orders/${orderId}/retry-payment`, {
    method: "POST",
    headers: await wordpressBearerHeaders(),
    redirect: "manual",
    acceptStatuses: [302],
    cache: "no-store",
    requestId,
  });
  if (response.status === 302) {
    const redirectUrl = response.headers.get("location");
    try {
      const result = profileOrderRetryPaymentSchema.parse({ redirectUrl });
      const host = new URL(result.redirectUrl).hostname;
      if (host === "payment.zarinpal.com" || host === "sandbox.zarinpal.com") return result;
    } catch {
      // Normalized below so the BFF returns a safe service error.
    }
    throw new ServiceError({
      code: "upstream_failure",
      status: 502,
      message: "The payment gateway returned an invalid redirect.",
      requestId,
      retryable: true,
    });
  }
  return parseUpstreamJson(response, (value) => profileOrderRetryPaymentSchema.parse(value), requestId);
}

export async function listProfileProducts(action: unknown, page: number, perPage: number, requestId: string) {
  const actionType = profileProductActionSchema.parse(action);
  const query = new URLSearchParams({ action: actionType, page: String(page), perPage: String(perPage) });
  const response = await wordpressFetch(`/wp-json/kadochi/v1/profile/product-actions?${query}`, {
    headers: await wordpressBearerHeaders(), cache: "no-store", requestId,
  });
  const actions = await parseUpstreamJson(response, (value) => profileProductActionListSchema.parse(value), requestId);
  if (!actions.productIds.length) return profileProductListSchema.parse({ items: [], page: actions.page, perPage: actions.perPage, total: actions.total, totalPages: actions.totalPages });

  const products = await listProducts({ include: actions.productIds, perPage: actions.productIds.length });
  const productsById = new Map(products.items.map((product) => [product.id, product]));
  return profileProductListSchema.parse({
    items: actions.productIds.flatMap((id) => {
      const product = productsById.get(id);
      return product ? [product] : [];
    }),
    page: actions.page,
    perPage: actions.perPage,
    total: actions.total,
    totalPages: actions.totalPages,
  });
}

export async function getPersonalProfile(requestId: string) {
  const response = await wordpressFetch("/wp-json/kadochi/v1/personal-profile", {
    headers: await wordpressBearerHeaders(), cache: "no-store", requestId,
  });
  return parseUpstreamJson(response, (value) => personalProfileSchema.parse(value), requestId);
}

export async function updatePersonalProfile(input: unknown, requestId: string) {
  const body = updatePersonalProfileSchema.parse(input);
  const response = await wordpressFetch("/wp-json/kadochi/v1/personal-profile", {
    method: "PUT", body: JSON.stringify(body), headers: { ...await wordpressBearerHeaders(), "Content-Type": "application/json" }, cache: "no-store", requestId,
  });
  return parseUpstreamJson(response, (value) => personalProfileSchema.parse(value), requestId);
}

/** Public profile data is intentionally fetched without the visitor's session. */
export async function getPublicPersonalProfile(username: string, requestId: string) {
  const response = await wordpressFetch(`/wp-json/kadochi/v1/public-profiles/${encodeURIComponent(username)}`, {
    cache: "no-store", requestId,
  });
  return parseUpstreamJson(response, (value) => publicPersonalProfileSchema.parse(value), requestId);
}
