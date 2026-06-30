"use client";

import { useQuery } from "@tanstack/react-query";
import { getJSON } from "@/lib/api/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { WooStoreProduct } from "@/schemas/woo";

function buildListUrl(
  endpoint: string,
  wpParams?: Record<string, string | number | boolean | undefined>,
): string {
  if (!wpParams) return endpoint;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(wpParams)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const q = qs.toString();
  if (!q) return endpoint;
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${q}`;
}

export function useStoreProducts({
  endpoint = "/api/products?per_page=8",
  wpParams,
  productIds,
  enabled = true,
}: {
  endpoint?: string;
  wpParams?: Record<string, string | number | boolean | undefined>;
  productIds?: Array<number | string>;
  enabled?: boolean;
}) {
  const hasIds = !!(productIds?.length);
  const ids = hasIds
    ? (productIds as Array<number | string>)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];

  const listUrl = buildListUrl(endpoint, hasIds ? undefined : wpParams);

  return useQuery<WooStoreProduct[]>({
    queryKey: hasIds
      ? queryKeys.products.byIds(ids)
      : queryKeys.products.list(wpParams ?? { _endpoint: endpoint }),
    queryFn: () => {
      const url = hasIds
        ? `/api/products/bulk?ids=${encodeURIComponent(ids.join(","))}`
        : listUrl;
      return getJSON<WooStoreProduct[]>(url);
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}
