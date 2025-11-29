"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Virtual } from "swiper/modules";
import "swiper/css";
import s from "./ProductCarousel.module.css";

import ProductCard from "@/domains/catalog/components/ProductCard/ProductCard";
import ProductCardSkeleton from "@/domains/catalog/components/ProductCard/ProductCardSkeleton";

/* ------------------------- Types ------------------------- */
type StoreProduct = {
  id: number;
  name: string;
  images?: { id: number; src: string; alt?: string }[];
  prices?: {
    price?: string;
    sale_price?: string;
    regular_price?: string;
    currency_minor_unit?: number;
  };
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
};

type Product = {
  id: number | string;
  image: string;
  title: string;
  price: number | string | null;
  previousPrice?: number | string | null;
  offPercent?: number | null;
  inStock?: boolean;
  href?: string;
};

type Props = {
  items?: Product[];
  filter?: (p: Product) => boolean;
  endpoint?: string;
  wpParams?: Record<string, string | number | boolean | undefined>;
  productIds?: Array<number | string>;
};

/* ------------------------- Helpers ------------------------- */
function isStoreProductArray(arr: unknown): arr is StoreProduct[] {
  return (
    Array.isArray(arr) &&
    arr.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item
    )
  );
}

function inferInStock(p: Partial<StoreProduct>): boolean {
  const st = String(p?.stock_status || "").toLowerCase();
  if (st === "outofstock") return false;
  if (p?.is_in_stock === false) return false;
  if (p?.is_purchasable === false) return false;
  return true;
}

function mapProducts(arr: StoreProduct[]): Product[] {
  return arr
    .filter(Boolean)
    .map((p) => {
      const sale = Number(p.prices?.sale_price ?? NaN);
      const regular = Number(p.prices?.regular_price ?? NaN);
      const base = Number(
        p.prices?.sale_price ?? p.prices?.price ?? p.prices?.regular_price ?? 0
      );

      const inStock = inferInStock(p);

      let prev: number | null = null;
      let off: number | null = null;
      if (
        inStock &&
        Number.isFinite(sale) &&
        Number.isFinite(regular) &&
        regular > sale
      ) {
        prev = regular;
        off = Math.max(0, Math.round(((regular - sale) / regular) * 100));
      }

      return {
        id: p.id,
        image: p.images?.[0]?.src || "",
        title: p.name || "",
        price: inStock ? base : null,
        previousPrice: inStock ? prev : null,
        offPercent: inStock ? off : null,
        inStock,
        href: `/product/${p.id}`,
      };
    })
    .filter((p) => p.id != null && String(p.title).trim().length > 0);
}

/* ------------------------- Component ------------------------- */
export default function ProductCarouselClient({
  items,
  filter,
  endpoint = "/api/products?per_page=8",
  wpParams,
  productIds,
}: Props) {
  const [fetched, setFetched] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(!(items && items.length));

  const controllerRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  const hasItems = !!(items && items.length);
  const hasIds = !!(productIds && productIds.length);

  useEffect(() => {
    if (hasItems) {
      setFetched(items as Product[]);
      setLoading(false);
    }
  }, [hasItems, items]);

  const listUrl = useMemo(() => {
    if (!wpParams) return endpoint;
    const qs = new URLSearchParams();
    Object.entries(wpParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    });
    const sep = endpoint.includes("?") ? "&" : "?";
    const q = qs.toString();
    return q ? `${endpoint}${sep}${q}` : endpoint;
  }, [endpoint, wpParams]);

  useEffect(() => {
    if (hasItems) {
      setLoading(false);
      return;
    }

    if (controllerRef.current && !controllerRef.current.signal.aborted) {
      controllerRef.current.abort("new-effect");
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    const thisReqId = ++reqIdRef.current;

    setLoading(true);

    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) controller.abort("timeout");
    }, 10000);

    (async () => {
      try {
        let data: unknown;

        if (hasIds) {
          const ids = (productIds as Array<number | string>)
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n) && n > 0);

          if (!ids.length) {
            if (reqIdRef.current === thisReqId) setFetched([]);
            return;
          }

          const url = `/api/products/bulk?ids=${encodeURIComponent(
            ids.join(",")
          )}`;
          const r = await fetch(url, { signal: controller.signal });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          data = await r.json();
        } else {
          const r = await fetch(listUrl, { signal: controller.signal });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          data = await r.json();
        }

        if (controller.signal.aborted || reqIdRef.current !== thisReqId) return;

        let arr: unknown = data;
        if (!Array.isArray(arr) && typeof arr === "object" && arr !== null) {
          if (Array.isArray((arr as any).items)) arr = (arr as any).items;
          else if (Array.isArray((arr as any).products))
            arr = (arr as any).products;
        }

        if (!isStoreProductArray(arr)) {
          console.error("[Carousel] Unexpected list shape:", data);
          if (reqIdRef.current === thisReqId) setFetched([]);
          return;
        }

        if (reqIdRef.current === thisReqId) setFetched(mapProducts(arr));
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[Carousel] Fetch error:", err);
        if (reqIdRef.current === thisReqId) setFetched([]);
      } finally {
        clearTimeout(timeout);
        if (reqIdRef.current === thisReqId) setLoading(false);
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    })();

    return () => {
      if (controllerRef.current === controller && !controller.signal.aborted) {
        controller.abort("cleanup");
      }
    };
  }, [hasItems, hasIds, productIds, listUrl]);

  const products: Product[] = useMemo(() => {
    const src = items ?? fetched;
    return filter ? src.filter(filter) : src;
  }, [items, fetched, filter]);

  const skeletonCount = useMemo(() => {
    if (hasIds) return Math.min(productIds?.length || 8, 12);
    const match = listUrl.match(/per_page=(\d+)/);
    return match ? Number(match[1]) : 8;
  }, [hasIds, productIds, listUrl]);

  const showSkeleton = loading || products.length === 0;
  const swiperKey = showSkeleton ? "loading" : `ready-${products.length}`;

  return (
    <div className={s.carousel}>
      <Swiper
        key={swiperKey}
        modules={[Virtual]}
        virtual
        dir="rtl"
        watchOverflow
        slidesPerView="auto"
        spaceBetween={12}
        className={s.swiper}
        breakpoints={{
          0: {
            slidesPerView: 1.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          320: {
            slidesPerView: 2.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          540: {
            slidesPerView: 3.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          700: {
            slidesPerView: 4.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          860: {
            slidesPerView: 5.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          1024: {
            slidesPerView: 6,
            allowTouchMove: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
          },
        }}
      >
        {showSkeleton
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <SwiperSlide
                key={`skel-${i}`}
                className={s.slide}
                virtualIndex={i}
              >
                <ProductCardSkeleton />
              </SwiperSlide>
            ))
          : products.map((p, i) => (
              <SwiperSlide key={p.id} className={s.slide} virtualIndex={i}>
                <ProductCard
                  href={p.href ?? `/product/${p.id}`}
                  title={p.title}
                  imageSrc={p.image}
                  price={p.price}
                  previousPrice={p.previousPrice ?? null}
                  offPercent={p.offPercent ?? null}
                  currencyLabel="تومان"
                  isInStock={p.inStock}
                />
              </SwiperSlide>
            ))}
      </Swiper>
    </div>
  );
}
