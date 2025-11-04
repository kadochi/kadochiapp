"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import styles from "./Occasion.module.css";
import OccasionCart from "./OccasionCart";
import { toJalaali } from "jalaali-js";

type OccasionItem = {
  title: string;
  day: string;
  month: string;
  remainingDays: number;
  sortKey: number;
};

type WPOccasion = {
  acf?: {
    title?: string;
    occasion_date?: string;
  };
};

const SKELETON_COUNT = 6;

export default function OccasionCarouselClient({
  items,
}: {
  items?: OccasionItem[];
}) {
  const [occasions, setOccasions] = useState<OccasionItem[]>(items ?? []);
  const [loading, setLoading] = useState<boolean>(!items || items.length === 0);

  useEffect(() => {
    if (items && items.length) {
      setLoading(false);
      return;
    }

    fetch(
      "https://app.kadochi.com/wp-json/wp/v2/occasion?acf_format=standard",
      {
        cache: "no-store",
      }
    )
      .then((res) => res.json())
      .then((data: unknown) => {
        const today = new Date();

        const arr = Array.isArray(data) ? (data as WPOccasion[]) : [];
        const persianMonths = [
          "",
          "فروردین",
          "اردیبهشت",
          "خرداد",
          "تیر",
          "مرداد",
          "شهریور",
          "مهر",
          "آبان",
          "آذر",
          "دی",
          "بهمن",
          "اسفند",
        ] as const;

        const mapped = arr
          .map((item) => {
            const acf = item.acf ?? {};
            const title = acf.title ?? "";
            const gregorianDateStr = acf.occasion_date ?? "";
            if (!gregorianDateStr) return null;

            const [gy, gm, gd] = gregorianDateStr.split("-").map(Number);
            if (!gy || !gm || !gd) return null;

            const targetDate = new Date(gy, gm - 1, gd);
            const diffTime = targetDate.getTime() - today.getTime();
            const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (remainingDays < 0) return null;

            const j = toJalaali(gy, gm, gd);

            return {
              title,
              day: String(j.jd),
              month: persianMonths[j.jm],
              remainingDays,
              sortKey: targetDate.getTime(),
            } as OccasionItem;
          })
          .filter((x): x is OccasionItem => x !== null)
          .sort((a, b) => a.sortKey - b.sortKey);

        setOccasions(mapped);
      })
      .catch((err) => {
        console.error("Error loading occasions:", err);
        setOccasions([]);
      })
      .finally(() => setLoading(false));
  }, [items]);

  return (
    <div className={styles.occasionDaysCarousel}>
      <Swiper
        dir="rtl"
        spaceBetween={12}
        className={styles.swiper}
        breakpoints={{
          0: {
            slidesPerView: 1.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          320: {
            slidesPerView: 1.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          540: {
            slidesPerView: 2.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          700: {
            slidesPerView: 2.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          860: {
            slidesPerView: 3.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          1024: {
            slidesPerView: 4,
            allowTouchMove: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
          },
        }}
      >
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SwiperSlide
                key={`sk-${i}`}
                className={styles.occasionDaysCarouselSlide}
              >
                <div
                  className={`${styles.occasionDayCard} ${styles.skeletonCard}`}
                  aria-busy="true"
                  aria-label="در حال بارگذاری"
                >
                  <div className={styles.skelDay} />
                  <div className={styles.skelMonth} />
                  <div className={styles.skelTitle} />
                  <div className={styles.skelRemain} />
                  <div className={styles.skelBtn} />
                </div>
              </SwiperSlide>
            ))
          : occasions.map((o, idx) => (
              <SwiperSlide
                key={idx}
                className={styles.occasionDaysCarouselSlide}
              >
                <OccasionCart
                  day={o.day}
                  month={o.month}
                  title={o.title}
                  remainingDays={o.remainingDays}
                />
              </SwiperSlide>
            ))}
      </Swiper>
    </div>
  );
}
