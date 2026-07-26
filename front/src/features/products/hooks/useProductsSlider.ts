import { useMemo } from "react";

import type { Product } from "../types";

export type ProductsSliderItem = {
  product: Product;
};

const productsSliderBreakpoints = {
  0: { slidesPerView: 1.4, slidesOffsetAfter: 16, slidesOffsetBefore: 16 },
  540: { slidesPerView: 2.4, slidesOffsetAfter: 16, slidesOffsetBefore: 16 },
  860: { slidesPerView: 3.4, slidesOffsetAfter: 16, slidesOffsetBefore: 16 },
  1024: {
    allowTouchMove: false,
    slidesPerView: 5,
    slidesOffsetAfter: 0,
    slidesOffsetBefore: 0,
  },
} as const;

/** Prepares product slides and responsive Swiper options from supplied products. */
export function useProductsSlider(items: readonly Product[]) {
  const slides = useMemo<ProductsSliderItem[]>(
    () => items.map((product) => ({ product })),
    [items],
  );

  return {
    hasMultipleSlides: slides.length > 1,
    slides,
    swiperBreakpoints: productsSliderBreakpoints,
  };
}
