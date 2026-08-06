"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import type { MagazineArticle } from "../types";
import { MagazineCard } from "./magazine-card";

type MagazineSliderProps = {
  articles: readonly MagazineArticle[];
};

const breakpoints = {
  0: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 1.4 },
  540: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 2.4 },
  860: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 3.4 },
  1024: { allowTouchMove: false, slidesOffsetAfter: 0, slidesOffsetBefore: 0, slidesPerView: 4 },
} as const;

/** Responsive article rail; four latest stories fit together on desktop. */
export function MagazineSlider({ articles }: Readonly<MagazineSliderProps>) {
  if (!articles.length) return null;

  return (
    <div aria-label="آخرین مقاله‌های مجله" className="bg-surface-background pb-16 min-[1024px]:px-16" dir="rtl">
      <Swiper
        allowTouchMove={articles.length > 1}
        breakpoints={breakpoints}
        className="carousel-rail carousel-rail--magazine w-full [&_.swiper-wrapper]:items-stretch"
        slidesPerView={1.4}
        spaceBetween={12}
        watchOverflow
      >
        {articles.map((article) => (
          <SwiperSlide className="h-auto" key={article.id}>
            <MagazineCard article={article} titleSize="18" />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
