"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Occasion } from "@/features/occasions/types";
import { PERSIAN_MONTHS, getPersianDateParts, getPersianMonthDates, movePersianMonth, toIsoDate } from "../utils/persian-calendar";

type AddOccasionSheetProps = {
  occasion?: Occasion | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  deleting?: boolean;
  onDelete?: () => Promise<void>;
  onSubmit: (input: { title: string; occasionDate: string; repeatsAnnually: boolean }) => Promise<void>;
};

export function AddOccasionSheet({ occasion, onOpenChange, open, deleting = false, onDelete, onSubmit }: AddOccasionSheetProps) {
  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(() => getPersianDateParts(today), [today]);
  const selectedOccasionDate = occasion ? new Date(`${occasion.occasionDate}T00:00:00`) : null;
  const occasionDateParts = selectedOccasionDate ? getPersianDateParts(selectedOccasionDate) : initialDate;
  const [title, setTitle] = useState(occasion?.title ?? "");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(occasion?.occasionDate);
  const [repeatsAnnually, setRepeatsAnnually] = useState(occasion?.repeatsAnnually ?? true);
  const [visibleMonth, setVisibleMonth] = useState({ month: occasionDateParts.month, year: occasionDateParts.year });
  const [submitting, setSubmitting] = useState(false);
  const editing = Boolean(occasion);

  const days = useMemo(
    () => getPersianMonthDates(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  async function submit() {
    if (!title.trim() || !selectedDate) return;
    try {
      setSubmitting(true);
      await onSubmit({ occasionDate: selectedDate, repeatsAnnually, title: title.trim() });
      setTitle("");
      setSelectedDate(undefined);
      setRepeatsAnnually(true);
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
          <div className="flex items-center gap-12 border-t border-border-low-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-8">
            {editing && onDelete ? (
              <Button aria-label="حذف مناسبت" className="size-56 shrink-0 px-0 text-error" loading={deleting} onClick={() => void onDelete()} size="large" title="حذف مناسبت" variant="tertiary-outline">
                <Trash2 aria-hidden />
              </Button>
            ) : null}
            <Button className="flex-1" disabled={!title.trim() || !selectedDate || deleting} loading={submitting} onClick={() => void submit()} size="large" variant="secondary-filled">
              {editing ? "ذخیره تغییرات" : "ثبت مناسبت"}
            </Button>
          </div>
        }
      >
        <BottomSheetHeader className="pb-8">
          <BottomSheetTitle className="m-0 font-sans text-title-18 font-bold text-surface-neutral-high-emphasis">
            {editing ? "ویرایش مناسبت" : "افزودن مناسبت جدید"}
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
                      className="h-40 rounded-m border border-border-high-emphasis bg-surface-background font-sans text-label-14 text-surface-neutral-high-emphasis transition-colors hover:border-secondary aria-pressed:border-secondary aria-pressed:bg-secondary-container aria-pressed:font-bold"
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

          <Checkbox
            checked={repeatsAnnually}
            label="این مناسبت هر سال تکرار شود."
            onCheckedChange={setRepeatsAnnually}
          />
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
