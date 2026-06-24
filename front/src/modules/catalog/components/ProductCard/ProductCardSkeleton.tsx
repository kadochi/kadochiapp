"use client";

import React from "react";

export default function ProductCardSkeleton() {
  return (
    <div className="w-full block pointer-events-none" dir="rtl" aria-hidden>
      <div className="relative grid place-items-center w-full aspect-[1/1.2] overflow-hidden rounded-[16px]">
        <div className="w-20 h-[104px] rounded-[16px] mx-auto bg-gradient-to-r from-[var(--surface-surface-soft)] via-[var(--surface-surface-dim)] to-[var(--surface-surface-soft)] bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />
      </div>

      <div className="px-4 pb-4 pt-2 text-center">
        <div className="rounded-[var(--radius-rounded)] h-[1.4em] bg-gradient-to-r from-[var(--surface-surface-soft)] via-[var(--surface-surface-dim)] to-[var(--surface-surface-soft)] bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] mx-auto w-[58%] mt-2" />
        <div className="rounded-[var(--radius-rounded)] h-[1.4em] bg-gradient-to-r from-[var(--surface-surface-soft)] via-[var(--surface-surface-dim)] to-[var(--surface-surface-soft)] bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] mx-auto w-[72%] mt-1" />
        <div className="rounded-[var(--radius-rounded)] h-[1.4em] bg-gradient-to-r from-[var(--surface-surface-soft)] via-[var(--surface-surface-dim)] to-[var(--surface-surface-soft)] bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] mx-auto w-[44%] mt-2" />
      </div>
    </div>
  );
}
