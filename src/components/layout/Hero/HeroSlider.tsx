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

export default function HeroSlider() {
  const [banners, setBanners] = useState<BannerData[]>([]);

  useEffect(() => {
    const ctl = new AbortController();
    fetch("https://app.kadochi.com/wp-json/wp/v2/hero?acf_format=standard", {
      signal: ctl.signal,
    })
      .then((res) => res.json())
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
          .filter((b) => b.title && b.backgroundImage);
        setBanners(formatted);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.warn("Banner fetch warn:", err);
      });
    return () => ctl.abort();
  }, []);

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
    <div className={s.bannerSlider} aria-label="اسلایدر بنر">
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
          {banners.map((banner, index) => (
            <SwiperSlide key={index} className={s.slide}>
              <Banner {...banner} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}
