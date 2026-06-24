"use client";

import React from "react";
import { cn } from "@/lib/cn";

export type StepStatus = "todo" | "current" | "done" | "disabled";
export interface StepItem { label: string; status: StepStatus; }

interface Props {
  steps: StepItem[];
  showIndex?: boolean;
  gap?: number;
  className?: string;
}

export default function ProgressStepper({
  steps, showIndex = true, gap, className,
}: Props) {
  const psGap = gap ? `${gap}px` : "clamp(56px,12vw,160px)";

  return (
    <div className={cn("inline-flex flex-row-reverse items-start w-full", className)} dir="rtl" style={{ columnGap: psGap }}>
      {steps.map((step, i) => {
        const isRightmost = i === 0;
        const circleCls = step.status === "done" ? "bg-secondary text-secondary-on"
          : step.status === "current" ? "[box-shadow:inset_0_0_0_2px_var(--secondary-secondary)] text-secondary"
          : step.status === "disabled" ? "bg-disable-container text-disable-on [box-shadow:inset_0_0_0_1px_var(--disable-disable)]"
          : "[box-shadow:inset_0_0_0_1px_var(--border-border-high-emphasis)] text-border-high";

        const labelCls = step.status === "current" ? "font-bold text-secondary"
          : step.status === "disabled" ? "text-disable-on"
          : "text-surface-neutral-high";

        return (
          <div key={i} className="relative grid grid-rows-[24px_auto] justify-items-center min-w-6 w-full">
            <div className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full box-border text-label-12 leading-label-12 font-bold bg-surface-background z-1", circleCls)}>
              {step.status === "done" ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
                  <path d="M9.2 16.2 5.5 12.6l1.4-1.4 2.3 2.3 5.8-5.8 1.4 1.4z" fill="currentColor" />
                </svg>
              ) : showIndex ? (
                <span className="translate-y-[-0.5px]">{steps.length - i}</span>
              ) : null}
            </div>

            {!isRightmost && (
              <div
                className={cn(
                  "absolute top-3 z-0 h-px",
                  step.status === "done" ? "bg-secondary" : "bg-border-high"
                )}
                style={{ insetInlineStart: "calc(100% + 12px)", width: `calc(${psGap} - 24px)` }}
                aria-hidden
              />
            )}

            <div className={cn("mt-2 text-label-12 leading-label-12 text-center whitespace-nowrap", labelCls)} title={step.label}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
