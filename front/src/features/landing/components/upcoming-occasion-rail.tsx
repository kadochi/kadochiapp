"use client";

/* eslint-disable @next/next/no-img-element -- This fixed local icon is shared by the existing icon system. */

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { Button } from "@/components/ui/button";
import { useOptionalAuth } from "@/features/auth/auth-provider";
import { listOccasions } from "@/features/occasions/services/occasions";
import type { Occasion } from "@/features/occasions/types";

function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

const persianDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  day: "numeric",
  month: "long",
});

function OccasionCard({ occasion }: { occasion: Occasion }) {
  const remainingDays = daysUntil(occasion.occasionDate);

  return (
    <article className="flex min-h-176 flex-col items-center rounded-xl bg-surface-soft px-8 py-16 text-center">
      <time className="text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" dateTime={occasion.occasionDate}>
        {persianDate.format(new Date(`${occasion.occasionDate}T00:00:00`))}
      </time>
      <h3 className="mb-0 mt-12 text-label-14 font-bold leading-[var(--text-label-14--line-height)] text-surface-neutral-high-emphasis">
        {occasion.title}
      </h3>
      {remainingDays > 0 ? (
        <p className={`mb-0 mt-8 text-label-12 leading-[var(--text-label-12--line-height)] ${remainingDays < 8 ? "font-bold text-error" : "font-regular text-surface-neutral-mid-emphasis"}`}>
          {new Intl.NumberFormat("fa-IR").format(remainingDays)} روز مانده
        </p>
      ) : null}
      <Button asChild className="mt-auto" size="small" variant="link-ghost">
        <Link href="/products">
          خرید کادو
          <ChevronLeft aria-hidden="true" />
        </Link>
      </Button>
    </article>
  );
}

function CalendarPrompt() {
  return (
    <div className="px-16 pb-16">
      <Link
        className="flex min-h-176 flex-col items-center justify-center rounded-xl bg-surface-soft px-24 py-24 text-center no-underline transition-[filter,transform] duration-150 hover:-translate-y-1 hover:[filter:saturate(1.05)]"
        href="/login"
      >
        <img alt="" className="mb-8 size-40" src="/icons/ocassions-calendar.svg" />
        <strong className="text-title-16 font-bold leading-[var(--text-title-16--line-height)] text-surface-neutral-high-emphasis">
          مناسبت‌های مهم‌تان را ثبت کنید
        </strong>
        <span className="mt-4 text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis">
          برای انتخاب به‌موقع هدیه، وارد حساب کاربری‌تان شوید.
        </span>
      </Link>
    </div>
  );
}

/** Displays the signed-in shopper's upcoming occasion cards from the protected BFF. */
export function UpcomingOccasionRail() {
  const auth = useOptionalAuth();
  const isAuthenticated = auth?.status === "authenticated";
  const [items, setItems] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    void listOccasions({ page: 1, perPage: 20 })
      .then((response) => {
        if (!cancelled) {
          setItems(response.items.filter((item) => daysUntil(item.occasionDate) >= 0));
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const upcoming = useMemo(
    () => [...items].sort((first, second) => first.occasionDate.localeCompare(second.occasionDate)),
    [items],
  );

  if (!isAuthenticated) return <CalendarPrompt />;
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-12 px-16 pb-16 min-[540px]:grid-cols-3 min-[1024px]:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div aria-label="در حال بارگذاری" className="h-176 animate-pulse rounded-xl bg-surface" key={index} />
        ))}
      </div>
    );
  }
  if (!upcoming.length) return <CalendarPrompt />;

  return (
    <div className="pb-16 min-[1024px]:px-16">
      <Swiper
        breakpoints={{
          0: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 1.4 },
          540: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 2.4 },
          860: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 3.4 },
          1024: { allowTouchMove: false, slidesOffsetAfter: 0, slidesOffsetBefore: 0, slidesPerView: 4 },
        }}
        dir="rtl"
        spaceBetween={12}
        watchOverflow
      >
        {upcoming.map((occasion) => (
          <SwiperSlide className="h-auto" key={occasion.id}>
            <OccasionCard occasion={occasion} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
