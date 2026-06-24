"use client";

import React from "react";
import { cn } from "@/lib/cn";

type MsgType = "hint" | "error" | "success";

export type TextAreaProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showLabel?: boolean;
  label?: string;
  showMessage?: boolean;
  message?: string;
  messageType?: MsgType;
  icon?: React.ReactNode;
  dir?: "rtl" | "ltr" | "auto";
  rows?: number;
  showCounter?: boolean;
  maxLength?: number;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  onFocus?: React.FocusEventHandler<HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
  className?: string;
};

const HintIcon = () => (
  <svg className="inline-flex items-center justify-center w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);
const SuccessIcon = () => (
  <svg className="inline-flex items-center justify-center w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const ErrorIcon = () => (
  <svg className="inline-flex items-center justify-center w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export default function TextArea({
  id, name, value, defaultValue, placeholder, disabled, required,
  showLabel = true, label,
  showMessage = true, message, messageType = "hint",
  icon, dir = "rtl", rows = 4,
  showCounter = false, maxLength,
  onChange, onFocus, onBlur, className,
}: TextAreaProps) {
  const [focused, setFocused] = React.useState(false);
  const controlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const val = controlled ? value ?? "" : uncontrolled;
  const filled = !!val && !disabled;
  const state: string = disabled ? "disable" : focused ? "focused" : filled ? "filled" : "default";
  const length = (val ?? "").length;

  const IconMap: Record<string, React.ReactNode> = { hint: <HintIcon />, success: <SuccessIcon />, error: <ErrorIcon /> };

  const stateStyles = state === "focused"
    ? "border-primary border-[1.5px] [box-shadow:0_0_0_2px_var(--primary-primary-container)]"
    : state === "disable"
    ? "bg-disable-container border-disable cursor-not-allowed"
    : "border-border-high";

  const msgBorder = !disabled && (messageType === "error" ? "border-error" : messageType === "success" ? "border-success" : "");

  return (
    <div className={cn("grid gap-2", className)}>
      {showLabel && label ? (
        <label htmlFor={id} className="inline-flex items-baseline gap-1 text-label-12 leading-label-12 text-surface-neutral-mid">
          <span className="whitespace-nowrap">{label}</span>
          {required ? <span className="text-error">*</span> : null}
        </label>
      ) : null}

      <div
        className={cn(
          "box-border inline-flex flex-row-reverse items-start gap-2 w-full min-h-[120px] p-4 rounded-lg bg-surface-background border border-solid transition-all duration-150",
          stateStyles,
          msgBorder
        )}
        dir={dir}
      >
        <textarea
          id={id} name={name}
          className="appearance-none border-0 outline-0 bg-transparent w-full min-h-[88px] font-sans text-label-16 leading-label-16 text-surface-neutral-mid placeholder:text-surface-neutral-mid/80 resize-vertical"
          value={controlled ? value : undefined}
          defaultValue={controlled ? undefined : defaultValue}
          placeholder={placeholder} disabled={disabled} required={required}
          rows={rows} maxLength={maxLength}
          onChange={(e) => { if (!controlled) setUncontrolled(e.target.value); onChange?.(e); }}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          aria-invalid={messageType === "error" ? true : undefined}
        />
        {icon ? <span className="inline-flex items-center justify-center w-4 h-4 text-surface-neutral-mid mt-0.5 pointer-events-none">{icon}</span> : null}
      </div>

      {(showMessage && message) || showCounter ? (
        <div className="flex items-center justify-between mt-1">
          {showMessage && message ? (
            <div className={cn("inline-flex items-center gap-1 text-label-12 leading-label-12", messageType === "error" ? "text-error" : messageType === "success" ? "text-success" : "text-surface-neutral-mid")}>
              {IconMap[messageType]}
              <span>{message}</span>
            </div>
          ) : <span />}
          {showCounter ? (
            <div className="text-label-12 leading-label-12 text-surface-neutral-mid">
              {maxLength !== undefined ? `${length} / ${maxLength}` : `${length}`}
            </div>
          ) : <span />}
        </div>
      ) : null}
    </div>
  );
}
