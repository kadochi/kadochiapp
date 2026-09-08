"use client";

import { useState } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { DailySpecialOffer } from "@/features/landing/components/daily-special-offer";
import type { Product } from "@/features/products/types";

import HeroSlider, { type HeroSlide } from "./hero-slider";

type MobileHeroOfferSwiperProps = {
  heroSlides: readonly HeroSlide[];
  product: Product;
};

/** Mobile rail containing the existing hero carousel and the daily offer. */
function MobileHeroOfferSwiper({ heroSlides, product }: Readonly<MobileHeroOfferSwiperProps>) {
  const [outerSwiper, setOuterSwiper] = useState<SwiperInstance | null>(null);
  const [activeTab, setActiveTab] = useState<"hero" | "offer">("hero");

  const selectTab = (tab: "hero" | "offer") => {
    setActiveTab(tab);
    outerSwiper?.slideTo(tab === "hero" ? 0 : 1);
  };

  return (
    <section
      aria-label="بنرها و پیشنهاد ویژه روز"
      aria-roledescription="carousel"
      className="min-[860px]:hidden"
      data-component="mobile-hero-offer-swiper"
      dir="rtl"
      role="region"
    >
      <div aria-label="بخش‌های پیشنهادهای کادوچی" className="mx-auto mb-12 flex w-[calc(100%_-_24px)] border-b border-border-low-emphasis" role="tablist">
        <button
          aria-controls="mobile-hero-offer-panel"
          aria-selected={activeTab === "hero"}
          className={`relative flex-1 px-12 py-12 text-label-14 font-regular transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeTab === "hero" ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-2 after:bg-primary" : "text-surface-neutral-mid-emphasis"}`}
          onClick={() => selectTab("hero")}
          role="tab"
          type="button"
        >
          ویترین
        </button>
        <button
          aria-controls="mobile-hero-offer-panel"
          aria-selected={activeTab === "offer"}
          className={`relative flex-1 px-12 py-12 text-label-14 font-regular transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeTab === "offer" ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-2 after:bg-primary" : "text-surface-neutral-mid-emphasis"}`}
          onClick={() => selectTab("offer")}
          role="tab"
          type="button"
        >
          پیشنهاد ویژه روز
        </button>
      </div>
      <Swiper
        className="mobile-hero-offer-swiper overflow-visible"
        id="mobile-hero-offer-panel"
        onSlideChange={(swiper) => setActiveTab(swiper.activeIndex === 0 ? "hero" : "offer")}
        onSwiper={setOuterSwiper}
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
