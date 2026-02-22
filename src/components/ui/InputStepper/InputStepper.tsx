// src/components/ui/InputStepper/InputStepper.tsx
"use client";

import React from "react";
import s from "./InputStepper.module.css";

type StepperType = "product" | "basket";

export interface InputStepperProps {
  type?: StepperType;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  className?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

import { Plus, Minus, Trash2 } from "lucide-react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function InputStepper({
  type = "product",
  value,
  min = 1,
  max,
  onChange,
  className,
  disabled,
  "aria-label": ariaLabel,
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
      className={cx(
        s.root,
        type === "product" ? s.variantProduct : s.variantBasket,
        className,
      )}
      role="group"
      aria-label={ariaLabel ?? "Stepper"}
      data-state={showTrash ? "minimum" : isMax ? "maximum" : "active"}
      dir="rtl"
    >
      <button
        type="button"
        className={cx(s.ctrl, s.ctrlMinus, showTrash ? s.asTrash : s.asMinus)}
        onClick={decrement}
        disabled={decDisabled}
        aria-label={showTrash ? "Remove" : "Decrement"}
      >
        {showTrash ? <Trash2 size={20} /> : <Minus size={20} />}
      </button>

      <div className={s.value} aria-live="polite" aria-atomic="true">
        {value}
      </div>

      <button
        type="button"
        className={cx(s.ctrl, s.ctrlPlus, s.asPlus)}
        onClick={increment}
        disabled={incDisabled}
        aria-label="Increment"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
