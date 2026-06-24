
import "server-only";
import { cache } from "react";
import { wooFetch, wooFetchJSON } from "@/lib/api/woo";
import { wordpressFetch } from "@/services/wordpress";
import type { StoreCategory } from "../types";

export type WpCategoryMeta = {
  id: number;
  name: string;
  description: string | null;
};

function buildQS(params?: { per_page?: number | string; hide_empty?: boolean | string }) {
  const q = new URLSearchParams();
  if (params?.per_page != null) q.set("per_page", String(params.per_page));
  if (params?.hide_empty != null) q.set("hide_empty", String(params.hide_empty));
  return q.toString();
}

export async function fetchStoreCategories(params?: {
  per_page?: number | string;
  hide_empty?: boolean | string;
}): Promise<StoreCategory[]> {
  const qs = buildQS({ per_page: params?.per_page ?? 100, hide_empty: params?.hide_empty ?? true });

  if (typeof window === "undefined") {
    return await wooFetchJSON<StoreCategory[]>(`/wp-json/wc/store/v1/products/categories?${qs}`, { method: "GET" });
  }

  const res = await fetch(`/api/store/categories?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchStoreCategories failed: ${res.status}`);
  return (await res.json()) as StoreCategory[];
}

export const fetchWpCategoryMeta = cache(async (input: string): Promise<WpCategoryMeta | null> => {
  const isId = /^\d+$/.test(input);
  const path = isId
    ? `/wp-json/wp/v2/product_cat/${input}`
    : `/wp-json/wp/v2/product_cat?slug=${encodeURIComponent(input)}&per_page=1`;
  try {
    const r = await wordpressFetch(path, { revalidate: 300 });
    if (!r.ok) return null;
    const js = isId ? await r.json() : (await r.json())?.[0];
    return js
      ? {
          id: js.id,
          name: js.name,
          description: js.description ?? null,
        } as WpCategoryMeta
      : null;
  } catch {
    return null;
  }
});

export async function getAllCategoriesForFilter(): Promise<Array<{ label: string; value: string }>> {
  const r = await wordpressFetch(
    "/wp-json/wp/v2/product_cat?per_page=100&_fields=id,name,slug",
    { revalidate: 600 },
  );
  if (!r.ok) return [];
  const arr = (await r.json()) as Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  return arr.map((c) => ({ label: c.name, value: String(c.id) }));
}
