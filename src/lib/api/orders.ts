import "server-only";
import { cache } from "react";
import { getSessionFromCookies } from "@/lib/auth/session";

const WP_BASE = process.env.WP_BASE_URL || "";
const APP_USER = process.env.WP_APP_USER || "";
const APP_PASS = process.env.WP_APP_PASS || "";

const BASIC_TOKEN =
  APP_USER && APP_PASS
    ? Buffer.from(`${APP_USER}:${APP_PASS}`).toString("base64")
    : "";

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

async function wooFetch<T = any>(
  path: string,
  { revalidate = 60 }: { revalidate?: number } = {}
): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!WP_BASE || !APP_USER || !APP_PASS) {
    throw new Error("WooCommerce credentials are not configured");
  }
  const url = new URL(path, WP_BASE);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${BASIC_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "force-cache",
    next: { revalidate },
  });

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {}
  return { ok: res.ok, status: res.status, data };
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

const findCustomerIdByPhone = cache(async (phoneDigits: string) => {
  if (!phoneDigits) return null;
  const searchQs = new URLSearchParams({ per_page: "20", search: phoneDigits });
  const searchRes = await wooFetch<any[]>(
    `/wp-json/wc/v3/customers?${searchQs.toString()}`,
    { revalidate: 300 }
  );
  if (searchRes.ok && Array.isArray(searchRes.data)) {
    const hit = searchRes.data.find((c) => onlyDigits(c?.billing?.phone) === phoneDigits);
    if (hit?.id) return Number(hit.id);
  }

  const fallbackRes = await wooFetch<any[]>(
    "/wp-json/wc/v3/customers?per_page=50",
    { revalidate: 300 }
  );
  if (fallbackRes.ok && Array.isArray(fallbackRes.data)) {
    const hit = fallbackRes.data.find((c) => onlyDigits(c?.billing?.phone) === phoneDigits);
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

  let res = await wooFetch<any[]>(
    `/wp-json/wc/v3/orders?${qs.toString()}`,
    { revalidate: 30 }
  );

  if (!res.ok && (res.status === 400 || res.status === 404)) {
    const qs2 = new URLSearchParams(qs);
    qs2.delete("status");
    res = await wooFetch<any[]>(
      `/wp-json/wc/v3/orders?${qs2.toString()}`,
      { revalidate: 30 }
    );
  }

  if (!Array.isArray(res.data)) return [];
  return res.data.map((o) => {
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

  const customerId =
    sessionId ?? (phoneDigits ? await findCustomerIdByPhone(phoneDigits) : null);
  if (!customerId) return [];

  return await fetchOrdersForCustomer(customerId);
}
