"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
export function ProductGallery({
  images,
  title,
}: Readonly<ProductGalleryProps>) {
  const { slides, activeThumbs, setThumbsSwiper, showThumbs } =
    useProductGallery(images, title);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerSlide = slides[viewerIndex];
  const hasMultipleSlides = slides.length > 1;

  function openViewer(index: number) {
    setViewerIndex(index);
    setIsViewerOpen(true);
  }

  function showPrevious() {
    setViewerIndex((index) => (index - 1 + slides.length) % slides.length);
  }

  function showNext() {
    setViewerIndex((index) => (index + 1) % slides.length);
  }

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
              <button
                aria-label={`نمایش بزرگ ${slide.alt}`}
                className="block w-full cursor-zoom-in border-0 bg-transparent px-8 py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:px-0"
                onClick={() => openViewer(index)}
                type="button"
              >
                <img
                  alt={slide.alt}
                  className="mx-auto block aspect-[1/1.2] w-full max-w-[400px] rounded-xl object-cover"
                  decoding={slide.priority ? "sync" : "async"}
                  fetchPriority={slide.priority ? "high" : "auto"}
                  loading={slide.priority ? "eager" : "lazy"}
                  src={slide.src}
                />
              </button>
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

      <Dialog.Root open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[200] bg-surface-scrim" />
          <Dialog.Content className="fixed inset-0 z-[201] flex flex-col bg-surface-neutral-high-emphasis p-16 outline-none">
            <Dialog.Title className="sr-only">نمایش تصاویر {title}</Dialog.Title>
            <Dialog.Description className="sr-only">
              برای جابه‌جایی میان تصاویر از دکمه‌های قبلی و بعدی استفاده کنید.
            </Dialog.Description>

            <div className="flex items-center justify-between gap-12 text-on-primary">
              <span className="text-label-14 font-regular">
                {viewerIndex + 1} از {slides.length}
              </span>
              <Dialog.Close asChild>
                <button
                  aria-label="بستن نمایش تصاویر"
                  className="inline-flex size-40 cursor-pointer items-center justify-center rounded-rounded border-0 bg-white/10 p-0 text-on-primary transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary"
                  type="button"
                >
                  <X aria-hidden className="size-24" />
                </button>
              </Dialog.Close>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center py-16">
              {viewerSlide?.src ? (
                <img
                  alt={viewerSlide.alt}
                  className="max-h-full max-w-full rounded-m object-contain"
                  src={viewerSlide.src}
                />
              ) : null}

              {hasMultipleSlides ? (
                <>
                  <button
                    aria-label="تصویر قبلی"
                    className="absolute start-0 inline-flex size-40 cursor-pointer items-center justify-center rounded-rounded border-0 bg-white/10 p-0 text-on-primary transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary"
                    onClick={showPrevious}
                    type="button"
                  >
                    <ChevronRight aria-hidden className="size-24" />
                  </button>
                  <button
                    aria-label="تصویر بعدی"
                    className="absolute end-0 inline-flex size-40 cursor-pointer items-center justify-center rounded-rounded border-0 bg-white/10 p-0 text-on-primary transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary"
                    onClick={showNext}
                    type="button"
                  >
                    <ChevronLeft aria-hidden className="size-24" />
                  </button>
                </>
              ) : null}
            </div>

            {hasMultipleSlides ? (
              <div className="flex shrink-0 justify-center gap-8 overflow-x-auto py-4">
                {slides.map((slide, index) => (
                  <button
                    aria-current={viewerIndex === index ? "true" : undefined}
                    aria-label={`نمایش تصویر ${index + 1}`}
                    className="shrink-0 cursor-pointer rounded-m border-2 border-transparent bg-transparent p-0 aria-[current=true]:border-on-primary"
                    key={`viewer-thumbnail-${slide.src}-${index}`}
                    onClick={() => setViewerIndex(index)}
                    type="button"
                  >
                    {slide.src ? (
                      <img alt="" aria-hidden className="size-64 rounded-[calc(var(--radius-m)-2px)] object-cover" src={slide.src} />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
