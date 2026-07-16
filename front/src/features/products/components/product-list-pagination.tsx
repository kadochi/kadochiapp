"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProductList } from "./product-list";
import { useProductPagination } from "../hooks/useProductPagination";
import type { Product, ProductQuery } from "../types";

export type ProductListPaginationProps = {
  initialItems: readonly Product[];
  initialPage: number;
  totalPages: number;
  query: ProductQuery;
};

/** Client boundary for optional incremental loading beneath the SSR product grid. */
export function ProductListPagination({
  initialItems,
  initialPage,
  totalPages,
  query,
}: Readonly<ProductListPaginationProps>) {
  const { items, isLoading, hasMore, error, loadMore } = useProductPagination({
    initialItems,
    initialPage,
    totalPages,
    query,
  });

  return (
    <>
      <ProductList items={items} />

      {error ? <Alert className="mx-16 mb-16" tone="error">{error}</Alert> : null}

      {hasMore ? (
        <div className="flex justify-center px-16 pb-32 pt-8">
          <Button
            variant="tertiary-outline"
            size="medium"
            loading={isLoading}
            onClick={loadMore}
          >
            نمایش محصولات بیشتر
          </Button>
        </div>
      ) : null}
    </>
  );
}
