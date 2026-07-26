"use client";

import { lazy, Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useProductPagination } from "../hooks/useProductPagination";
import type { ProductQuery } from "../types";

const ProductCard = lazy(
  () =>
    import("./product-card").then((module) => ({
      default: module.ProductCard,
    })),
);

export type ProductListPaginationProps = {
  initialProductIds: readonly number[];
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
  initialProductIds,
  initialPage,
  totalPages,
  query,
  paginationBasePath,
}: Readonly<ProductListPaginationProps>) {
  const { items, isLoading, hasMore, page, error, loadMore } = useProductPagination({
    initialProductIds,
    initialPage,
    totalPages,
    query,
  });

  return (
    <>
      {items.length ? (
        <section
          aria-label="محصولات بیشتر"
          className="grid grid-cols-2 gap-16 px-16 pb-24 pt-0 min-[640px]:grid-cols-4 min-[1024px]:grid-cols-6 min-[1024px]:gap-20"
        >
          <Suspense fallback={null}>
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Suspense>
        </section>
      ) : null}

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
