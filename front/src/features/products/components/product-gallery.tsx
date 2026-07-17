"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Thumbs } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/thumbs";

import { useProductGallery } from "../hooks/useProductGallery";
import type { ProductImage } from "../types";

export type ProductGalleryProps = {
  images: readonly ProductImage[];
  title: string;
};

/** Main image slider with a deferred, synced thumbnail strip. */
export function ProductGallery({ images, title }: Readonly<ProductGalleryProps>) {
  const { slides, activeThumbs, setThumbsSwiper, showThumbs } = useProductGallery(images, title);

  return (
    <div className="w-full overflow-hidden bg-surface-background" dir="rtl">
      <Swiper
        className="mb-12 w-full min-[864px]:mx-auto min-[864px]:max-w-[400px] [&_.swiper-wrapper]:flex [&_.swiper-slide]:flex [&_.swiper-slide]:w-full [&_.swiper-slide]:justify-center"
        dir="rtl"
        modules={[FreeMode, Thumbs]}
        slidesPerView={1}
        spaceBetween={0}
        thumbs={{ swiper: activeThumbs }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={(slide.src ?? "placeholder") + index}>
            {slide.src ? (
              <img
                alt={slide.alt}
                className="block aspect-square h-auto max-h-[400px] w-full max-w-[400px] object-cover"
                decoding={slide.priority ? "sync" : "async"}
                fetchPriority={slide.priority ? "high" : "auto"}
                loading={slide.priority ? "eager" : "lazy"}
                src={slide.src}
              />
            ) : null}
          </SwiperSlide>
        ))}
      </Swiper>

      {showThumbs ? (
        <Swiper
          className="my-12 flex w-full justify-center min-[864px]:mx-auto min-[864px]:max-w-[400px] [&_.swiper-wrapper]:items-center [&_.swiper-wrapper]:justify-center [&_.swiper-slide]:!w-64 [&_.swiper-slide]:flex [&_.swiper-slide]:justify-center [&_.swiper-slide-thumb-active_img]:border-2 [&_.swiper-slide-thumb-active_img]:border-secondary"
          dir="rtl"
          freeMode
          modules={[FreeMode, Thumbs]}
          onSwiper={setThumbsSwiper}
          slidesPerView="auto"
          spaceBetween={12}
          watchSlidesProgress
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={`thumb-${slide.src}-${index}`}>
              <img
                alt=""
                aria-hidden
                className="size-64 cursor-pointer rounded-m border border-border-high-emphasis object-cover transition-[border-color] duration-200 ease-in-out"
                decoding="async"
                loading="lazy"
                src={slide.src}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : null}
    </div>
  );
}
