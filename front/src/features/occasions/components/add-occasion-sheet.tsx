"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERSIAN_MONTHS, getPersianDateParts, getPersianMonthDates, movePersianMonth, toIsoDate } from "../utils/persian-calendar";

type AddOccasionSheetProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  onSubmit: (input: { title: string; occasionDate: string }) => Promise<void>;
};

export function AddOccasionSheet({ onOpenChange, open, onSubmit }: AddOccasionSheetProps) {
  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(() => getPersianDateParts(today), [today]);
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>();
  const [visibleMonth, setVisibleMonth] = useState({ month: initialDate.month, year: initialDate.year });
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(
    () => getPersianMonthDates(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  async function submit() {
    if (!title.trim() || !selectedDate) return;
    try {
      setSubmitting(true);
      await onSubmit({ occasionDate: selectedDate, title: title.trim() });
      setTitle("");
      setSelectedDate(undefined);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet onOpenChange={onOpenChange} open={open}>
      <BottomSheetContent
        aria-describedby={undefined}
        aria-label="افزودن مناسبت"
        footer={
          <div className="border-t border-border-low-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-8">
            <Button className="w-full" disabled={!title.trim() || !selectedDate} loading={submitting} onClick={() => void submit()} size="large" variant="secondary-filled">
              ثبت مناسبت
            </Button>
          </div>
        }
      >
        <BottomSheetHeader className="pb-8">
          <BottomSheetTitle className="m-0 font-sans text-title-18 font-bold text-surface-neutral-high-emphasis">
            افزودن مناسبت جدید
          </BottomSheetTitle>
        </BottomSheetHeader>

        <div className="grid gap-20 px-16 pb-24 [direction:rtl]">
          <Input label="عنوان مناسبت" onChange={(event) => setTitle(event.currentTarget.value)} placeholder="مثلاً تولد یک دوست" required value={title} />

          <section aria-label="انتخاب تاریخ مناسبت" className="grid gap-8">
            <p className="m-0 text-label-12 text-surface-neutral-mid-emphasis">انتخاب تاریخ مناسبت <span className="text-error">*</span></p>
            <div className="rounded-m border border-border-mid-emphasis bg-surface-soft p-8">
              <div className="mb-12 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
                <Button aria-label="ماه قبل" className="justify-self-start px-8" onClick={() => setVisibleMonth((current) => movePersianMonth(current.year, current.month, -1))} size="small" variant="link-ghost">
                  <ChevronRight aria-hidden /> ماه قبل
                </Button>
                <strong aria-live="polite" className="text-label-16 text-surface-neutral-high-emphasis">{PERSIAN_MONTHS[visibleMonth.month]} {visibleMonth.year}</strong>
                <Button aria-label="ماه بعد" className="justify-self-end px-8" onClick={() => setVisibleMonth((current) => movePersianMonth(current.year, current.month, 1))} size="small" variant="link-ghost">
                  ماه بعد <ChevronLeft aria-hidden />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-8" dir="ltr">
                {days.map((day) => {
                  const isoDate = toIsoDate(day);
                  const selected = isoDate === selectedDate;
                  return (
                    <button
                      aria-label={`روز ${getPersianDateParts(day).day} ${PERSIAN_MONTHS[visibleMonth.month]} ${visibleMonth.year}`}
                      aria-pressed={selected}
                      className="h-40 rounded-s border border-border-high-emphasis bg-surface-background font-sans text-label-14 text-surface-neutral-high-emphasis transition-colors hover:border-secondary aria-pressed:border-secondary aria-pressed:bg-secondary-container aria-pressed:font-bold"
                      key={isoDate}
                      onClick={() => setSelectedDate(isoDate)}
                      type="button"
                    >
                      {getPersianDateParts(day).day}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
