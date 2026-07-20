"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";

import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { PERSIAN_MONTHS, getPersianDateParts, getPersianMonthDates, toIsoDate } from "@/features/occasions/utils/persian-calendar";

type PersianBirthdayPickerProps = {
  onChange: (value: string) => void;
  value: string;
};

type PickerStep = "year" | "month" | "day";
type DraftDate = { year?: number; month?: number };

const minimumYear = 1280;
const persianNumber = new Intl.NumberFormat("fa-IR", { useGrouping: false });

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatPersianDate(value: string) {
  if (!value) return "انتخاب تاریخ تولد";
  const { day, month, year } = getPersianDateParts(dateFromIso(value));
  return `${persianNumber.format(day)} ${PERSIAN_MONTHS[month]} ${persianNumber.format(year)}`;
}

const stepDetails: Record<PickerStep, { title: string; indicator: string }> = {
  year: { title: "سال تولد", indicator: "۱ از ۳" },
  month: { title: "ماه تولد", indicator: "۲ از ۳" },
  day: { title: "روز تولد", indicator: "۳ از ۳" },
};

export function PersianBirthdayPicker({ onChange, value }: PersianBirthdayPickerProps) {
  const today = useMemo(() => new Date(), []);
  const currentPersianDate = useMemo(() => getPersianDateParts(today), [today]);
  const currentYear = currentPersianDate.year;
  const years = useMemo(() => Array.from({ length: currentYear - minimumYear + 1 }, (_, index) => currentYear - index), [currentYear]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("year");
  const [draft, setDraft] = useState<DraftDate>({});
  const days = useMemo(() => draft.year && draft.month ? getPersianMonthDates(draft.year, draft.month) : [], [draft.month, draft.year]);

  function openPicker() {
    const selected = value ? getPersianDateParts(dateFromIso(value)) : undefined;
    setDraft(selected ? { month: selected.month, year: selected.year } : {});
    setStep("year");
    setOpen(true);
  }

  function goBack() {
    if (step === "year") {
      setOpen(false);
      return;
    }
    setStep(step === "month" ? "year" : "month");
  }

  function chooseYear(year: number) {
    setDraft({ year });
    setStep("month");
  }

  function chooseMonth(month: number) {
    setDraft((current) => ({ ...current, month }));
    setStep("day");
  }

  function chooseDay(date: Date) {
    onChange(toIsoDate(date));
    setOpen(false);
  }

  const detail = stepDetails[step];

  return (
    <>
      <div className="grid w-full gap-8">
        <span className="text-label-12 font-regular text-surface-neutral-mid-emphasis">تاریخ تولد</span>
        <button aria-haspopup="dialog" className="flex h-56 w-full items-center gap-12 rounded-m border border-border-high-emphasis bg-surface-background px-16 text-right font-sans text-label-16 text-surface-neutral-high-emphasis transition-[border-color,box-shadow] hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25" onClick={openPicker} type="button">
          <CalendarDays aria-hidden className="size-20 shrink-0 text-surface-neutral-mid-emphasis" />
          <span className={value ? "flex-1" : "flex-1 text-surface-neutral-mid-emphasis"}>{formatPersianDate(value)}</span>
          <ChevronLeft aria-hidden className="size-20 shrink-0 text-surface-neutral-mid-emphasis" />
        </button>
      </div>

      <BottomSheet onOpenChange={setOpen} open={open}>
        <BottomSheetContent aria-describedby="birthday-step-description">
          <BottomSheetHeader className="flex-row items-center justify-between gap-8">
            <Button aria-label="بازگشت" className="px-8" onClick={goBack} size="small" variant="link-ghost"><ChevronRight aria-hidden /> بازگشت</Button>
            <div className="grid justify-items-center gap-2 text-center">
              <BottomSheetTitle className="m-0 font-sans text-title-18 font-bold text-surface-neutral-high-emphasis">{detail.title}</BottomSheetTitle>
              <span className="text-label-12 text-surface-neutral-mid-emphasis" id="birthday-step-description">{detail.indicator}</span>
            </div>
            {value ? <Button aria-label="پاک‌کردن تاریخ تولد" className="px-8 text-error" onClick={() => { onChange(""); setOpen(false); }} size="small" variant="link-ghost"><X aria-hidden /> پاک‌کردن</Button> : <span className="w-64" />}
          </BottomSheetHeader>

          <div className="px-16 pb-24 [direction:rtl]">
            {step === "year" ? <div className="grid grid-cols-4 gap-8">{years.map((year) => <button aria-pressed={draft.year === year} className="h-48 rounded-m border border-border-high-emphasis bg-surface-background font-sans text-label-14 text-surface-neutral-high-emphasis transition-colors hover:border-secondary aria-pressed:border-secondary aria-pressed:bg-secondary-container aria-pressed:font-bold" key={year} onClick={() => chooseYear(year)} type="button">{persianNumber.format(year)}</button>)}</div> : null}
            {step === "month" ? <div className="grid grid-cols-3 gap-8">{PERSIAN_MONTHS.slice(1).map((month, index) => { const monthNumber = index + 1; const isFutureMonth = draft.year === currentYear && monthNumber > currentPersianDate.month; return <button aria-pressed={draft.month === monthNumber} className="h-48 rounded-m border border-border-high-emphasis bg-surface-background px-8 font-sans text-label-14 text-surface-neutral-high-emphasis transition-colors hover:border-secondary aria-pressed:border-secondary aria-pressed:bg-secondary-container aria-pressed:font-bold disabled:cursor-not-allowed disabled:border-disable disabled:bg-disable-container disabled:text-on-disable" disabled={isFutureMonth} key={month} onClick={() => chooseMonth(monthNumber)} type="button">{month}</button>; })}</div> : null}
            {step === "day" ? <div className="grid grid-cols-5 gap-8">{days.map((date) => { const day = getPersianDateParts(date).day; const isFutureDay = date.getTime() > today.getTime(); return <button className="h-48 rounded-m border border-border-high-emphasis bg-surface-background font-sans text-label-14 text-surface-neutral-high-emphasis transition-colors hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:border-disable disabled:bg-disable-container disabled:text-on-disable" disabled={isFutureDay} key={toIsoDate(date)} onClick={() => chooseDay(date)} type="button">{persianNumber.format(day)}</button>; })}</div> : null}
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
