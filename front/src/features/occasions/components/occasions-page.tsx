"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import {
  createOccasion,
  listOccasions,
} from "@/features/occasions/services/occasions";
import type { Occasion } from "@/features/occasions/types";
import {
  PERSIAN_MONTHS,
  getPersianDateParts,
  getPersianMonthDates,
  getPersianWeekday,
  movePersianMonth,
  toIsoDate,
} from "../utils/persian-calendar";
import { AddOccasionSheet } from "./add-occasion-sheet";

function daysUntil(isoDate: string): number {
  const today = new Date();
  const startOfToday = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.ceil(
    (Date.UTC(year, month - 1, day) - startOfToday) / 86_400_000,
  );
}

function remainingLabel(isoDate: string): string {
  const remaining = daysUntil(isoDate);
  if (remaining === 0) return "امروز";
  if (remaining < 0) return "گذشته";
  return `${new Intl.NumberFormat("fa-IR").format(remaining)} روز مانده`;
}

export function OccasionsPage() {
  const { status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const currentPersianDate = useMemo(() => getPersianDateParts(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState({
    month: currentPersianDate.month,
    year: currentPersianDate.year,
  });
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showFloatingAction, setShowFloatingAction] = useState(false);
  const sectionHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;
    void listOccasions({ page: 1, perPage: 50 })
      .then((result) => {
        if (!cancelled) setOccasions(result.items);
      })
      .catch(() => {
        if (!cancelled)
          toast({
            description: "دریافت مناسبت‌ها با مشکل مواجه شد.",
            tone: "error",
            title: "خطا",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [status, toast]);

  useEffect(() => {
    const header = sectionHeaderRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingAction(!entry.isIntersecting),
      // The shared site header is sticky at 88px. Reveal the action only
      // after the occasion header has moved behind it.
      { rootMargin: "-88px 0px 0px", threshold: 0 },
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const occasionsByDate = useMemo(() => {
    const map = new Map<string, Occasion[]>();
    if (status !== "authenticated") return map;
    occasions.forEach((occasion) =>
      map.set(occasion.occasionDate, [
        ...(map.get(occasion.occasionDate) ?? []),
        occasion,
      ]),
    );
    return map;
  }, [occasions, status]);
  const days = useMemo(
    () => getPersianMonthDates(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  function openAddSheet() {
    if (status !== "authenticated") {
      router.push("/login?next=/occasions");
      return;
    }
    setSheetOpen(true);
  }

  async function handleCreate(input: { title: string; occasionDate: string }) {
    try {
      const created = await createOccasion(input);
      setOccasions((current) => [created, ...current]);
      toast({
        description: "مناسبت جدید به تقویم شما اضافه شد.",
        tone: "success",
        title: "ثبت شد",
      });
    } catch {
      toast({
        description: "ثبت مناسبت انجام نشد. دوباره تلاش کنید.",
        tone: "error",
        title: "خطا",
      });
      throw new Error("Unable to create occasion.");
    }
  }

  return (
    <>
      <section aria-label="تقویم مناسبت‌ها">
        <div ref={sectionHeaderRef}>
          <SectionHeader
            as="h1"
            leftSlot={
              <Button
                onClick={openAddSheet}
                size="small"
                variant="secondary-filled"
              >
                <Plus aria-hidden /> افزودن مناسبت
              </Button>
            }
            subtitle="مناسبت‌های رسمی و شخصی"
            title="تقویم مناسبت‌ها"
          />
        </div>
        <div className="sticky top-88 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-8 bg-surface-soft px-16 py-16 [direction:rtl]">
          <Button
            className="justify-self-start px-8"
            onClick={() =>
              setVisibleMonth((current) =>
                movePersianMonth(current.year, current.month, -1),
              )
            }
            size="small"
            variant="link-ghost"
          >
            <ChevronRight aria-hidden /> ماه قبل
          </Button>
          <strong
            aria-live="polite"
            className="text-label-16 text-surface-neutral-high-emphasis"
          >
            {PERSIAN_MONTHS[visibleMonth.month]} {visibleMonth.year}
          </strong>
          <Button
            className="justify-self-end px-8"
            onClick={() =>
              setVisibleMonth((current) =>
                movePersianMonth(current.year, current.month, 1),
              )
            }
            size="small"
            variant="link-ghost"
          >
            ماه بعد <ChevronLeft aria-hidden />
          </Button>
        </div>

        <div
          className="bg-surface-background pb-[calc(var(--bottom-nav-safe,0px)+var(--spacing-80))]"
          dir="rtl"
        >
          {days.map((date) => {
            const isoDate = toIsoDate(date);
            const dayOccasions = occasionsByDate.get(isoDate) ?? [];
            const dateParts = getPersianDateParts(date);
            return (
              <div key={isoDate}>
                <article className="grid min-h-80 grid-cols-[72px_1fr] items-start gap-16 px-16 py-12">
                  <div className="grid justify-items-center gap-4 pt-2">
                    <span className="text-label-12 text-surface-neutral-mid-emphasis">
                      {getPersianWeekday(date)}
                    </span>
                    <strong className="text-heading-24 leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis">
                      {dateParts.day}
                    </strong>
                  </div>
                  <div className="grid min-h-56 content-center gap-8">
                    {dayOccasions.map((occasion) => (
                      <div
                        className="grid grid-cols-[1fr_auto] items-center gap-12 rounded-s bg-secondary-container px-12 py-8"
                        key={occasion.id}
                      >
                        <strong className="truncate text-label-16 text-on-secondary-container">
                          {occasion.title}
                        </strong>
                        <span className="whitespace-nowrap text-label-12 text-surface-neutral-mid-emphasis">
                          {remainingLabel(occasion.occasionDate)}
                        </span>
                      </div>
                    ))}
                    {!dayOccasions.length ? (
                      <span className="text-label-14 text-on-disable">
                        {status === "loading"
                          ? "در حال دریافت مناسبت‌ها…"
                          : "بدون مناسبت"}
                      </span>
                    ) : null}
                  </div>
                </article>
                <Divider />
              </div>
            );
          })}
        </div>
      </section>

      {showFloatingAction ? (
        <Button
          aria-label="افزودن مناسبت"
          className="fixed bottom-[calc(var(--bottom-nav-safe,0px)+var(--spacing-24))] left-1/2 z-30 -translate-x-1/2 shadow-[0_4px_12px_rgb(0_0_0_/_0.2)] lg:bottom-40"
          onClick={openAddSheet}
          size="large"
          variant="secondary-filled"
        >
          <Plus aria-hidden /> افزودن مناسبت
        </Button>
      ) : null}
      <AddOccasionSheet
        onOpenChange={setSheetOpen}
        onSubmit={handleCreate}
        open={sheetOpen}
      />
    </>
  );
}
