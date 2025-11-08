"use client";

import { useMemo, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";
import Checkbox from "@/components/ui/Checkbox/Checkbox";
import { toGregorian, toJalaali } from "jalaali-js";
import s from "./OccasionSheet.module.css";

const PERSIAN_MONTHS = [
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

const persianDigits = (numStr: string) =>
  numStr.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    title: string;
    date: string; // YYYY-MM-DD
    repeatYearly: boolean;
  }) => void;
};

export default function AddOccasionSheet({ isOpen, onClose, onSubmit }: Props) {
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

  const [title, setTitle] = useState<string>("");
  const [jy, setJy] = useState<number>(tj.jy);
  const [jm, setJm] = useState<number>(tj.jm);
  const [selected, setSelected] = useState<{
    jy: number;
    jm: number;
    jd: number;
  } | null>(null);
  const [repeatYearly, setRepeatYearly] = useState<boolean>(true);

  const gridDays = useMemo(() => {
    const days: number[] = [];
    for (let d = 1; d <= 31; d++) {
      const g = toGregorian(jy, jm, d);
      const back = toJalaali(g.gy, g.gm, g.gd);
      if (back.jy === jy && back.jm === jm && back.jd === d) days.push(d);
    }
    return days;
  }, [jy, jm]);

  const monthTitle = `${PERSIAN_MONTHS[jm]} ${persianDigits(String(jy))}`;

  const goPrev = () => {
    if (jm === 1) {
      setJy((y) => y - 1);
      setJm(12);
    } else setJm((m) => m - 1);
  };
  const goNext = () => {
    if (jm === 12) {
      setJy((y) => y + 1);
      setJm(1);
    } else setJm((m) => m + 1);
  };

  const isSelected = (d: number) =>
    !!selected && selected.jy === jy && selected.jm === jm && selected.jd === d;

  const canSubmit = title.trim().length > 0 && !!selected;

  const submit = () => {
    if (!canSubmit) return;
    const { gy, gm, gd } = toGregorian(
      selected!.jy,
      selected!.jm,
      selected!.jd
    );
    const iso = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(
      2,
      "0"
    )}`;
    onSubmit?.({ title: title.trim(), date: iso, repeatYearly });
    onClose();
  };

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
          disabled={!canSubmit}
        >
          ثبت مناسبت
        </Button>
      </div>
    </BottomSheet>
  );
}
