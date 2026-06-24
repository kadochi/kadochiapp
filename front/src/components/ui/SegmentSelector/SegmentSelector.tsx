"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const segmentVariants = cva("", {
  variants: {},
});

export type SegmentItem = { id: string; label: string };

type Props = {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export default function SegmentSelector({
  items,
  value,
  onChange,
  className,
}: Props) {
  return (
    <div className={cn("flex", className)} role="radiogroup" dir="rtl">
      {items.map((it, idx) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={cn(
              "flex-1 px-4 py-2 text-center text-sm cursor-pointer border border-solid border-border-mid transition-colors",
              "first:rounded-r-s last:rounded-l-s",
              idx !== 0 && "-ms-px",
              active
                ? "bg-primary text-primary-on border-primary z-10"
                : "bg-surface-background text-surface-neutral-high hover:bg-surface-surface"
            )}
            onClick={() => onChange(it.id)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
