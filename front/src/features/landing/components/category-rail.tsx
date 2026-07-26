"use client";

/* eslint-disable @next/next/no-img-element -- Category image URLs come from the Store API. */

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import type { ProductCategory } from "@/features/products/types";

type CategoryRailProps = {
  items: readonly ProductCategory[];
};

/** Category cards retain the legacy image-overlay rail and consume Store API categories. */
export function CategoryRail({ items }: Readonly<CategoryRailProps>) {
  const isLoading = items.length === 0;

  return (
    <section aria-label="دسته‌بندی‌های هدیه" className="py-16 [&_.swiper]:mb-24">
      <Swiper
        breakpoints={{
          0: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 1.4 },
          320: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 2.4 },
          540: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 3.4 },
          700: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 4.4 },
          860: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 5.4 },
          1024: { allowTouchMove: false, slidesOffsetAfter: 0, slidesOffsetBefore: 0, slidesPerView: 8 },
        }}
        className="carousel-rail carousel-rail--categories min-[1024px]:px-16"
        dir="rtl"
        spaceBetween={12}
        watchOverflow
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <SwiperSlide className="h-auto" key={`placeholder-${index}`}>
                <div
                  aria-hidden
                  className="h-[256px] rounded-xxl bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite] min-[864px]:h-[240px]"
                />
              </SwiperSlide>
            ))
          : items.map((category) => (
              <SwiperSlide className="h-auto" key={category.id}>
                <Link
                  aria-label={`مشاهده ${category.name}`}
                  className="group relative block h-[256px] overflow-hidden rounded-xl bg-[linear-gradient(to_top,var(--color-secondary),var(--color-secondary-gradient))] no-underline min-[864px]:h-[240px]"
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                >
                  {category.imageUrl ? (
                    <img
                      alt=""
                      className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      src={category.imageUrl}
                    />
                  ) : null}
                  <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,1),rgba(0,0,0,0))]" />
                  <span className="absolute inset-x-0 bottom-0 grid gap-6 p-20 text-right">
                    <strong className="text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-on-secondary">
                      {category.name}
                    </strong>
                    {category.description ? (
                      <span className="text-label-14 font-regular leading-[var(--text-label-14--line-height)] text-disable">
                        {category.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </SwiperSlide>
            ))}
      </Swiper>
    </section>
  );
}
