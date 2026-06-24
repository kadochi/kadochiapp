"use client";

import { useEffect, useMemo, useState, memo } from "react";
import Head from "next/head";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Thumbs } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/thumbs";
import { cn } from "@/lib/cn";

type Props = { images: string[]; title: string };

function ImageGallery({ images, title }: Props) {
  const srcs = useMemo(() => (images && images.length ? images : ["/images/placeholder.png"]), [images]);
  const firstSrc = srcs[0];
  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);
  const safeThumbs = thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null;
  const [showThumbs, setShowThumbs] = useState(false);

  useEffect(() => {
    const rir = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(cb as any, 1));
    const id = rir(() => setShowThumbs(true));
    return () => {
      const cic = (window as any).cancelIdleCallback || ((tid: any) => clearTimeout(tid));
      cic(id);
    };
  }, []);

  return (
    <div className="overflow-hidden bg-[var(--surface-background)]">
      <Head>
        <link rel="preload" as="image" href={firstSrc} />
      </Head>

      <Swiper
        dir="rtl"
        slidesPerView={1}
        spaceBetween={0}
        modules={[FreeMode, Thumbs]}
        thumbs={{ swiper: safeThumbs }}
        className="w-full mb-3 [&_.swiper-wrapper]:flex"
      >
        {srcs.map((src, i) => {
          const isFirst = i === 0;
          return (
            <SwiperSlide key={i} className="w-full flex justify-center">
              <img
                src={src}
                alt={`${title} - تصویر ${i + 1}`}
                className="block w-full max-w-[400px] h-auto max-h-[400px] aspect-square mx-auto object-cover"
                loading={isFirst ? "eager" : "lazy"}
                decoding={isFirst ? "sync" : "async"}
                width={400}
                height={400}
                sizes="(max-width: 768px) 100vw, 400px"
                {...(isFirst ? ({ fetchPriority: "high" } as any) : ({} as any))}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>

      {showThumbs && (
        <Swiper
          dir="rtl"
          onSwiper={setThumbsSwiper}
          spaceBetween={12}
          slidesPerView="auto"
          freeMode
          watchSlidesProgress
          modules={[FreeMode, Thumbs]}
          className="flex justify-center my-3 [&_.swiper-wrapper]:items-center [&_.swiper-wrapper]:justify-center [&_.swiper-slide]:!w-16 [&_.swiper-slide]:flex [&_.swiper-slide]:justify-center"
        >
          {srcs.map((src, i) => (
            <SwiperSlide key={`thumb-${i}`} className="flex justify-center items-center">
              <img
                src={src}
                alt={`${title} - تصویر کوچک ${i + 1}`}
                width={56}
                height={56}
                className="w-16 h-16 object-cover rounded-[var(--radius-m)] cursor-pointer border border-[var(--border-border-high-emphasis)] transition-colors duration-200 [.swiper-slide-thumb-active_&]:border-2 [.swiper-slide-thumb-active_&]:border-[var(--secondary-secondary)]"
                loading="lazy"
                decoding="async"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}

export default memo(ImageGallery);
