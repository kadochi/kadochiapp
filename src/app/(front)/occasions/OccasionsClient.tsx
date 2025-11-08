"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toJalaali, toGregorian } from "jalaali-js";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Button from "@/components/ui/Button/Button";
import Divider from "@/components/ui/Divider/Divider";
import { useSession } from "@/domains/auth/session-context";
import AddOccasionSheet from "./AddOccasionSheet";
import s from "./occasions.module.css";

type DayRow = {
  gDate: Date;
  jYear: number;
  jMonth: number;
  jDay: number;
  jMonthName: string;
  weekDayFa: string;
  key: string;
  titles: string[];
  offset: number;
};

const MONTHS = [
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

const WEEKDAYS_FA = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

const jsDayToFa = (jsDay: number) => WEEKDAYS_FA[jsDay];

export default function OccasionsClient({
  initialMap = {} as Record<string, string[]>,
  isLoggedInInitial = false,
  signinHref = "/login?redirect=/occasions",
}: {
  initialMap?: Record<string, string[]>;
  isLoggedInInitial?: boolean;
  signinHref?: string;
}) {
  const [wpMap, setWpMap] = useState<Record<string, string[]>>(initialMap);
  const [sheetOpen, setSheetOpen] = useState(false);

  const router = useRouter();
  const { session } = useSession();
  const isLoggedIn = !!session?.userId || isLoggedInInitial;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const tj = toJalaali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  const [jy, setJy] = useState<number>(tj.jy);
  const [jm, setJm] = useState<number>(tj.jm);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [showFab, setShowFab] = useState(false);

  useEffect(() => {
    if (Object.keys(initialMap).length) return;
    fetch("/api/wp/wp-json/wp/v2/occasion?acf_format=standard&per_page=100", {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const m: Record<string, string[]> = {};
        (Array.isArray(data) ? data : []).forEach((it: any) => {
          const d = it?.acf?.occasion_date?.trim();
          const t = it?.acf?.title?.trim();
          if (!d || !t) return;
          (m[d] ||= []).push(t);
        });
        setWpMap(m);
      })
      .catch(() => {});
  }, [initialMap]);

  const rows: DayRow[] = useMemo(() => {
    const out: DayRow[] = [];
    const monthName = MONTHS[jm];
    const msDay = 24 * 60 * 60 * 1000;

    for (let jd = 1; jd <= 31; jd++) {
      const g = toGregorian(jy, jm, jd);
      const back = toJalaali(g.gy, g.gm, g.gd);
      if (back.jy !== jy || back.jm !== jm || back.jd !== jd) continue;

      const gDate = new Date(g.gy, g.gm - 1, g.gd);
      gDate.setHours(0, 0, 0, 0);

      const key = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(
        g.gd
      ).padStart(2, "0")}`;
      const titles = wpMap[key] ?? [];

      const diff = gDate.getTime() - today.getTime();
      const offset = Math.max(0, Math.ceil(diff / msDay));

      out.push({
        gDate,
        jYear: jy,
        jMonth: jm,
        jDay: jd,
        jMonthName: monthName as unknown as string,
        weekDayFa: jsDayToFa(gDate.getDay()),
        key,
        titles,
        offset,
      });
    }
    return out;
  }, [wpMap, jy, jm, today]);

  const goPrevMonth = () =>
    setJm((prev) => {
      if (prev === 1) {
        setJy((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });

  const goNextMonth = () =>
    setJm((prev) => {
      if (prev === 12) {
        setJy((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setShowFab(!entries[0].isIntersecting),
      { root: null, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleAddClick = () => {
    if (!isLoggedIn) {
      router.push(signinHref);
      return;
    }
    setSheetOpen(true);
  };

  const handleCreate = async (data: {
    title: string;
    date: string; // YYYY-MM-DD (Gregorian)
    repeatYearly: boolean;
  }) => {
    try {
      const res = await fetch("/api/occasions/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("failed");

      // Optimistic UI: به نقشه محلی اضافه کن
      setWpMap((prev) => {
        const m = { ...prev };
        (m[data.date] ||= []).push(data.title);
        return m;
      });
    } catch {
      // می‌تونی نوتیف هم بزاری
    }
  };

  return (
    <>
      <div ref={headerRef}>
        <SectionHeader
          title="تقویم مناسبت‌ها"
          subtitle="مناسبت‌های رسمی و شخصی"
          leftSlot={
            <Button
              as="button"
              onClick={handleAddClick}
              type="secondary"
              style="filled"
              size="small"
              leadingIcon={<img src="/icons/add-white.svg" alt="+" />}
              aria-label="افزودن مناسبت"
            >
              افزودن مناسبت
            </Button>
          }
        />
      </div>

      <div className={s.monthBar} role="region" aria-label="انتخاب ماه">
        <Button
          as="button"
          className={s.monthBtn}
          type="link"
          style="ghost"
          size="small"
          onClick={goPrevMonth}
          aria-label="ماه قبل"
          leadingIcon={
            <img
              src="/icons/chevron-right-thin.svg"
              alt=""
              aria-hidden="true"
            />
          }
        >
          ماه قبل
        </Button>
        <div className={s.monthTitle} aria-live="polite">
          {MONTHS[jm]} {jy}
        </div>
        <Button
          as="button"
          className={s.monthBtn}
          type="link"
          style="ghost"
          size="small"
          onClick={goNextMonth}
          aria-label="ماه بعد"
          trailingIcon={
            <img src="/icons/chevron-left-thin.svg" alt="" aria-hidden="true" />
          }
        >
          ماه بعد
        </Button>
      </div>

      <main className={s.main} dir="rtl">
        <div className={s.list} role="list">
          {rows.map((row, idx) => (
            <div key={row.key}>
              <div className={s.item} role="listitem">
                <div className={s.dateCol}>
                  <div className={s.weekday}>{row.weekDayFa}</div>
                  <div className={s.dayBig}>{row.jDay}</div>
                </div>

                <div
                  className={`${s.occasionsCol} ${
                    row.titles.length ? s.hasOccasion : s.noOccasionRow
                  }`}
                >
                  {row.titles.length ? (
                    row.titles.map((t, i) => (
                      <div key={i} className={s.occasionCard}>
                        <span className={s.occTitle}>{t}</span>
                        <span className={s.occRemain}>
                          {row.offset} روز مانده
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className={s.noOccasion}>بدون مناسبت</div>
                  )}
                </div>
              </div>
              {idx !== rows.length - 1 && <Divider />}
            </div>
          ))}
          <div className={s.listEndSpacer} aria-hidden="true" />
        </div>
      </main>

      {showFab && (
        <Button
          as="button"
          onClick={handleAddClick}
          type="secondary"
          style="filled"
          size="large"
          className={s.fab}
          aria-label="افزودن مناسبت"
          leadingIcon={
            <img src="/icons/add-white.svg" alt="+" className={s.fabIcon} />
          }
        >
          افزودن مناسبت
        </Button>
      )}

      <AddOccasionSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
