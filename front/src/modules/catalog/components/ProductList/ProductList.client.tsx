"use client";

import { useMemo, useRef, useState } from "react";
import ProductCard from "@/modules/catalog/components/ProductCard/ProductCard";
import Button from "@/components/ui/Button/Button";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import { cn } from "@/lib/cn";
import { fetchProductsFromApi } from "@/modules/catalog/services/api";

type Product = {
  id: number | string;
  name: string;
  images?: Array<{ url: string; alt?: string }>;
  price: { amount: number; currency: string };
  regularPrice?: { amount: number; currency: string };
  salePrice?: { amount: number; currency: string };
  stock?: { inStock: boolean };
};

function mergeUniqueById<T extends { id: number | string }>(prev: T[], next: T[]): T[] {
  const map = new Map<number | string, T>();
  for (const p of prev) map.set(p.id, p);
  for (const n of next) if (n) map.set(n.id, n);
  return Array.from(map.values());
}

function stableStockOrder<T extends { stock?: { inStock?: boolean } }>(arr: T[]): T[] {
  const available: T[] = [];
  const outOfStock: T[] = [];
  for (const it of arr) (it.stock?.inStock ? available : outOfStock).push(it);
  return available.concat(outOfStock);
}

export default function ProductListClient({ initialItems, baseParams }: { initialItems: Product[]; baseParams: Record<string, string> }) {
  const initialPage = useMemo(() => Math.max(1, Number(baseParams.page ?? 1) || 1), [baseParams.page]);
  const perPage = useMemo(() => Math.max(1, Number(baseParams.per_page ?? 12) || 12), [baseParams.per_page]);
  const [items, setItems] = useState<Product[]>(stableStockOrder(initialItems || []));
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState((initialItems?.length ?? 0) >= perPage);
  const pageRef = useRef<number>(initialPage);
  const reqIdRef = useRef(0);

  async function handleLoadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const thisReq = ++reqIdRef.current;
    const nextPage = pageRef.current + 1;
    try {
      const params = { ...baseParams, page: String(nextPage), per_page: String(perPage) };
      const data = await fetchProductsFromApi(params);
      let incoming: unknown = Array.isArray(data?.items) ? data.items : data;
      if (!Array.isArray(incoming)) incoming = [];
      const nextItems = incoming as Product[];
      if (reqIdRef.current !== thisReq) return;
      setItems((prev) => stableStockOrder(mergeUniqueById(prev, nextItems)));
      if (nextItems.length < perPage) setHasMore(false);
      else pageRef.current = nextPage;
    } catch (e) {
      console.error("[PLP] load more error:", e);
    } finally {
      if (reqIdRef.current === thisReq) setLoading(false);
    }
  }

  if (!items.length) {
    return (
      <StateMessage
        imageSrc="/images/illustration-empty.png"
        imageAlt="empty"
        title="محصولی پیدا نشد!"
        subtitle="فیلترها را تغییر دهید یا دسته‌بندی دیگری انتخاب کنید."
        actions={
          <Button as="a" href="/products" type="tertiary" style="outline" size="medium" aria-label="حذف همه فیلترها">
            حذف همه فیلترها
          </Button>
        }
      />
    );
  }

  return (
    <>
      <section aria-label="شبکه محصولات" className={cn("grid gap-4 px-4 pb-6 pt-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 lg:gap-5")}>
        {items.map((p, i) => {
          const hero = p.images?.[0];
          const inStock = p.stock?.inStock === true;
          const sale = p.salePrice?.amount;
          const regular = p.regularPrice?.amount;
          const base = p.price?.amount ?? 0;
          const off = inStock && typeof sale === "number" && typeof regular === "number" && Number.isFinite(sale) && Number.isFinite(regular) && regular > sale
            ? Math.round(((regular - sale) / regular) * 100) : null;

          return (
            <ProductCard
              key={p.id}
              href={`/product/${p.id}`}
              title={p.name}
              imageSrc={hero?.url || "/placeholder.svg"}
              price={inStock ? base : null}
              previousPrice={inStock && off ? (regular as number) : null}
              offPercent={inStock ? off : null}
              currencyLabel="تومان"
              isInStock={inStock}
              stockStatus={inStock ? "instock" : "outofstock"}
              isFirst={i === 0}
            />
          );
        })}
      </section>

      {hasMore && (
        <div className="flex justify-center px-0 pb-7 pt-2">
          <Button
            className="w-[188px]"
            onClick={handleLoadMore}
            type="tertiary"
            style="outline"
            size="medium"
            loading={loading}
            aria-label="نمایش محصولات بیشتر"
          >
            نمایش محصولات بیشتر
          </Button>
        </div>
      )}
    </>
  );
}
