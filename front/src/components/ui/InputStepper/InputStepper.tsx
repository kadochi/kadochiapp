"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const stepperVariants = cva(
  "relative box-border flex items-center justify-center bg-surface-background rounded-rounded select-none tabular-nums text-surface-neutral-high",
  {
    variants: {
      type: {
        product: "h-14 min-w-36 p-4 border-2 border-primary",
        basket: "h-8 min-w-24 p-1 border-0",
      },
    },
    defaultVariants: { type: "product" },
  }
);

const valueVariants = cva("font-bold", {
  variants: {
    type: {
      product: "text-title-18 leading-title-18",
      basket: "text-title-14 leading-title-14",
    },
  },
  defaultVariants: { type: "product" },
});

export interface InputStepperProps {
  type?: "product" | "basket";
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  className?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
    <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
  </svg>
);
const MinusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
    <path fill="currentColor" d="M5 11h14v2H5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
    <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h2v8h-2V9z" />
  </svg>
);

export default function InputStepper({
  type = "product", value, min = 1, max, onChange, className, disabled, "aria-label": ariaLabel,
}: InputStepperProps) {
  const isMax = typeof max === "number" ? value >= max : false;
  const showTrash = value === 1;
  const decDisabled = disabled || value <= 0;
  const incDisabled = disabled || isMax;

  const decrement = () => {
    if (decDisabled) return;
    const next = value - 1;
    onChange(next < min ? 0 : next);
  };
  const increment = () => {
    if (incDisabled) return;
    onChange(typeof max === "number" ? Math.min(max, value + 1) : value + 1);
  };

  return (
    <div
      className={cn(stepperVariants({ type }), className)}
      role="group"
      aria-label={ariaLabel ?? "Stepper"}
      dir="rtl"
    >
      <button
        type="button"
        className={cn(
          "absolute inline-flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent cursor-pointer",
          type === "basket" && "bg-surface rounded-rounded",
          showTrash ? "text-error" : "",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        style={{ insetInlineEnd: type === "product" ? 16 : 4 }}
        onClick={decrement}
        disabled={decDisabled}
        aria-label={showTrash ? "Remove" : "Decrement"}
      >
        {showTrash ? <TrashIcon /> : <MinusIcon />}
      </button>

      <div className={cn(valueVariants({ type }))} aria-live="polite" aria-atomic="true">
        {value}
      </div>

      <button
        type="button"
        className={cn(
          "absolute inline-flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent cursor-pointer",
          type === "basket" && "bg-surface rounded-rounded",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        style={{ insetInlineStart: type === "product" ? 16 : 4 }}
        onClick={increment}
        disabled={incDisabled}
        aria-label="Increment"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
