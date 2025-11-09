import "server-only";

import { cache } from "react";

import { getSessionFromCookies } from "@/lib/auth/session";
import { wooFetch } from "@/lib/api/woo";

/* eslint-disable @typescript-eslint/no-explicit-any */

const WP_BASE =
  process.env.WOO_BASE_URL ||
  process.env.WP_BASE_URL ||
  process.env.NEXT_PUBLIC_WP_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.kadochi.com";

const ORDER_DETAIL_FIELDS = [
  "id",
  "status",
  "date_created",
  "date_created_gmt",
  "customer_id",
  "billing",
  "shipping",
  "line_items",
  "fee_lines",
  "total",
  "total_tax",
  "shipping_total",
  "meta_data",
].join(",");

export type RawWooStatus =
  | "pending"
  | "pending-payment"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft"
  | string;

export type OrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft";

export type OrderLineItem = {
  id: number | string;
  product_id?: number | string | null;
  name?: string;
  quantity?: number;
  image?: { src: string; alt?: string } | null;
};

export type OrderSummary = {
  id: number | string;
  status: OrderStatus;
  created_at: string;
  total: number;
  line_items: OrderLineItem[];
};

export type OrderDetail = {
  id: number | string;
  status: OrderStatus;
  created_at: string;
  sender?: string;
  receiver?: string;
  delivery_window?: string;
  address?: string;
  items: Array<{ id: number | string; name?: string; image?: string | null }>;
  summary: {
    subtotal?: number;
    tax?: number;
    shipping?: number;
    service?: number;
    total?: number;
  };
};

function onlyDigits(v?: string | null) {
  return String(v || "").replace(/\D+/g, "");
}

function mapStatus(raw?: RawWooStatus): OrderStatus {
  const v = String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  switch (v) {
    case "pending":
    case "pending-payment":
      return "pending";
    case "processing":
      return "processing";
    case "on-hold":
      return "on-hold";
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    case "failed":
      return "failed";
    case "draft":
      return "draft";
    default:
      return "pending";
  }
}

function absolutize(url?: string | null): string | null {
  if (!url) return null;
  try {
    const base = new URL(WP_BASE);
    const full = new URL(url, base);
    if (full.protocol === "http:") full.protocol = "https:";
    return full.toString();
  } catch {
    return null;
  }
}

function normaliseLineItem(li: any): OrderLineItem {
  const candidate =
    li?.image?.src ||
    li?.image?.url ||
    li?.image_url ||
    li?.thumbnail ||
    (typeof li?.image === "string" ? li.image : "");
  const abs = absolutize(candidate);
  return {
    id: li?.id ?? li?.item_id ?? li?.product_id ?? Math.random(),
    product_id: li?.product_id ?? null,
    name: li?.name ?? undefined,
    quantity: typeof li?.quantity === "number" ? li.quantity : undefined,
    image: abs ? { src: abs, alt: li?.name ?? undefined } : null,
  };
}

function normaliseOrderSummary(order: any): OrderSummary {
  const created =
    order?.date_created || order?.date_created_gmt || new Date().toISOString();
  const rawItems: any[] = Array.isArray(order?.line_items) ? order.line_items : [];
  const lineItems = rawItems.map(normaliseLineItem);
  return {
    id: order?.id ?? order?.order_id ?? "",
    status: mapStatus(order?.status),
    created_at: created,
    total: Number(order?.total ?? order?.total_price ?? 0),
    line_items: lineItems,
  };
}

function mapOrderDetailPayload(order: any): OrderDetail {
  const items = Array.isArray(order?.line_items)
    ? order.line_items.map((li: any) => {
        const normalized = normaliseLineItem(li);
        return {
          id: normalized.id,
          name: normalized.name,
          image: normalized.image?.src ?? null,
        };
      })
    : [];

  const meta: any[] = Array.isArray(order?.meta_data) ? order.meta_data : [];
  const getMeta = (k: string) => meta.find((m) => String(m?.key) === k)?.value ?? "";

  const receiverMeta = String(getMeta("_kadochi_receiver_name") || "");
  const receiverName = receiverMeta
    ? receiverMeta
    : `${order?.shipping?.first_name || ""} ${order?.shipping?.last_name || ""}`.trim();

  const senderName = `${order?.billing?.first_name || ""} ${
    order?.billing?.last_name || ""
  }`.trim();

  const addressParts = [
    order?.shipping?.state,
    order?.shipping?.city,
    order?.shipping?.address_1,
    order?.shipping?.address_2,
  ].filter(Boolean);
  const address = addressParts.join("، ");

  const subtotal = Array.isArray(order?.line_items)
    ? order.line_items.reduce((sum: number, li: any) => sum + Number(li?.subtotal || 0), 0)
    : 0;
  const service = Array.isArray(order?.fee_lines)
    ? order.fee_lines.reduce((sum: number, f: any) => sum + Number(f?.total || 0), 0)
    : 0;
  const total = Number(order?.total || 0);
  const tax = Number(order?.total_tax || 0);
  const shipping = Number(order?.shipping_total || 0);

  return {
    id: order?.id ?? order?.order_id ?? "",
    status: mapStatus(order?.status),
    created_at: order?.date_created || order?.date_created_gmt || new Date().toISOString(),
    sender: senderName || undefined,
    receiver: receiverName || undefined,
    delivery_window: String(getMeta("_kadochi_delivery") || "") || undefined,
    address: address || undefined,
    items,
    summary: { subtotal, tax, shipping, service, total },
  };
}

const findCustomerIdByPhone = cache(async (phoneDigits: string) => {
  if (!phoneDigits) return null;

  const searchQs = new URLSearchParams({ per_page: "20", search: phoneDigits });
  const searchRes = await wooFetch(`/wp-json/wc/v3/customers?${searchQs.toString()}`, {
    method: "GET",
    revalidateSeconds: 300,
  });
  if (searchRes.ok) {
    const data = (await searchRes.json()) as any[];
    const hit = data.find((c) => onlyDigits(c?.billing?.phone) === phoneDigits);
    if (hit?.id) return Number(hit.id);
  }

  const fallbackRes = await wooFetch("/wp-json/wc/v3/customers?per_page=50", {
    method: "GET",
    revalidateSeconds: 300,
  });
  if (fallbackRes.ok) {
    const data = (await fallbackRes.json()) as any[];
    const hit = data.find((c) => onlyDigits(c?.billing?.phone) === phoneDigits);
    if (hit?.id) return Number(hit.id);
  }

  return null;
});

const fetchOrdersForCustomer = cache(async (customerId: number) => {
  const qs = new URLSearchParams({
    customer: String(customerId),
    per_page: "50",
    orderby: "date",
    order: "desc",
    status: "any",
  });

  let res = await wooFetch(`/wp-json/wc/v3/orders?${qs.toString()}`, {
    method: "GET",
    revalidateSeconds: 30,
  });

  if (!res.ok && (res.status === 400 || res.status === 404)) {
    const qs2 = new URLSearchParams(qs);
    qs2.delete("status");
    res = await wooFetch(`/wp-json/wc/v3/orders?${qs2.toString()}`, {
      method: "GET",
      revalidateSeconds: 30,
    });
  }

  if (!res.ok) return [];

  const data = (await res.json()) as any[];
  if (!Array.isArray(data)) return [];

  return data.map((o) => {
    const items: any[] = Array.isArray(o?.line_items) ? o.line_items : [];
    const patched = items.map((li) => {
      if (li?.image?.src) return li;
      const image = normaliseLineItem(li).image;
      return image ? { ...li, image } : li;
    });
    return normaliseOrderSummary({ ...o, line_items: patched });
  });
});

export async function listOrdersForSession(): Promise<OrderSummary[]> {
  const session = await getSessionFromCookies();
  const sessionId =
    typeof session.userId === "number" && session.userId > 0 ? session.userId : null;
  const phoneDigits = onlyDigits(session.phone);

  if (!sessionId && !phoneDigits) {
    const err = new Error("unauthorized");
    (err as any).status = 401;
    throw err;
  }

  const customerId = sessionId ?? (phoneDigits ? await findCustomerIdByPhone(phoneDigits) : null);
  if (!customerId) return [];

  return await fetchOrdersForCustomer(customerId);
}

export async function getOrderDetailForSession(
  orderId: string | number,
): Promise<OrderDetail | null> {
  const idNum = Number(orderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error("bad_id");
    (err as any).status = 400;
    throw err;
  }

  const session = await getSessionFromCookies();
  const sessionUserId =
    typeof session.userId === "number" && session.userId > 0 ? session.userId : null;
  const sessionPhone = onlyDigits(session.phone);

  if (!sessionUserId && !sessionPhone) {
    const err = new Error("unauthorized");
    (err as any).status = 401;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await wooFetch(`/wp-json/wc/v3/orders/${idNum}?_fields=${ORDER_DETAIL_FIELDS}`, {
      method: "GET",
      revalidateSeconds: 30,
      signal: controller.signal,
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const err = new Error("upstream_error");
      (err as any).status = 502;
      throw err;
    }

    const data = (await res.json()) as any;
    if (!data || typeof data !== "object") {
      const err = new Error("upstream_error");
      (err as any).status = 502;
      throw err;
    }

    const orderCustomerId = Number(data?.customer_id || 0) || null;
    const orderPhone = onlyDigits(data?.billing?.phone);

    const ownsOrder =
      (sessionUserId && orderCustomerId && sessionUserId === orderCustomerId) ||
      (sessionPhone && orderPhone && sessionPhone === orderPhone);

    if (!ownsOrder) {
      const err = new Error("forbidden");
      (err as any).status = 403;
      throw err;
    }

    return mapOrderDetailPayload(data);
  } catch (error: any) {
    if (error?.name === "AbortError") {
      const err = new Error("upstream_timeout");
      (err as any).status = 504;
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
