"use client";

import React from "react";
import { cn } from "@/lib/cn";

type Props = {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  name?: string;
  value?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
};

export default function Radio({
  checked, defaultChecked, disabled, label, id, name, value, onChange, className,
}: Props) {
  const [internal, setInternal] = React.useState<boolean>(!!defaultChecked);
  const isControlled = typeof checked === "boolean";
  const isChecked = isControlled ? !!checked : internal;
  const inputId = id ?? React.useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e.target.checked);
  }

  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none", className)} htmlFor={inputId}>
      <span
        className={cn(
          "inline-grid place-items-center w-6 h-6 rounded-full box-border border-[1.5px] border-solid transition-all duration-120",
          isChecked ? "bg-secondary-container border-secondary" : "bg-surface-background border-border-high",
          disabled ? "bg-disable-container border-disable" : ""
        )}
        aria-hidden
      >
        <span className={cn("w-4 h-4 rounded-full transition-colors duration-120", isChecked ? "bg-secondary" : "bg-transparent", disabled ? "bg-disable" : "")} />
      </span>
      {label ? <span className="text-label-12 leading-label-12 text-surface-neutral-high">{label}</span> : null}
      <input
        id={inputId} name={name} value={value} type="radio"
        className="absolute opacity-0 pointer-events-none"
        checked={isChecked} disabled={disabled}
        onChange={handleChange}
      />
    </label>
  );
}
