"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { useProductsSlider } from "../hooks/useProductsSlider";
import type { Product } from "../types";
import { ProductCard } from "./product-card";

export type ProductsSliderProps = {
  items: readonly Product[];
};

/** Renders supplied products in the catalog's responsive, right-to-left carousel. */
export function ProductsSlider({ items }: Readonly<ProductsSliderProps>) {
  const { hasMultipleSlides, slides, swiperBreakpoints } =
    useProductsSlider(items);

  return (
    <section aria-label="اسلایدر محصولات" className="min-[1024px]:px-16" dir="rtl">
      <Swiper
        allowTouchMove={hasMultipleSlides}
        breakpoints={swiperBreakpoints}
        className="w-full [&_.swiper-wrapper]:items-stretch"
        slidesPerView={1.4}
        spaceBetween={12}
        watchOverflow
      >
        {slides.map(({ product, priority }) => (
          <SwiperSlide className="h-auto" key={product.id}>
            <ProductCard priority={priority} product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
