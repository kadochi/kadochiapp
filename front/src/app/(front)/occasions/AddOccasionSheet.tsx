"use client";

import { useMemo, useState, useCallback } from "react";
import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";
import Checkbox from "@/components/ui/Checkbox/Checkbox";
import {
  dayjs,
  todayJalali,
  toGregorianKey,
  PERSIAN_MONTHS,
  persianDigits,
} from "@/lib/jalali";
import s from "./OccasionSheet.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    title: string;
    date: string; // YYYY-MM-DD
    repeatYearly: boolean;
  }) => Promise<void> | void;
};

export default function AddOccasionSheet({ isOpen, onClose, onSubmit }: Props) {
  const tj = todayJalali();
  const [currentMonth, setCurrentMonth] = useState(() =>
    dayjs().calendar("jalali").year(tj.jy).month(tj.jm - 1).date(1),
  );
  const [title, setTitle] = useState<string>("");
  const [selected, setSelected] = useState<{
    jy: number;
    jm: number;
    jd: number;
  } | null>(null);
  const [repeatYearly, setRepeatYearly] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jy = currentMonth.year();
  const jm = currentMonth.month() + 1;

  const gridDays = useMemo(() => {
    const days: number[] = [];
    const count = currentMonth.daysInMonth();
    for (let d = 1; d <= count; d++) {
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  const monthTitle = `${PERSIAN_MONTHS[jm]} ${persianDigits(String(jy))}`;

  const goPrev = () =>
    setCurrentMonth((d) => d.subtract(1, "month").startOf("month"));

  const goNext = () =>
    setCurrentMonth((d) => d.add(1, "month").startOf("month"));

  const isSelected = (d: number) =>
    !!selected && selected.jy === jy && selected.jm === jm && selected.jd === d;

  const canSubmit = title.trim().length > 0 && !!selected;

  const submit = useCallback(async () => {
    if (!canSubmit || isSubmitting || !selected) return;
    const iso = toGregorianKey(selected.jy, selected.jm, selected.jd);
    setIsSubmitting(true);
    try {
      await onSubmit?.({ title: title.trim(), date: iso, repeatYearly });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    isSubmitting,
    selected,
    onSubmit,
    onClose,
    title,
    repeatYearly,
  ]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} ariaLabel="افزودن مناسبت">
      <div className={s.sheetHeader}>
        <SectionHeader title="افزودن مناسبت جدید" as="h3" />
      </div>

      <div className={s.sheetBody} dir="rtl">
        <Input
          className={s.input}
          placeholder="مثلاً تولد یک دوست"
          showLabel
          label="عنوان مناسبت"
          value={title}
          required
          onChange={(e) => setTitle(e.currentTarget.value)}
        />

        <div className={s.fieldLabel}>
          <span>انتخاب تاریخ مناسبت</span>
          <span className={s.star} aria-hidden>
            *
          </span>
        </div>

        <div className={s.calendarWrap} role="group" aria-label="تاریخ مناسبت">
          <div className={s.calHeader}>
            <Button
              as="button"
              type="link"
              style="ghost"
              size="small"
              className={s.navBtn}
              onClick={goPrev}
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

            <div className={s.calTitle} aria-live="polite">
              {monthTitle}
            </div>

            <Button
              as="button"
              type="link"
              style="ghost"
              size="small"
              className={s.navBtn}
              onClick={goNext}
              aria-label="ماه بعد"
              trailingIcon={
                <img
                  src="/icons/chevron-left-thin.svg"
                  alt=""
                  aria-hidden="true"
                />
              }
            >
              ماه بعد
            </Button>
          </div>

          <div className={s.daysGrid}>
            {gridDays.map((d) => {
              const label = persianDigits(String(d).padStart(2, "0"));
              const selectedCls = isSelected(d) ? s.daySelected : "";
              return (
                <button
                  key={d}
                  type="button"
                  className={`${s.dayBtn} ${selectedCls}`}
                  onClick={() => setSelected({ jy, jm, jd: d })}
                  aria-pressed={isSelected(d)}
                  aria-label={`روز ${label} ${
                    PERSIAN_MONTHS[jm]
                  } ${persianDigits(String(jy))}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Checkbox
          checked={repeatYearly}
          onChange={setRepeatYearly}
          label="مناسبت هر سال تکرار شود."
          className={s.checkbox}
        />
      </div>

      <div className={s.sheetFooter}>
        <Button
          type="secondary"
          style="filled"
          size="large"
          onClick={submit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "در حال ثبت..." : "ثبت مناسبت"}
        </Button>
      </div>
    </BottomSheet>
  );
}
