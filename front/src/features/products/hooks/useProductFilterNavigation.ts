"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type ProductFilterUpdate = Record<string, string | null | undefined>;

/** Keeps catalog filters URL-addressable while hiding router mechanics from controls. */
export function useProductFilterNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  const replaceFilters = useCallback(
    (updates: ProductFilterUpdate) => {
      const next = new URLSearchParams(currentSearch);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      next.set("page", "1");
      router.replace(`/products?${next.toString()}`, { scroll: false });
    },
    [currentSearch, router],
  );

  const clearFilters = useCallback(() => {
    router.replace("/products", { scroll: false });
  }, [router]);

  return { replaceFilters, clearFilters, searchParams };
}
