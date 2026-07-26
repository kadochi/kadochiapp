"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { useProductsSlider } from "../hooks/useProductsSlider";
import type { Product } from "../types";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";

export type ProductsSliderProps = {
  items: readonly Product[];
};

/** Renders supplied products in the catalog's responsive, right-to-left carousel. */
export function ProductsSlider({ items }: Readonly<ProductsSliderProps>) {
  const { hasMultipleSlides, slides, swiperBreakpoints } =
    useProductsSlider(items);
  const isLoading = slides.length === 0;
  const placeholderCount = 8;

  return (
    <section
      aria-label="اسلایدر محصولات"
      className="bg-surface-background pb-16 min-[1024px]:px-16"
      dir="rtl"
    >
      <Swiper
        allowTouchMove={isLoading || hasMultipleSlides}
        breakpoints={swiperBreakpoints}
        className="carousel-rail carousel-rail--products w-full [&_.swiper-wrapper]:items-stretch"
        slidesPerView={1.4}
        spaceBetween={12}
        watchOverflow
      >
        {isLoading
          ? Array.from({ length: placeholderCount }).map((_, index) => (
              <SwiperSlide className="h-auto" key={`placeholder-${index}`}>
                <ProductCardSkeleton />
              </SwiperSlide>
            ))
          : slides.map(({ product, priority }) => (
              <SwiperSlide className="h-auto" key={product.id}>
                <ProductCard priority={priority} product={product} />
              </SwiperSlide>
            ))}
      </Swiper>
    </section>
  );
}
