/**
 * Checkout helpers
 * -----------------------------------------------------------------------------
 * Pure, framework-free helpers extracted from CheckoutClient: types, pricing
 * constants, formatters, delivery-slot building, and the Store-API fetchers.
 * No React, no behavior change.
 */

import type { StepItem } from "@/components/ui/ProgressStepper/ProgressStepper";
import { DELIVERY_PARTS, type DeliveryPartKey } from "@/domains/checkout/delivery-slot";
import { tryGetPublicWpBaseUrl } from "@/config/wp";

/* -------------------------------- Types -------------------------------- */

export type PackagingId = "normal" | "gift";

export type Slot = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  part: DeliveryPartKey;
  from: string;
  to: string;
  disabled?: boolean;
};

export type StoreProduct = {
  id: number;
  name?: string;
  prices?: {
    price?: string | null;
    sale_price?: string | null;
    regular_price?: string | null;
  };
  // Store API often includes tags/taxonomies; we only care about presence, not shape.
  tags?: Array<{ id?: number; slug?: string; name?: string }>;
};

export type ViewProduct = { id: number; prices?: StoreProduct["prices"] };

/* -------------------------------- Constants -------------------------------- */

//const SHIPPING_IRT = 89_000;
export const SHIPPING_IRT = 150_000;
export const NORMAL_WRAP_IRT = 0;
export const GIFT_WRAP_IRT = 0;
export const TAX_RATE = 0.1;

/* -------------------------------- Formatters / math -------------------------------- */

export const toman = (n: number) => n.toLocaleString("fa-IR");

export function buildStepper(currentIndex: 0 | 1 | 2): StepItem[] {
  return [
    { label: "پرداخت", status: currentIndex === 2 ? "current" : "todo" },
    {
      label: "بسته‌بندی و ارسال",
      status:
        currentIndex > 0 ? (currentIndex === 2 ? "done" : "current") : "todo",
    },
    { label: "تکمیل اطلاعات", status: currentIndex === 0 ? "current" : "done" },
  ];
}

const faDay = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });
const faDate = new Intl.DateTimeFormat("fa-IR", {
  day: "2-digit",
  month: "long",
});

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isFriday = (d: Date) => d.getDay() === 5;

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const priceFromWP = (p?: StoreProduct["prices"]) => {
  const raw = p?.sale_price ?? p?.price ?? p?.regular_price ?? "0";
  const n = Number(raw || 0);
  return Number.isFinite(n) ? n : 0;
};

export const irrToIrt = (irr: number) => Math.round(Math.max(0, irr) / 10);

/**
 * Build 9 delivery slots starting today (if fast) or tomorrow, skipping Fridays.
 * Pure: returns the slot list; selection is handled by the caller.
 */
export function buildSlots(allFast: boolean): Slot[] {
  const now = new Date();
  const startFromToday = allFast === true;
  let dayCursor = startFromToday ? new Date(now) : addDays(now, 1);

  const out: Slot[] = [];
  for (let dayIdx = 0; out.length < 9 && dayIdx < 6; dayIdx++) {
    if (isFriday(dayCursor)) {
      dayCursor = addDays(dayCursor, 1);
      continue;
    }
    for (const p of DELIVERY_PARTS) {
      if (out.length >= 9) break;
      let disabled = false;
      if (sameDay(dayCursor, now)) {
        const h = now.getHours();
        disabled = h >= p.fromHour;
      }
      out.push({
        id: `${dayCursor.toISOString().slice(0, 10)}_${p.key}`,
        dayLabel: faDay.format(dayCursor),
        dateLabel: faDate.format(dayCursor),
        part: p.key,
        from: p.fromLabel,
        to: p.toLabel,
        disabled,
      });
    }
    dayCursor = addDays(dayCursor, 1);
  }

  while (out.length < 9) {
    if (isFriday(dayCursor)) {
      dayCursor = addDays(dayCursor, 1);
      continue;
    }
    for (const p of DELIVERY_PARTS) {
      if (out.length >= 9) break;
      out.push({
        id: `${dayCursor.toISOString().slice(0, 10)}_${p.key}`,
        dayLabel: faDay.format(dayCursor),
        dateLabel: faDate.format(dayCursor),
        part: p.key,
        from: p.fromLabel,
        to: p.toLabel,
        disabled: false,
      });
    }
    dayCursor = addDays(dayCursor, 1);
  }

  return out;
}

/* -------------------------------- Fetch utilities -------------------------------- */

export type FetchWithTimeoutInit = RequestInit & { timeoutMs?: number };

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {},
) {
  const { timeoutMs = 15_000, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let abortCleanup: (() => void) | undefined;

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    abortCleanup = () => signal.removeEventListener("abort", onAbort);
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (abortCleanup) abortCleanup();
  }
}

/**
 * Fetch products via Woo Store API.
 * - Tries proxy route first.
 * - Falls back to direct Store API if needed.
 * - Always returns a plain array; caller handles empty as "no prices".
 */
export async function fetchProductsByIds(
  ids: string[],
  signal?: AbortSignal,
): Promise<StoreProduct[]> {
  if (!ids.length) return [];
  const qs = new URLSearchParams({
    include: ids.join(","),
    per_page: String(Math.min(50, ids.length)),
    orderby: "include",
  }).toString();

  try {
    const r = await fetch(`/api/wp/wp-json/wc/store/v1/products?${qs}`, {
      cache: "no-store",
      signal,
    });
    if (r.ok) {
      const data = (await r.json().catch(() => [])) as unknown;
      if (Array.isArray(data)) return data as StoreProduct[];
    }
  } catch {
    // Proxy path failed – fall back to direct Store API.
  }

  try {
    const base = tryGetPublicWpBaseUrl();
    if (!base) return [];

    const r2 = await fetch(`${base}/wp-json/wc/store/v1/products?${qs}`, {
      cache: "no-store",
      signal,
    });
    if (r2.ok) {
      const data = (await r2.json().catch(() => [])) as unknown;
      if (Array.isArray(data)) return data as StoreProduct[];
    }
  } catch {
    // Both paths failed – caller will see empty list and keep behavior graceful.
  }

  return [];
}
