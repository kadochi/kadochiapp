import { useQuery } from "@tanstack/react-query";
import type { ProductCard, ProductDetail } from "../types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return res.json();
}

export function useProducts(params: Record<string, string | number | boolean | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const queryString = qs.toString();
  const url = `/api/products${queryString ? `?${queryString}` : ""}`;

  return useQuery<ProductCard[]>({
    queryKey: ["products", params],
    queryFn: () => fetchJson<ProductCard[]>(url),
    staleTime: 2 * 60 * 1000,
  });
}

export function useProductDetail(id: string | number) {
  return useQuery<ProductDetail | null>({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
