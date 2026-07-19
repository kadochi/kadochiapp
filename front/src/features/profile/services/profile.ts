import { bffJson } from "@/lib/http/browser";

import {
  customerSchema,
  profileOrderDetailSchema,
  profileOrderListSchema,
  updateProfileSchema,
} from "../schema/profile";
import type { UpdateProfileInput } from "../types";

export function updateProfile(input: UpdateProfileInput) {
  return bffJson(
    "/api/profile",
    { method: "PATCH", body: JSON.stringify(updateProfileSchema.parse(input)) },
    (value) => customerSchema.parse(value),
  );
}

export function listProfileOrders(page = 1, perPage = 20) {
  const query = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  return bffJson(`/api/profile/orders?${query}`, { method: "GET" }, (value) => profileOrderListSchema.parse(value));
}

export function getProfileOrder(orderId: number) {
  return bffJson(`/api/profile/orders/${orderId}`, { method: "GET" }, (value) => profileOrderDetailSchema.parse(value));
}
