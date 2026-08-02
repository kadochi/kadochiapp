import { bffJson } from "@/lib/http/browser";

import {
  customerSchema,
  profileOrderDetailSchema,
  profileOrderListSchema,
  profileOrderRetryPaymentSchema,
  profileOrderRetryPaymentRequestSchema,
  profileProductActionSchema,
  profileProductListSchema,
  notificationListSchema,
  notificationReadResultSchema,
  personalProfileSchema,
  updatePersonalProfileSchema,
  updateProfileSchema,
} from "../schema/profile";
import type { UpdatePersonalProfileInput, UpdateProfileInput } from "../types";

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

export function retryProfileOrderPayment(orderId: number, attemptId: string) {
  return bffJson(
    `/api/profile/orders/${orderId}/retry-payment`,
    { method: "POST", body: JSON.stringify(profileOrderRetryPaymentRequestSchema.parse({ attemptId })) },
    (value) => profileOrderRetryPaymentSchema.parse(value),
  );
}

export function listProfileProducts(action: "save" | "like", page = 1, perPage = 20) {
  const query = new URLSearchParams({ action: profileProductActionSchema.parse(action), page: String(page), perPage: String(perPage) });
  return bffJson(`/api/profile/product-actions?${query}`, { method: "GET" }, (value) => profileProductListSchema.parse(value));
}

export function listNotifications() {
  return bffJson("/api/profile/notifications", { method: "GET" }, (value) => notificationListSchema.parse(value));
}

export function markNotificationsRead() {
  return bffJson("/api/profile/notifications", { method: "PATCH" }, (value) => notificationReadResultSchema.parse(value));
}

export function getPersonalProfile() {
  return bffJson("/api/profile/personal", { method: "GET" }, (value) => personalProfileSchema.parse(value));
}

export function updatePersonalProfile(input: UpdatePersonalProfileInput) {
  return bffJson(
    "/api/profile/personal",
    { method: "PUT", body: JSON.stringify(updatePersonalProfileSchema.parse(input)) },
    (value) => personalProfileSchema.parse(value),
  );
}
