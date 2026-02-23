"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import styles from "./Occasion.module.css";
import OccasionCart from "./OccasionCart";
import { dayjs, parseOccasionDate, PERSIAN_MONTHS } from "@/lib/jalali";

type OccasionItem = {
  title: string;
  day: string;
  month: string;
  remainingDays: number;
  sortKey: number;
  variant: "public" | "private";
};

type WPOccasion = {
  acf?: {
    title?: string;
    occasion_date?: string;
    user_id?: number | string | null;
  };
};

const SKELETON_COUNT = 6;

export default function OccasionCarouselClient({
  items,
  userId,
}: {
  items?: OccasionItem[];
  userId?: number | null;
}) {
  const [occasions, setOccasions] = useState<OccasionItem[]>(items ?? []);
  const [loading, setLoading] = useState<boolean>(!items || items.length === 0);

  useEffect(() => {
    if (items && items.length) {
      setLoading(false);
      return;
    }

    const fetchOpts = { cache: "no-store" as const };
    const adminUrl =
      "/api/wp/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100";
    const userUrl = userId
      ? `/api/wp/wp-json/wp/v2/occasion?author=${userId}&acf_format=standard&per_page=100`
      : null;

    Promise.all([
      fetch(adminUrl, fetchOpts).then((r) => (r.ok ? r.json() : [])),
      userUrl
        ? fetch(userUrl, fetchOpts).then((r) => (r.ok ? r.json() : []))
        : Promise.resolve([]),
    ])
      .then(([adminData, userData]: [unknown, unknown]) => {
        const today = new Date();

        const adminArr = Array.isArray(adminData)
          ? (adminData as WPOccasion[])
          : [];
        const userArr = Array.isArray(userData)
          ? (userData as WPOccasion[])
          : [];

        const filteredAdmin = adminArr.filter((it) => {
          const owner = it.acf?.user_id;
          return owner == null || owner === "" || String(owner) === "1";
        });

        const mapToOccasion = (
          item: WPOccasion,
          variant: "public" | "private"
        ): OccasionItem | null => {
          const acf = item.acf ?? {};
          const title = (acf.title ?? "").trim();
          const gregorianDateStr = parseOccasionDate(acf.occasion_date);
          if (!gregorianDateStr) return null;

          const targetDate = dayjs(gregorianDateStr).toDate();
          const diffTime = targetDate.getTime() - today.getTime();
          const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (remainingDays < 0) return null;

          const j = dayjs(gregorianDateStr).calendar("jalali");
          return {
            title,
            day: String(j.date()),
            month: PERSIAN_MONTHS[j.month() + 1],
            remainingDays,
            sortKey: targetDate.getTime(),
            variant,
          };
        };

        const seen = new Set<string>();
        const adminItems = filteredAdmin
          .map((it) => mapToOccasion(it, "public"))
          .filter((x): x is OccasionItem => x !== null);
        const userItems = userArr
          .map((it) => mapToOccasion(it, "private"))
          .filter((x): x is OccasionItem => x !== null);

        const mapped: OccasionItem[] = [];
        for (const item of adminItems) {
          const dedupeKey = `${item.title}|${item.sortKey}`;
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            mapped.push(item);
          }
        }
        for (const item of userItems) {
          const dedupeKey = `${item.title}|${item.sortKey}`;
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            mapped.push(item);
          }
        }
        mapped.sort((a, b) => a.sortKey - b.sortKey);

        setOccasions(mapped);
      })
      .catch((err) => {
        console.error("Error loading occasions:", err);
        setOccasions([]);
      })
      .finally(() => setLoading(false));
  }, [items, userId]);

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
                  variant={o.variant}
                />
              </SwiperSlide>
            ))}
      </Swiper>
    </div>
  );
}
