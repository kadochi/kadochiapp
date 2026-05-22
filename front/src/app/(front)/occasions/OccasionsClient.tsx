"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  dayjs,
  parseOccasionDate,
  todayJalali,
  toGregorianKey,
  PERSIAN_MONTHS as MONTHS,
  jsDayToFa,
} from "@/lib/jalali";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Button from "@/components/ui/Button/Button";
import { useSession } from "@/domains/auth/session-context";
import AddOccasionSheet from "./AddOccasionSheet";
import OccasionRow, { type DayRow } from "./OccasionRow";
import s from "./occasions.module.css";
import Header from "@/components/layout/Header/Header";

export type OccasionEntry = {
  title: string;
  variant: "public" | "private";
  id?: number;
};

export default function OccasionsClient({
  initialMap = {} as Record<string, OccasionEntry[]>,
  isLoggedInInitial = false,
  signinHref = "/login?redirect=/occasions",
}: {
  initialMap?: Record<string, OccasionEntry[]>;
  isLoggedInInitial?: boolean;
  signinHref?: string;
}) {
  const [wpMap, setWpMap] = useState<Record<string, OccasionEntry[]>>(
    initialMap,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const router = useRouter();
  const { session } = useSession();
  const isLoggedIn = !!session?.userId || isLoggedInInitial;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const tj = todayJalali();
  const [currentMonth, setCurrentMonth] = useState(() =>
    dayjs()
      .calendar("jalali")
      .year(tj.jy)
      .month(tj.jm - 1)
      .date(1),
  );

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [showFab, setShowFab] = useState(false);

  useEffect(() => {
    if (Object.keys(initialMap).length) return;
    const userId = session?.userId ?? null;

    const adminUrl =
      "/api/wp/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100";
    const userUrl = userId
      ? `/api/wp/wp-json/wp/v2/occasion?author=${userId}&acf_format=standard&per_page=100`
      : null;

    const fetchOpts = { cache: "no-store" as const };

    Promise.all([
      fetch(adminUrl, fetchOpts).then((r) => (r.ok ? r.json() : [])),
      userUrl
        ? fetch(userUrl, fetchOpts).then((r) => (r.ok ? r.json() : []))
        : Promise.resolve([]),
    ])
      .then(([adminData, userData]: [any[], any[]]) => {
        const m: Record<string, OccasionEntry[]> = {};

        const adminArr = Array.isArray(adminData) ? adminData : [];
        adminArr.forEach((it: any) => {
          const owner = it?.acf?.user_id;
          if (owner != null && owner !== "" && String(owner) !== "1") return;
          const d = parseOccasionDate(it?.acf?.occasion_date);
          const t = it?.acf?.title?.trim();
          if (!d || !t) return;
          (m[d] ||= []).push({ title: t, variant: "public" });
        });

        const userArr = Array.isArray(userData) ? userData : [];
        userArr.forEach((it: any) => {
          const d = parseOccasionDate(it?.acf?.occasion_date);
          const t = it?.acf?.title?.trim();
          if (!d || !t) return;
          const existing = m[d] ?? [];
          if (!existing.some((e) => e.title === t))
            (m[d] ||= []).push({ title: t, variant: "private", id: it?.id });
        });

        setWpMap((prev) => {
          const merged = { ...m };
          for (const k of Object.keys(prev)) {
            const existing = merged[k] ?? [];
            const fromPrev = prev[k] ?? [];
            const seen = new Set(existing.map((e) => e.title));
            const toAdd = fromPrev.filter((e) => !seen.has(e.title));
            merged[k] = [...existing, ...toAdd];
          }
          return merged;
        });
      })
      .catch(() => {});
  }, [initialMap, session?.userId]);

  useEffect(() => {
    if (Object.keys(initialMap).length === 0) return;
    setWpMap((prev) => {
      const merged: Record<string, OccasionEntry[]> = {};
      const allKeys = new Set([
        ...Object.keys(prev),
        ...Object.keys(initialMap),
      ]);
      for (const k of allKeys) {
        const fromPrev = prev[k] ?? [];
        const fromInitial = initialMap[k] ?? [];
        const seen = new Set(fromPrev.map((e) => e.title));
        const toAdd = fromInitial.filter((e) => !seen.has(e.title));
        merged[k] = [...fromPrev, ...toAdd];
      }
      return merged;
    });
  }, [initialMap]);

  const jy = currentMonth.year();
  const jm = currentMonth.month() + 1;

  const rows: DayRow[] = useMemo(() => {
    const out: DayRow[] = [];
    const monthName = MONTHS[jm];
    const msDay = 24 * 60 * 60 * 1000;
    const daysInMonth = currentMonth.daysInMonth();

    for (let jd = 1; jd <= daysInMonth; jd++) {
      const key = toGregorianKey(jy, jm, jd);
      const gDate = dayjs()
        .calendar("jalali")
        .year(jy)
        .month(jm - 1)
        .date(jd)
        .toDate();
      gDate.setHours(0, 0, 0, 0);

      const occasions = wpMap[key] ?? [];

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
        occasions,
        offset,
      });
    }
    return out;
  }, [wpMap, currentMonth, jy, jm, today]);

  const goPrevMonth = () =>
    setCurrentMonth((d) => d.subtract(1, "month").startOf("month"));

  const goNextMonth = () =>
    setCurrentMonth((d) => d.add(1, "month").startOf("month"));

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setShowFab(!entries[0].isIntersecting),
      { root: null, threshold: 0 },
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

  const handleDelete = async (dateKey: string, occ: OccasionEntry) => {
    if (occ.id == null) return;
    const res = await fetch(`/api/occasions/${occ.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error ?? "خطا در حذف مناسبت";
      alert(msg);
      return;
    }
    setWpMap((prev) => {
      const m = { ...prev };
      m[dateKey] = (m[dateKey] ?? []).filter(
        (e) => e.id !== occ.id || e.title !== occ.title
      );
      return m;
    });
    router.refresh();
  };

  const handleCreate = async (data: {
    title: string;
    date: string;
    repeatYearly: boolean;
  }) => {
    const res = await fetch("/api/occasions/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error ?? "خطا در ثبت مناسبت";
      alert(msg);
      throw new Error(msg);
    }

    const body = await res.json().catch(() => ({}));
    const createdId = body?.id;

    setWpMap((prev) => {
      const m = { ...prev };
      (m[data.date] ||= []).push({
        title: data.title,
        variant: "private",
        id: createdId,
      });
      return m;
    });

    router.refresh();

    const jParts = dayjs(data.date).calendar("jalali");
    const addedJy = jParts.year();
    const addedJm = jParts.month() + 1;
    if (addedJy !== jy || addedJm !== jm) {
      setCurrentMonth(
        dayjs()
          .calendar("jalali")
          .year(addedJy)
          .month(addedJm - 1)
          .date(1),
      );
    }
  };

  return (
    <>
      <Header />
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
            <OccasionRow
              key={row.key}
              row={row}
              showDivider={idx !== rows.length - 1}
              onDelete={handleDelete}
            />
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
