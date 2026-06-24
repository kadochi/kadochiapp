"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { cn } from "@/lib/cn";

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
  let txt = raw.replace(/&#8230;|&hellip;|;?8230#&/gi, "…").replace(/&nbsp;/gi, " ");
  txt = decodeEntities(txt);
  txt = txt.replace(/<\/?[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (txt.endsWith("…")) return txt;
  txt = txt.replace(/[؛;,:،.\-–—#&\d\s]+$/u, "").trim();
  return txt;
}

function normalize(cards: Card[]): Card[] {
  return (cards || [])
    .filter(Boolean)
    .filter((c) => (c.title ?? "").trim() !== "" && !/^(uncategorized|بدون دسته‌بندی)$/i.test(c.title ?? ""))
    .map((c) => ({ ...c, subtitle: cleanDesc(c.subtitle ?? ""), image: c.image || undefined }));
}

function bgStyle(src?: string) {
  return { ["--card-bg-img" as any]: src ? `url(${src})` : "none" };
}

export default function CategoryCarouselClient({ items: initial }: { items?: Card[] }) {
  const [items, setItems] = useState<Card[]>(normalize(initial ?? []));
  const [loading, setLoading] = useState<boolean>(!(initial && initial.length));

  useEffect(() => {
    if (initial && initial.length) { setItems(normalize(initial)); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/store/categories?per_page=50");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any[] = await res.json();
        if (cancelled) return;
        const mapped: Card[] = (data || []).map((c) => ({
          id: c.id, title: c?.name ?? "", subtitle: c?.description ?? "",
          image: c?.image?.src ?? undefined, href: `/products?category=${encodeURIComponent(c?.slug ?? "")}`,
        }));
        setItems(normalize(mapped));
      } catch (e) { console.error("[CategoryCarouselClient] fetch error:", e); setItems([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [initial]);

  const skeletonCount = 6;

  return (
    <div className="py-4 lg:px-4">
      <Swiper
        dir="rtl"
        spaceBetween={12}
        breakpoints={{
          0: { slidesPerView: 1.4, slidesOffsetBefore: 16, slidesOffsetAfter: 16 },
          320: { slidesPerView: 2.4, slidesOffsetBefore: 16, slidesOffsetAfter: 16 },
          540: { slidesPerView: 3.4, slidesOffsetBefore: 16, slidesOffsetAfter: 16 },
          700: { slidesPerView: 4.4, slidesOffsetBefore: 16, slidesOffsetAfter: 16 },
          860: { slidesPerView: 5.4, slidesOffsetBefore: 16, slidesOffsetAfter: 16 },
          1024: { slidesPerView: 8, allowTouchMove: false, slidesOffsetBefore: 0, slidesOffsetAfter: 0 },
        }}
      >
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <SwiperSlide key={`cat-skel-${i}`} className="shrink-0">
                <div className="h-64 md:h-60 rounded-[var(--radius-xxl)] bg-gradient-to-r from-[var(--surface-surface-soft)] via-[var(--surface-surface-dim)] to-[var(--surface-surface-soft)] bg-[length:200%_100%] animate-[shimmer_1.2s_linear_infinite]" />
              </SwiperSlide>
            ))
          : items.map((c) => (
              <SwiperSlide key={c.id} className="shrink-0">
                <a href={c.href ?? "#"} aria-label={c.title} className="no-underline text-inherit">
                  <div
                    className="w-auto h-64 md:h-60 rounded-[var(--radius-xl)] p-5 flex flex-col justify-end box-border"
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%), var(--card-bg-img), linear-gradient(to top, var(--secondary-secondary) 0%, var(--secondary-secondary-gradient) 100%)`,
                      backgroundRepeat: "no-repeat, no-repeat, no-repeat",
                      backgroundPosition: "center, center, center",
                      backgroundSize: "cover, cover, cover",
                      ...bgStyle(c.image),
                    } as React.CSSProperties}
                  >
                    <div className="grid gap-1.5 mt-auto">
                      <h3 className="text-[var(--primary-on-primary)] font-sans text-2xl font-bold text-start m-0">{c.title}</h3>
                      {c.subtitle ? <p className="text-[var(--disable-disable)] font-sans text-sm font-normal text-start m-0">{c.subtitle}</p> : null}
                    </div>
                  </div>
                </a>
              </SwiperSlide>
            ))}
      </Swiper>
    </div>
  );
}
