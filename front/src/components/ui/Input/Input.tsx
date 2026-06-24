"use client";

import React from "react";
import { cn } from "@/lib/cn";

type MsgType = "hint" | "error" | "success";

export type InputProps = {
  id?: string; name?: string; type?: React.HTMLInputTypeAttribute;
  value?: string; defaultValue?: string; placeholder?: string;
  disabled?: boolean; required?: boolean;
  showLabel?: boolean; showMessage?: boolean;
  label?: string; message?: string; messageType?: MsgType;
  icon?: React.ReactNode;
  dir?: "rtl" | "ltr" | "auto";
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  pattern?: string;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
};

const HintIcon = () => (
  <svg className="inline-flex w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);
const SuccessIcon = () => (
  <svg className="inline-flex w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const ErrorIcon = () => (
  <svg className="inline-flex w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export default function Input({
  id, name, type = "text", value, defaultValue, placeholder, disabled, required,
  showLabel = true, showMessage = true, label, message, messageType = "hint",
  icon, dir = "rtl", onChange, onFocus, onBlur, className, inputMode, autoComplete, pattern, enterKeyHint,
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const controlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const val = controlled ? value ?? "" : uncontrolled;
  const filled = !!val && !disabled;
  const state = disabled ? "disable" : focused ? "focused" : filled ? "filled" : "default";

  const IconMap: Record<string, React.ReactNode> = { hint: <HintIcon />, success: <SuccessIcon />, error: <ErrorIcon /> };

  const controlBorder = messageType === "error" && !disabled ? "border-error"
    : messageType === "success" && !disabled ? "border-success"
    : state === "focused" ? "border-primary border-[1.5px] [box-shadow:0_0_0_2px_var(--primary-primary-container)]"
    : state === "disable" ? "bg-disable-container border-disable cursor-not-allowed"
    : state === "filled" ? "border-surface-neutral-mid"
    : "border-border-high";

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
          "box-border inline-flex flex-row-reverse items-center gap-2 w-full h-14 px-4 rounded-lg bg-surface-background border border-solid transition-all duration-150",
          controlBorder
        )}
        dir={dir}
      >
        <input
          id={id} name={name} type={type}
          className={cn(
            "appearance-none border-0 outline-0 bg-transparent w-full h-full font-sans text-label-16 leading-label-16",
            filled ? "text-surface-neutral-high" : "text-surface-neutral-mid",
            "placeholder:text-surface-neutral-mid/80",
            icon && "pe-6"
          )}
          value={controlled ? value : undefined}
          defaultValue={controlled ? undefined : defaultValue}
          placeholder={placeholder} disabled={disabled} required={required}
          onChange={(e) => { if (!controlled) setUncontrolled(e.target.value); onChange?.(e); }}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          aria-invalid={messageType === "error" ? true : undefined}
          inputMode={inputMode} autoComplete={autoComplete} pattern={pattern} enterKeyHint={enterKeyHint}
        />
        {icon ? <span className="inline-flex items-center justify-center w-4 h-4 text-surface-neutral-mid pointer-events-none shrink-0">{icon}</span> : null}
      </div>

      {showMessage && message ? (
        <div className={cn("inline-flex items-center gap-1 text-label-12 leading-label-12", messageType === "error" ? "text-error" : messageType === "success" ? "text-success" : "text-surface-neutral-mid")}>
          {IconMap[messageType]}
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
