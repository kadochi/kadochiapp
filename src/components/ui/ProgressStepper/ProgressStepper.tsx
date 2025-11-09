"use client";

import React from "react";
import s from "./ProgressStepper.module.css";

export type StepStatus = "todo" | "current" | "done" | "disabled";
export interface StepItem {
  label: string;
  status: StepStatus;
}

interface Props {
  steps: StepItem[];
  showIndex?: boolean;
  gap?: number;
  className?: string;
}

function cx(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function ProgressStepper({
  steps,
  showIndex = true,
  gap,
  className,
}: Props) {
  return (
    <div
      className={cx(s.root, className)}
      dir="rtl"
      style={
        gap
          ? ({ ["--ps-gap" as any]: `${gap}px` } as React.CSSProperties)
          : undefined
      }
    >
      {steps.map((step, i) => {
        const isRightmost = i === 0;
        const stateCls =
          step.status === "done"
            ? s.status_done
            : step.status === "current"
            ? s.status_current
            : step.status === "disabled"
            ? s.status_disabled
            : s.status_todo;

        return (
          <div key={i} className={cx(s.step, stateCls)}>
            <div className={s.circle}>
              {step.status === "done" ? (
                <svg className={s.check} viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M9.2 16.2 5.5 12.6l1.4-1.4 2.3 2.3 5.8-5.8 1.4 1.4z"
                    fill="currentColor"
                  />
                </svg>
              ) : showIndex ? (
                <span className={s.indexTxt}>{steps.length - i}</span>
              ) : null}
            </div>

            {!isRightmost && (
              <div
                className={cx(
                  s.divider,
                  step.status === "done" ? s.dividerActive : false
                )}
                aria-hidden
              />
            )}

            <div className={s.label} title={step.label}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
