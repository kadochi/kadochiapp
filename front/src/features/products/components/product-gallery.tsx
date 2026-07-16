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
  const { slides, activeThumbs, setThumbsSwiper, showThumbs, hasMultiple } = useProductGallery(images, title);

  return (
    <div className="w-full" dir="rtl">
      <Swiper
        className="w-full [&_.swiper-slide]:grid [&_.swiper-slide]:aspect-square [&_.swiper-slide]:place-items-center [&_.swiper-slide]:bg-surface"
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
                className="size-full object-cover"
                decoding={slide.priority ? "sync" : "async"}
                fetchPriority={slide.priority ? "high" : "auto"}
                loading={slide.priority ? "eager" : "lazy"}
                src={slide.src}
              />
            ) : null}
          </SwiperSlide>
        ))}
      </Swiper>

      {showThumbs && hasMultiple ? (
        <Swiper
          className="mt-12 w-full px-16 [&_.swiper-slide]:size-56 [&_.swiper-slide]:w-auto"
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
                className="size-56 rounded-l object-cover"
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
