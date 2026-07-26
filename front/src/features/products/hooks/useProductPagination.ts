"use client";

import { useCallback, useState } from "react";

import { fetchProductsPage } from "../services/products";
import type { Product, ProductQuery } from "../types";

type UseProductPaginationInput = {
  initialItems: readonly Product[];
  initialPage: number;
  totalPages: number;
  query: ProductQuery;
};

function mergeProducts(current: readonly Product[], incoming: readonly Product[]) {
  const products = new Map(current.map((product) => [product.id, product]));
  incoming.forEach((product) => products.set(product.id, product));
  return [...products.values()];
}

/** Owns only the PLP's progressive loading state; filters remain URL-driven. */
export function useProductPagination({
  initialItems,
  initialPage,
  totalPages,
  query,
}: UseProductPaginationInput) {
  const [items, setItems] = useState<Product[]>([...initialItems]);
  const [page, setPage] = useState(initialPage);
  const [pageCount, setPageCount] = useState(totalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || page >= pageCount) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchProductsPage({ ...query, page: page + 1 });
      setItems((current) => mergeProducts(current, result.items));
      setPage(result.page);
      setPageCount(result.totalPages);
    } catch {
      setError("دریافت محصولات بیشتر ممکن نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, page, pageCount, query]);

  return {
    items,
    isLoading,
    hasMore: page < pageCount,
    page,
    error,
    loadMore,
  };
}
