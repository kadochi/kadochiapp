// src/app/product/[id]/ProductGallery.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import Head from "next/head";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Thumbs } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/thumbs";
import styles from "./ImageGallery.module.css";

type Props = { images: string[]; title: string };

function ImageGallery({ images, title }: Props) {
  const srcs = useMemo(
    () => (images && images.length ? images : ["/images/placeholder.png"]),
    [images]
  );

  const firstSrc = srcs[0];

  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);
  const safeThumbs =
    thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null;

  // Defer rendering thumbnail slider to idle time (reduces LCP)
  const [showThumbs, setShowThumbs] = useState(false);
  useEffect(() => {
    const rir =
      (window as any).requestIdleCallback ||
      ((cb: Function) => setTimeout(cb as any, 1));
    const id = rir(() => setShowThumbs(true));
    return () => {
      const cic =
        (window as any).cancelIdleCallback || ((tid: any) => clearTimeout(tid));
      cic(id);
    };
  }, []);

  return (
    <div className={styles.gallery}>
      {/* Preload the LCP image */}
      <Head>
        <link rel="preload" as="image" href={firstSrc} />
      </Head>

      {/* Main slider (first image is LCP) */}
      <Swiper
        dir="rtl"
        slidesPerView={1}
        spaceBetween={0}
        modules={[FreeMode, Thumbs]}
        thumbs={{ swiper: safeThumbs }}
        className={`${styles.swiper} ${styles.mainSwiper}`}
      >
        {srcs.map((src, i) => {
          const isFirst = i === 0;
          const fetchPriorityProp = isFirst
            ? ({ fetchPriority: "high" } as any)
            : ({} as any);

          return (
            <SwiperSlide key={i} className={styles.slide}>
              <img
                src={src}
                alt={`${title} - تصویر ${i + 1}`}
                className={styles.mainImage}
                loading={isFirst ? "eager" : "lazy"}
                decoding={isFirst ? "sync" : "async"}
                width={400}
                height={400}
                sizes="(max-width: 768px) 100vw, 400px"
                {...(isFirst
                  ? ({ fetchPriority: "high" } as any)
                  : ({} as any))}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Thumbnails (deferred to idle => not on critical path) */}
      {showThumbs && (
        <Swiper
          dir="rtl"
          onSwiper={setThumbsSwiper}
          spaceBetween={12}
          slidesPerView="auto"
          freeMode
          watchSlidesProgress
          modules={[FreeMode, Thumbs]}
          className={`${styles.swiper} ${styles.thumbSwiper}`}
        >
          {srcs.map((src, i) => (
            <SwiperSlide key={`thumb-${i}`} className={styles.thumbSlide}>
              <img
                src={src}
                alt={`${title} - تصویر کوچک ${i + 1}`}
                width={56}
                height={56}
                className={styles.thumbImage}
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
