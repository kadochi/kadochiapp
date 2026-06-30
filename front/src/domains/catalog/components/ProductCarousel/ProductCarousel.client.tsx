"use client";

import { useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Virtual } from "swiper/modules";
import "swiper/css";
import s from "./ProductCarousel.module.css";
import ProductCard from "@/domains/catalog/components/ProductCard/ProductCard";
import ProductCardSkeleton from "@/domains/catalog/components/ProductCard/ProductCardSkeleton";
import { inferInStock } from "@/domains/catalog/utils/stock";
import { useStoreProducts } from "@/domains/catalog/hooks/useStoreProducts";
import type { WooStoreProduct } from "@/schemas/woo";

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

function mapProduct(p: WooStoreProduct): Product {
  const prices = p.prices as
    | { sale_price?: string; price?: string; regular_price?: string }
    | undefined;
  const sale = Number(prices?.sale_price ?? NaN);
  const regular = Number(prices?.regular_price ?? NaN);
  const base = Number(
    prices?.sale_price ?? prices?.price ?? prices?.regular_price ?? 0,
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
    image: p.images?.[0]?.src ?? "",
    title: p.name ?? "",
    price: inStock ? base : null,
    previousPrice: inStock ? prev : null,
    offPercent: inStock ? off : null,
    inStock,
    href: `/product/${p.id}`,
  };
}

export default function ProductCarouselClient({
  items,
  filter,
  endpoint = "/api/products?per_page=8",
  wpParams,
  productIds,
}: Props) {
  const hasItems = !!(items?.length);

  const { data: fetchedRaw, isLoading } = useStoreProducts({
    endpoint,
    wpParams,
    productIds,
    enabled: !hasItems,
  });

  const products = useMemo(() => {
    const base: Product[] = hasItems
      ? (items as Product[])
      : (fetchedRaw ?? [])
          .map(mapProduct)
          .filter((p) => String(p.title).trim().length > 0);
    return filter ? base.filter(filter) : base;
  }, [hasItems, items, fetchedRaw, filter]);

  const skeletonCount = useMemo(() => {
    if (productIds?.length) return Math.min(productIds.length, 12);
    if (wpParams?.per_page) return Number(wpParams.per_page);
    const m = endpoint.match(/per_page=(\d+)/);
    return m?.[1] ? Number(m[1]) : 8;
  }, [productIds, wpParams, endpoint]);

  const showSkeleton = !hasItems && (isLoading || products.length === 0);
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
            slidesPerView: 1.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          540: {
            slidesPerView: 2.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          700: {
            slidesPerView: 2.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          860: {
            slidesPerView: 3.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          1024: {
            slidesPerView: 5,
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
