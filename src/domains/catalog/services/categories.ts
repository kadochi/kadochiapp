// src/domains/catalog/services/categories.ts
import "server-only";
import { wooFetchJSON } from "@/lib/api/woo";

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  image?: { src?: string | null } | null;
};

function buildQS(params?: {
  per_page?: number | string;
  hide_empty?: boolean | string;
}) {
  const q = new URLSearchParams();
  if (params?.per_page != null) q.set("per_page", String(params.per_page));
  if (params?.hide_empty != null)
    q.set("hide_empty", String(params.hide_empty));
  return q.toString();
}

/** Single source of truth to fetch store categories (server/client safe). */
export async function fetchStoreCategories(params?: {
  per_page?: number | string;
  hide_empty?: boolean | string;
}): Promise<StoreCategory[]> {
  const qs = buildQS({
    per_page: params?.per_page ?? 100,
    hide_empty: params?.hide_empty ?? true,
  });

  // Server-side: call Woo directly (no CORS)
  if (typeof window === "undefined") {
    return await wooFetchJSON<StoreCategory[]>(
      `/wp-json/wc/store/v1/products/categories?${qs}`,
      { method: "GET" }
    );
  }

  // Client-side: go through Next API proxy (same-origin; no CORS)
  const res = await fetch(`/api/store/categories?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchStoreCategories failed: ${res.status}`);
  return (await res.json()) as StoreCategory[];
}
