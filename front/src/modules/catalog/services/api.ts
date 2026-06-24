import type { StoreCategory } from "../types";

export async function fetchStoreCategories(params?: {
  per_page?: number | string;
  hide_empty?: boolean | string;
}): Promise<StoreCategory[]> {
  const qs = new URLSearchParams();
  if (params?.per_page != null) qs.set("per_page", String(params.per_page));
  if (params?.hide_empty != null) qs.set("hide_empty", String(params.hide_empty));
  const res = await fetch(`/api/store/categories?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchStoreCategories failed: ${res.status}`);
  return res.json() as Promise<StoreCategory[]>;
}

export async function fetchProductsFromApi(params: Record<string, string>): Promise<{items: any[], totalPages: number}> {
  const usp = new URLSearchParams(params);
  const res = await fetch(`/api/products?${usp.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json() as { items: any[], totalPages: number };
}
