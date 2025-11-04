// src/domains/catalog/components/CategoryCarousel/CategoryCarouselClient.tsx
"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import s from "./Category.module.css";

export type Card = {
  id: number | string;
  title: string;
  subtitle?: string;
  image?: string;
  href?: string;
};

function decodeEntities(html: string): string {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const t = document.createElement("textarea");
    t.innerHTML = html;
    return t.value;
  }
  return html.replace(/&[#A-Za-z0-9]+;/g, " ");
}

function cleanDesc(raw?: string): string {
  if (!raw) return "";
  let txt = raw
    .replace(/&#8230;|&hellip;|;?8230#&/gi, "…")
    .replace(/&nbsp;/gi, " ");

  txt = decodeEntities(txt);
  txt = txt
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (txt.endsWith("…")) return txt;

  // حذف علائم/اعداد انتهایی مزاحم، اما نه متن مفید
  txt = txt.replace(/[؛;,:،.\-–—#&\d\s]+$/u, "").trim();
  return txt;
}

function normalize(cards: Card[]): Card[] {
  return (cards || [])
    .filter(Boolean)
    .filter(
      (c) =>
        (c.title ?? "").trim() !== "" &&
        !/^(uncategorized|بدون دسته‌بندی)$/i.test(c.title ?? "")
    )
    .map((c) => ({
      ...c,
      subtitle: cleanDesc(c.subtitle ?? ""),
      image: c.image || undefined,
    }));
}

function bgStyle(src?: string) {
  return { ["--card-bg-img" as any]: src ? `url(${src})` : "none" };
}

export default function CategoryCarouselClient({
  items: initial,
}: {
  items?: Card[];
}) {
  const [items, setItems] = useState<Card[]>(normalize(initial ?? []));
  const [loading, setLoading] = useState<boolean>(!(initial && initial.length));

  useEffect(() => {
    if (initial && initial.length) {
      setItems(normalize(initial));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(
          "/wp-json/wc/store/v1/product-categories?per_page=50"
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any[] = await res.json();

        if (cancelled) return;

        const mapped: Card[] = (data || []).map((c) => ({
          id: c.id,
          title: c?.name ?? "",
          subtitle: c?.description ?? "",
          image: c?.image?.src ?? undefined,
          href: `/products?category=${encodeURIComponent(c?.slug ?? "")}`,
        }));

        setItems(normalize(mapped));
      } catch (e) {
        console.error("[CategoryCarouselClient] fetch error:", e);
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial]);

  const skeletonCount = 6;

  return (
    <div className={s.categoryCarousel}>
      <Swiper
        dir="rtl"
        spaceBetween={12}
        className={s.swiper}
        breakpoints={{
          0: {
            slidesPerView: 1.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          320: {
            slidesPerView: 2.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          540: {
            slidesPerView: 3.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          700: {
            slidesPerView: 4.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },
          860: {
            slidesPerView: 5.4,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
          },

          1024: {
            slidesPerView: 8,
            allowTouchMove: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
          },
        }}
      >
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <SwiperSlide key={`cat-skel-${i}`} className={s.slide}>
                <div className={s.skeletonCard} />
              </SwiperSlide>
            ))
          : items.map((c) => (
              <SwiperSlide key={c.id} className={s.slide}>
                <a href={c.href ?? "#"} aria-label={c.title}>
                  <div className={s.categoryCard} style={bgStyle(c.image)}>
                    <div className={s.cardInner}>
                      <h3 className={s.categoryTitle}>{c.title}</h3>
                      {c.subtitle ? (
                        <p className={s.categorySubtitle}>{c.subtitle}</p>
                      ) : null}
                    </div>
                  </div>
                </a>
              </SwiperSlide>
            ))}
      </Swiper>
    </div>
  );
}
