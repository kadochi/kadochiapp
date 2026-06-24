"use client";

import Link from "next/link";
import Button from "@/components/ui/Button/Button";
import { cn } from "@/lib/cn";

type Props = {
  day: string;
  month: string;
  title: string;
  remainingDays: number;
  variant?: "public" | "private";
};

export default function OccasionCart({
  day,
  month,
  title,
  remainingDays,
  variant = "public",
}: Props) {
  const isUrgent = remainingDays < 8;
  const showRemainingDays = remainingDays > 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center p-4 pb-3 min-h-[176px] rounded-xl lg:min-h-[200px]",
        variant === "private"
          ? "bg-[var(--primary-primary-container)]"
          : "bg-[var(--surface-surface-soft)]",
      )}
      data-variant={variant}
    >
      <div className="text-[var(--fs-heading-24)] leading-[var(--lh-heading-24)] font-bold text-[var(--surface-neutral-high-emphasis)] text-center">
        {day}
      </div>
      <div className="text-[var(--fs-label-14)] leading-[var(--lh-label-14)] text-[var(--surface-neutral-mid-emphasis)] text-center">
        {month}
      </div>
      <div className="text-[var(--fs-label-14)] leading-[var(--lh-label-14)] font-bold text-[var(--surface-neutral-high-emphasis)] text-center mt-3">
        {title}
      </div>

      {showRemainingDays && (
        <div
          className={cn(
            "text-[var(--fs-label-12)] leading-[var(--lh-label-12)] text-center mt-2 mb-4",
            isUrgent
              ? "text-[var(--error-error)] font-bold"
              : "text-[var(--surface-neutral-mid-emphasis)]",
          )}
        >
          {remainingDays} روز مانده
        </div>
      )}

      <Button
        className={cn(!showRemainingDays && "mt-6")}
        as={Link as any}
        href="/products"
        type="link"
        style="ghost"
        size="small"
        trailingIcon={<img src="/icons/chevron-left-black.svg" alt="" />}
        aria-label="خرید کادو"
      >
        خرید کادو
      </Button>
    </div>
  );
}
