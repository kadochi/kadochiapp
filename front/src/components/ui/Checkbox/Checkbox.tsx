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
  onChange?: (checked: boolean) => void;
  className?: string;
};

export default function Checkbox({
  checked, defaultChecked, disabled, label, id, name, onChange, className,
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
          "inline-grid place-items-center w-6 h-6 shrink-0 rounded-s box-border border-[1.5px] border-solid transition-all duration-120",
          isChecked ? "bg-secondary-container border-secondary text-secondary-on-container" : "bg-surface-background border-border-high text-transparent",
          disabled ? "bg-disable-container border-disable text-disable-on" : ""
        )}
        aria-hidden
      >
        <svg className="w-4 h-4 block" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label ? <span className="text-label-12 leading-label-12 text-surface-neutral-high">{label}</span> : null}
      <input
        id={inputId} name={name} type="checkbox"
        className="absolute opacity-0 pointer-events-none w-px h-px"
        disabled={disabled}
        onChange={handleChange}
        {...(isControlled ? { checked: isChecked, readOnly: !onChange } : { defaultChecked: !!defaultChecked })}
      />
    </label>
  );
}
