"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useOptionalAuth } from "@/features/auth/auth-provider";
import { listOccasions } from "@/features/occasions/services/occasions";
import type { Occasion } from "@/features/occasions/types";
import {
  getPersianDateParts,
  occasionDateForPersianYear,
  PERSIAN_MONTHS,
  toIsoDate,
} from "@/features/occasions/utils/persian-calendar";

function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

const persianNumber = new Intl.NumberFormat("fa-IR");

const occasionSliderBreakpoints = {
  0: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 1.4 },
  540: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 2.4 },
  860: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 3.4 },
  1024: { allowTouchMove: false, slidesOffsetAfter: 0, slidesOffsetBefore: 0, slidesPerView: 4 },
} as const;

const occasionSkeleton =
  "bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite]";

function upcomingOccurrence(occasion: Occasion): Occasion {
  if (!occasion.repeatsAnnually) return occasion;

  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentYear = getPersianDateParts(today).year;
  const thisYearDate = occasionDateForPersianYear(occasion.occasionDate, currentYear);
  const occasionDate = thisYearDate >= todayIso
    ? thisYearDate
    : occasionDateForPersianYear(occasion.occasionDate, currentYear + 1);

  return { ...occasion, occasionDate };
}

function OccasionCard({ occasion }: { occasion: Occasion }) {
  const remainingDays = daysUntil(occasion.occasionDate);
  const date = getPersianDateParts(new Date(`${occasion.occasionDate}T00:00:00Z`));
  const isPersonal = occasion.isPersonal;

  return (
    <article className="relative flex h-fit min-h-0 flex-col items-center rounded-xl bg-surface-soft px-8 py-16 text-center">
      <Label
        appearance="soft"
        className="absolute top-12 left-12"
        size="sm"
        variant={isPersonal ? "success" : "secondary"}
      >
        {isPersonal ? "شخصی" : "عمومی"}
      </Label>
      <time
        className="text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis"
        dateTime={occasion.occasionDate}
      >
        {persianNumber.format(date.day)}
      </time>
      <span className="text-label-14 font-regular leading-[var(--text-label-14--line-height)] text-surface-neutral-mid-emphasis">
        {PERSIAN_MONTHS[date.month]}
      </span>
      <h3 className="mb-0 mt-12 text-label-14 font-bold leading-[var(--text-label-14--line-height)] text-surface-neutral-high-emphasis">
        {occasion.title}
      </h3>
      <p className={`mb-16 mt-8 text-label-12 leading-[var(--text-label-12--line-height)] ${remainingDays < 8 ? "font-bold text-error" : "font-regular text-surface-neutral-mid-emphasis"}`}>
        {persianNumber.format(remainingDays)} روز مانده
      </p>
      <Button asChild size="small" variant="link-ghost">
        <Link href="/products">
          خرید کادو
          <ChevronLeft aria-hidden="true" />
        </Link>
      </Button>
    </article>
  );
}

/** Mirrors the loaded card's exact content rhythm while occasions are fetched. */
function OccasionCardSkeleton() {
  return (
    <article
      aria-busy="true"
      aria-label="در حال بارگذاری مناسبت"
      className="relative flex h-fit min-h-0 flex-col items-center rounded-xl bg-surface-soft px-8 py-16 text-center"
    >
      <span aria-hidden className={`absolute top-12 left-12 h-24 w-48 rounded-rounded ${occasionSkeleton}`} />
      <span aria-hidden className={`h-[var(--text-heading-24--line-height)] w-40 rounded-s ${occasionSkeleton}`} />
      <span aria-hidden className={`mt-2 h-[var(--text-label-14--line-height)] w-56 rounded-s ${occasionSkeleton}`} />
      <span aria-hidden className={`mt-12 h-[var(--text-label-14--line-height)] w-[70%] rounded-s ${occasionSkeleton}`} />
      <span aria-hidden className={`mb-16 mt-8 h-[var(--text-label-12--line-height)] w-[52%] rounded-s ${occasionSkeleton}`} />
      <span aria-hidden className={`h-40 w-96 rounded-rounded ${occasionSkeleton}`} />
    </article>
  );
}

function OccasionRailLoading() {
  return (
    <div className="pb-16 min-[1024px]:px-16 [&_.swiper-wrapper]:items-start">
      <Swiper
        breakpoints={occasionSliderBreakpoints}
        className="carousel-rail carousel-rail--occasions"
        dir="rtl"
        spaceBetween={12}
        watchOverflow
      >
        {Array.from({ length: 6 }, (_, index) => (
          <SwiperSlide className="!h-fit self-start" key={`placeholder-${index}`}>
            <OccasionCardSkeleton />
          </SwiperSlide>
        ))}
      </Swiper>
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
          setItems(response.items.map(upcomingOccurrence).filter((item) => daysUntil(item.occasionDate) >= 0));
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

  // Do not flash the sign-in prompt while the session is resolving. The
  // homepage should show only occasion cards or their matching skeleton.
  if (!auth || auth.status === "loading" || (isAuthenticated && loading)) {
    return <OccasionRailLoading />;
  }
  if (!isAuthenticated || !upcoming.length) return null;

  return (
    <div className="pb-16 min-[1024px]:px-16 [&_.swiper-wrapper]:items-start">
      <Swiper
        breakpoints={occasionSliderBreakpoints}
        className="carousel-rail carousel-rail--occasions"
        dir="rtl"
        spaceBetween={12}
        watchOverflow
      >
        {upcoming.map((occasion) => (
          <SwiperSlide className="!h-fit self-start" key={occasion.id}>
            <OccasionCard occasion={occasion} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
