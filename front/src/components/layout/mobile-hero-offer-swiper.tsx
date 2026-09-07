"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { DailySpecialOffer } from "@/features/landing/components/daily-special-offer";
import type { Product } from "@/features/products/types";

import HeroSlider, { type HeroSlide } from "./hero-slider";

type MobileHeroOfferSwiperProps = {
  heroSlides: readonly HeroSlide[];
  product: Product;
};

/**
 * Treats the existing editorial hero carousel and daily offer as two cards in
 * one touch rail on small screens. A little of the following card remains in
 * view as a swipe affordance, while desktop keeps both side by side.
 */
function MobileHeroOfferSwiper({ heroSlides, product }: Readonly<MobileHeroOfferSwiperProps>) {
  return (
    <section
      aria-label="بنرها و پیشنهاد ویژه روز"
      aria-roledescription="carousel"
      className="min-[860px]:hidden"
      data-component="mobile-hero-offer-swiper"
      dir="rtl"
      role="region"
    >
      <Swiper
        className="mobile-hero-offer-swiper overflow-visible"
        slidesOffsetAfter={12}
        slidesOffsetBefore={12}
        slidesPerView={1.08}
        spaceBetween={12}
      >
        <SwiperSlide aria-label="بنرها" className="!h-auto" role="group">
          <HeroSlider
            className="w-full px-0"
            initialSlides={heroSlides.length ? heroSlides : undefined}
            nested
          />
        </SwiperSlide>
        <SwiperSlide aria-label="پیشنهاد ویژه روز" className="!h-auto" role="group">
          <DailySpecialOffer className="aspect-[1/1.2]" product={product} />
        </SwiperSlide>
      </Swiper>
    </section>
  );
}

export { MobileHeroOfferSwiper };
export type { MobileHeroOfferSwiperProps };
export default MobileHeroOfferSwiper;
