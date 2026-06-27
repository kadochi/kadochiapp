/**
 * Orders helpers — types, status mapping, grouping, and normalization.
 * Extracted from OrdersPageClient.tsx (no behavior change).
 */

import type { TabItem } from "@/components/ui/Tabs/Tabs";

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

export type Status =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft";

export type LineItem = {
  id: number | string;
  product_id?: number | string | null;
  name?: string;
  quantity?: number;
  image?: { src: string; alt?: string } | null;
};

export type Order = {
  id: number | string;
  status: Status;
  created_at: string;
  total: number;
  line_items: LineItem[];
};

export type GroupKey = "current" | "completed" | "canceled";

export const PER_PAGE = 20;

export const TABS: TabItem[] = [
  { id: "current", label: "جاری" },
  { id: "completed", label: "تحویل‌شده" },
  { id: "canceled", label: "لغو شده" },
];

export function mapStatus(raw?: RawWooStatus): Status {
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

export function inGroup(status: Status, g: GroupKey) {
  if (g === "current")
    return (
      status === "pending" || status === "processing" || status === "on-hold"
    );
  if (g === "completed") return status === "completed";
  if (g === "canceled")
    return (
      status === "canceled" ||
      status === "refunded" ||
      status === "failed" ||
      status === "draft"
    );
  return true;
}

export function normalizeOrders(payload: any): Order[] {
  const list =
    (Array.isArray(payload) && payload) ||
    payload?.items ||
    payload?.orders ||
    payload?.data ||
    [];
  return (list as any[]).map((o) => {
    const rawItems: any[] = o?.line_items ?? o?.items ?? [];
    const line_items: LineItem[] = rawItems.map((li) => {
      const candidate =
        li?.image?.src ||
        li?.image?.url ||
        li?.image ||
        li?.image_url ||
        li?.thumbnail ||
        "";
      return {
        id:
          li?.id ??
          li?.item_id ??
          li?.product_id ??
          `${li?.name || "li"}:${li?.product_id || ""}`,
        product_id: li?.product_id ?? null,
        name: li?.name,
        quantity: li?.quantity,
        image: candidate ? { src: String(candidate), alt: li?.name } : null,
      };
    });
    return {
      id: o?.id ?? o?.order_id ?? "",
      status: mapStatus(o?.status),
      created_at: o?.created_at ?? o?.date_created ?? new Date().toISOString(),
      total: Number(o?.total ?? o?.total_price ?? 0),
      line_items,
    };
  });
}

export function toman(n: number) {
  return Math.round((Number(n) || 0) / 10);
}

export function badgeFor(s: Status): {
  type: "primary" | "secondary" | "warning" | "danger" | "deactive";
  style: "solid" | "tonal" | "gradient";
  text: string;
} {
  switch (s) {
    case "pending":
      return { type: "danger", style: "tonal", text: "در انتظار پرداخت" };
    case "processing":
      return { type: "primary", style: "tonal", text: "در حال آماده‌سازی" };
    case "on-hold":
      return { type: "warning", style: "tonal", text: "در انتظار بررسی" };
    case "completed":
      return { type: "secondary", style: "tonal", text: "تحویل‌شده" };
    case "canceled":
    case "refunded":
    case "failed":
    case "draft":
      return { type: "deactive", style: "tonal", text: "لغو شده" };
    default:
      return { type: "deactive", style: "tonal", text: "نامشخص" };
  }
}
