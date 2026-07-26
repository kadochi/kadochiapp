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
  /** Non-JavaScript pagination fallback and a crawlable next-page URL. */
  paginationBasePath: string;
};

function pageHref(basePath: string, page: number) {
  const [pathname, query = ""] = basePath.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("page", String(page));
  return `${pathname}?${params.toString()}`;
}

/** Client boundary for optional incremental loading beneath the SSR product grid. */
export function ProductListPagination({
  initialItems,
  initialPage,
  totalPages,
  query,
  paginationBasePath,
}: Readonly<ProductListPaginationProps>) {
  const { items, isLoading, hasMore, page, error, loadMore } = useProductPagination({
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
            asChild
            variant="tertiary-outline"
            size="medium"
            loading={isLoading}
          >
            <a
              href={pageHref(paginationBasePath, page + 1)}
              onClick={(event) => {
                event.preventDefault();
                void loadMore();
              }}
            >
              نمایش محصولات بیشتر
            </a>
          </Button>
        </div>
      ) : null}
    </>
  );
}
