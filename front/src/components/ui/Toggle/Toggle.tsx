"use client";

import React from "react";
import { cn } from "@/lib/cn";

export type ToggleProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
};

export default function Toggle(props: ToggleProps) {
  const { checked: controlled, defaultChecked, onChange, disabled, label, id, className } = props;
  const [uncontrolled, setUncontrolled] = React.useState<boolean>(!!defaultChecked);
  const isControlled = controlled !== undefined;
  const checked = isControlled ? !!controlled : uncontrolled;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setUncontrolled(e.target.checked);
    onChange?.(e.target.checked);
  }

  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none", className)}>
      <input
        id={id}
        type="checkbox"
        className="absolute opacity-0 pointer-events-none"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      <span
        className={cn(
          "relative inline-flex items-center w-14 h-8 rounded-rounded overflow-hidden transition-colors duration-120 ease-out",
          checked
            ? "bg-secondary text-secondary"
            : "bg-surface text-border-high [box-shadow:inset_0_0_0_1.5px_var(--border-border-high-emphasis),0_0_0_2px_color-mix(in_oklab,var(--secondary-secondary)_10%,transparent)]",
          disabled && "bg-disable-container text-disable cursor-not-allowed [box-shadow:inset_0_0_0_1.5px_var(--disable-disable)]"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute w-6 h-6 rounded-rounded top-1 transition-all duration-120 ease-out",
            checked
              ? "left-1 right-auto bg-secondary-on"
              : "right-1 left-auto bg-disable",
            disabled && "bg-disable"
          )}
        />
      </span>
      {label ? (
        <span className="text-label-12 leading-label-12 text-surface-neutral-high">{label}</span>
      ) : null}
    </label>
  );
}
