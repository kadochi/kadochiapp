"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

type ArrowPosition = { left: number; top: number };

/**
 * Treats the existing editorial hero carousel and daily offer as two cards in
 * one touch rail on small screens. A little of the following card remains in
 * view as a swipe affordance, while desktop keeps both side by side.
 */
function MobileHeroOfferSwiper({ heroSlides, product }: Readonly<MobileHeroOfferSwiperProps>) {
  const railRef = useRef<HTMLElement>(null);
  const [outerSwiper, setOuterSwiper] = useState<SwiperInstance | null>(null);
  const [arrowPosition, setArrowPosition] = useState<ArrowPosition | null>(null);
  const [arrowDirection, setArrowDirection] = useState<"next" | "previous">("next");
  const [isArrowVisible, setIsArrowVisible] = useState(false);

  const updateNavigation = useCallback((swiper: SwiperInstance, revealArrow = false) => {
    window.requestAnimationFrame(() => {
      const rail = railRef.current;
      const activeSlide = swiper.slides[swiper.activeIndex];
      const isAtFirstSlide = swiper.isBeginning;
      const card = isAtFirstSlide
        ? activeSlide?.querySelector<HTMLElement>(".hero-slider") ?? activeSlide?.querySelector<HTMLElement>("[data-component='hero-slider']")
        : activeSlide?.querySelector<HTMLElement>("[data-component='daily-special-offer']");

      if (!rail || !card) return;

      const railBounds = rail.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();

      setArrowDirection(isAtFirstSlide ? "next" : "previous");
      setArrowPosition({
        left: (isAtFirstSlide ? cardBounds.left : cardBounds.right) - railBounds.left,
        top: cardBounds.top - railBounds.top + (cardBounds.height / 2),
      });

      if (revealArrow) {
        // Render the new position while invisible first, so the incoming
        // control never visibly jumps across the moving slides.
        window.requestAnimationFrame(() => setIsArrowVisible(true));
      }
    });
  }, []);

  useEffect(() => {
    if (!outerSwiper) return;

    const handleResize = () => updateNavigation(outerSwiper);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [outerSwiper, updateNavigation]);

  return (
    <section
      aria-label="بنرها و پیشنهاد ویژه روز"
      aria-roledescription="carousel"
      className="relative min-[860px]:hidden"
      data-component="mobile-hero-offer-swiper"
      dir="rtl"
      ref={railRef}
      role="region"
    >
      <Swiper
        className="mobile-hero-offer-swiper overflow-visible"
        onSlideChange={() => setIsArrowVisible(false)}
        onSlideChangeTransitionEnd={(swiper) => updateNavigation(swiper, true)}
        onSwiper={(swiper) => {
          setOuterSwiper(swiper);
          updateNavigation(swiper, true);
        }}
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
      {arrowPosition ? (
        <button
          aria-label={arrowDirection === "next" ? "نمایش پیشنهاد ویژه روز" : "بازگشت به بنرها"}
          className={`absolute z-30 grid size-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border-low-emphasis bg-surface-background/95 text-text-primary transition-[opacity,transform] duration-150 ease-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 ${isArrowVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => {
            setIsArrowVisible(false);
            if (arrowDirection === "next") outerSwiper?.slideNext();
            else outerSwiper?.slidePrev();
          }}
          style={{ left: arrowPosition.left, top: arrowPosition.top }}
          type="button"
        >
          {arrowDirection === "next" ? <ChevronLeft aria-hidden className="size-24" /> : <ChevronRight aria-hidden className="size-24" />}
        </button>
      ) : null}
    </section>
  );
}

export { MobileHeroOfferSwiper };
export type { MobileHeroOfferSwiperProps };
export default MobileHeroOfferSwiper;
