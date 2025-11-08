"use client";
import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Banner from "./Hero";
import s from "./Hero.module.css";

type BannerData = {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage: string;
};

export default function HeroSliderClient({
  initialBanners = [] as BannerData[],
}) {
  const [banners, setBanners] = useState<BannerData[]>(initialBanners);

  useEffect(() => {
    if (initialBanners.length) return;
    const ctl = new AbortController();

    fetch("/api/wp/wp-json/wp/v2/hero?acf_format=standard", {
      signal: ctl.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.resolve([])))
      .then((data) => {
        if (!Array.isArray(data)) return;
        const formatted: BannerData[] = data
          .map((item: any) => {
            const acf = item?.acf || {};
            const bg =
              typeof acf?.background_image === "string"
                ? acf.background_image
                : acf?.background_image?.url || "";
            return {
              title: acf.title || "",
              subtitle: acf.subtitle || "",
              ctaText: acf.cta_text || "",
              ctaLink: acf.cta_link || "#",
              backgroundImage: bg,
            };
          })
          .filter((b: BannerData) => b.title && b.backgroundImage);
        setBanners(formatted);
      })
      .catch(() => {});

    return () => ctl.abort();
  }, [initialBanners.length]);

  const { canLoop, showPagination, enableAutoplay } = useMemo(() => {
    const count = banners.length;
    return {
      canLoop: count > 1,
      showPagination: count > 1,
      enableAutoplay: count > 1,
    };
  }, [banners.length]);

  const skeleton = (
    <div className={s.placeholder} aria-hidden="true">
      <div className={s.phImg} />
      <div className={s.phDots} />
    </div>
  );

  return (
    <section
      className={s.bannerSlider}
      role="region"
      aria-roledescription="carousel"
      aria-label="اسلایدر بنر"
      aria-live="polite"
    >
      {!banners.length ? (
        skeleton
      ) : (
        <Swiper
          key={canLoop ? "loop" : "no-loop"}
          modules={[Autoplay, Pagination]}
          dir="rtl"
          slidesPerView={1}
          loop={canLoop}
          watchOverflow
          allowTouchMove={banners.length > 1}
          pagination={showPagination ? { clickable: true } : false}
          autoplay={
            enableAutoplay
              ? { delay: 10000, disableOnInteraction: false }
              : false
          }
          className={s.swiper}
        >
          {banners.map((banner, i) => (
            <SwiperSlide
              key={i}
              className={s.slide}
              role="group"
              aria-label={`اسلاید ${i + 1} از ${banners.length}`}
            >
              <Banner {...banner} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}
