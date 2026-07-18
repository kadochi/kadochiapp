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
  if (!items.length) return null;

  return (
    <section aria-label="دسته‌بندی‌های هدیه" className="py-16">
      <Swiper
        breakpoints={{
          0: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 1.4 },
          540: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 2.4 },
          860: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 4.4 },
          1024: { allowTouchMove: false, slidesOffsetAfter: 0, slidesOffsetBefore: 0, slidesPerView: 6 },
        }}
        className="min-[1024px]:px-16"
        dir="rtl"
        spaceBetween={12}
        watchOverflow
      >
        {items.map((category) => (
          <SwiperSlide className="h-auto" key={category.id}>
            <Link
              aria-label={`مشاهده ${category.name}`}
              className="group relative block h-240 overflow-hidden rounded-xl bg-secondary no-underline"
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
              <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88),rgba(0,0,0,0.08)_68%)]" />
              <span className="absolute inset-x-0 bottom-0 grid gap-4 p-20 text-right">
                <strong className="text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-on-secondary">
                  {category.name}
                </strong>
                <span className="text-label-14 font-regular leading-[var(--text-label-14--line-height)] text-disable">
                  {new Intl.NumberFormat("fa-IR").format(category.productCount)} محصول
                </span>
              </span>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
