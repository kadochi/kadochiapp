import "server-only";

import { wordpressBearerHeaders } from "@/features/auth/services/auth.server";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";

import {
  customerSchema,
  profileOrderDetailSchema,
  profileOrderListSchema,
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
