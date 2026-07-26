"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { Bookmark, ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Thumbs } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/thumbs";

import { useProductGallery } from "../hooks/useProductGallery";
import { getProductActions, updateProductAction } from "../services/products";
import type { ProductImage } from "../types";
import { useToast } from "@/components/ui/toaster";
import { useOptionalAuth } from "@/features/auth/auth-provider";

export type ProductGalleryProps = {
  images: readonly ProductImage[];
  productId: number;
  title: string;
};

/** Main image slider with product actions and a deferred, synced thumbnail strip. */
export function ProductGallery({
  images,
  productId,
  title,
}: Readonly<ProductGalleryProps>) {
  const { slides, activeThumbs, setThumbsSwiper, showThumbs } =
    useProductGallery(images, title);
  const { toast } = useToast();
  const auth = useOptionalAuth();
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUpdatingAction, setIsUpdatingAction] = useState(false);
  const viewerSlide = slides[viewerIndex];
  const hasMultipleSlides = slides.length > 1;

  useEffect(() => {
    if (auth?.status !== "authenticated") return;

    let active = true;
    void getProductActions(productId)
      .then((actions) => {
        if (!active) return;
        setIsLiked(actions.liked);
        setIsSaved(actions.saved);
      })
      // Visitors can still browse products; actions become available after sign-in.
      .catch(() => undefined);
    return () => { active = false; };
  }, [auth?.status, productId]);

  async function toggleProductAction(action: "like" | "save") {
    if (isUpdatingAction) return;
    const isLike = action === "like";
    const next = !(isLike ? isLiked : isSaved);
    setIsUpdatingAction(true);
    try {
      const actions = await updateProductAction(productId, action, next);
      setIsLiked(actions.liked);
      setIsSaved(actions.saved);
      toast({
        tone: "success",
        title: next
          ? isLike ? "محصول پسندیده شد" : "محصول ذخیره شد"
          : isLike ? "پسندیدن محصول لغو شد" : "محصول از ذخیره‌ها حذف شد",
      });
    } catch {
      toast({ tone: "error", title: "برای ذخیره این انتخاب، ابتدا وارد حساب کاربری شوید" });
    } finally {
      setIsUpdatingAction(false);
    }
  }

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
      <div className="relative mx-auto w-[calc(100%-1.5rem)] max-w-[400px]">
        <Swiper
          className="w-full [&_.swiper-wrapper]:flex [&_.swiper-slide]:flex [&_.swiper-slide]:w-full [&_.swiper-slide]:justify-center"
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
                  className="block w-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => openViewer(index)}
                  type="button"
                >
                  <Image
                    alt={slide.alt}
                    className="block aspect-[1/1.2] w-full rounded-xl object-cover"
                    fetchPriority={slide.priority ? "high" : "auto"}
                    height={960}
                    loading={slide.priority ? undefined : "lazy"}
                    preload={slide.priority}
                    sizes="(min-width: 768px) 400px, calc(100vw - 24px)"
                    src={slide.src}
                    width={800}
                  />
                </button>
              ) : null}
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="absolute left-12 top-12 z-10 flex gap-8" dir="ltr">
          <button
            aria-label={isLiked ? "لغو پسندیدن محصول" : "پسندیدن محصول"}
            aria-pressed={isLiked}
            disabled={isUpdatingAction}
            className="inline-flex size-40 cursor-pointer items-center justify-center rounded-rounded border border-white/70 bg-white/85 p-0 text-black shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:bg-white aria-pressed:text-red-600"
            onClick={() => toggleProductAction("like")}
            type="button"
          >
            <Heart
              aria-hidden
              className="size-20"
              fill={isLiked ? "currentColor" : "none"}
            />
          </button>
          <button
            aria-label={isSaved ? "حذف محصول از ذخیره‌ها" : "ذخیره محصول"}
            aria-pressed={isSaved}
            disabled={isUpdatingAction}
            className="inline-flex size-40 cursor-pointer items-center justify-center rounded-rounded border border-white/70 bg-white/85 p-0 text-black shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:bg-white"
            onClick={() => toggleProductAction("save")}
            type="button"
          >
            <Bookmark
              aria-hidden
              className="size-20"
              fill={isSaved ? "currentColor" : "none"}
            />
          </button>
        </div>

        {showThumbs ? (
          <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-xl pb-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[9rem] rounded-b-xl bg-gradient-to-t from-black/70 via-black/35 to-transparent"
            />
            <Swiper
              className="relative flex w-full justify-center px-12 pb-[24px] pt-48 [&_.swiper-wrapper]:items-center [&_.swiper-wrapper]:justify-center [&_.swiper-slide]:!w-64 [&_.swiper-slide]:flex [&_.swiper-slide]:justify-center [&_.swiper-slide-thumb-active_img]:border-2 [&_.swiper-slide-thumb-active_img]:border-on-primary"
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
                  {slide.src ? (
                    <Image
                      alt=""
                      aria-hidden
                      className="size-64 cursor-pointer rounded-m border border-white/70 object-cover transition-[border-color] duration-200 ease-in-out"
                      height={64}
                      loading="lazy"
                      sizes="64px"
                      src={slide.src}
                      width={64}
                    />
                  ) : null}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : null}
      </div>

      <Dialog.Root open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[200] bg-surface-scrim" />
          <Dialog.Content className="fixed inset-0 z-[201] flex flex-col bg-surface-neutral-high-emphasis p-16 outline-none">
            <Dialog.Title className="sr-only">
              نمایش تصاویر {title}
            </Dialog.Title>
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
                <Image
                  alt={viewerSlide.alt}
                  className="max-h-full max-w-full rounded-m object-contain"
                  height={1200}
                  sizes="100vw"
                  src={viewerSlide.src}
                  width={1200}
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
                      <Image
                        alt=""
                        aria-hidden
                        className="size-64 rounded-[calc(var(--radius-m)-2px)] object-cover"
                        height={64}
                        sizes="64px"
                        src={slide.src}
                        width={64}
                      />
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
