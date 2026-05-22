"use client";

import React from "react";
import s from "./Input.module.css";

type State = "default" | "focused" | "filled" | "disable";
type MsgType = "hint" | "error" | "success";

export type InputProps = {
  id?: string;
  name?: string;
  type?: React.HTMLInputTypeAttribute;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showLabel?: boolean;
  showMessage?: boolean;
  label?: string;
  message?: string;
  messageType?: MsgType;
  icon?: React.ReactNode;
  dir?: "rtl" | "ltr" | "auto";
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;

  /** Native HTML input helpers (for better keyboards & autofill) */
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  pattern?: string;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
};

function cx(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(" ");
}

const HintIcon = () => (
  <svg className={s.messageIcon} viewBox="0 0 24 24" aria-hidden>
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="12"
      y1="8"
      x2="12"
      y2="12"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);
const SuccessIcon = () => (
  <svg className={s.messageIcon} viewBox="0 0 24 24" aria-hidden>
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M8.5 12.5l2.5 2.5 4.5-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);
const ErrorIcon = () => (
  <svg className={s.messageIcon} viewBox="0 0 24 24" aria-hidden>
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="12"
      y1="8"
      x2="12"
      y2="13"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export default function Input({
  id,
  name,
  type = "text",
  value,
  defaultValue,
  placeholder,
  disabled,
  required,
  showLabel = true,
  showMessage = true,
  label,
  message,
  messageType = "hint",
  icon,
  dir = "rtl",
  onChange,
  onFocus,
  onBlur,
  className,
  inputMode,
  autoComplete,
  pattern,
  enterKeyHint,
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const controlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const val = controlled ? value ?? "" : uncontrolled;

  const filled = !!val && !disabled;
  const state: State = disabled
    ? "disable"
    : focused
    ? "focused"
    : filled
    ? "filled"
    : "default";

  const IconMap = {
    hint: <HintIcon />,
    success: <SuccessIcon />,
    error: <ErrorIcon />,
  };

  return (
    <div
      className={cx(s.root, className)}
      data-state={state}
      data-message={messageType}
    >
      {showLabel && label ? (
        <label htmlFor={id} className={s.label}>
          <span className={s.labelText}>{label}</span>
          {required ? <span className={s.requiredMark}>*</span> : null}
        </label>
      ) : null}

      <div className={s.control} data-has-icon={!!icon} dir={dir}>
        <input
          id={id}
          name={name}
          type={type}
          className={s.input}
          value={controlled ? value : undefined}
          defaultValue={controlled ? undefined : defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={(e) => {
            if (!controlled) setUncontrolled(e.target.value);
            onChange?.(e);
          }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          aria-invalid={messageType === "error" ? true : undefined}
          /** passthroughs for better mobile UX */
          inputMode={inputMode}
          autoComplete={autoComplete}
          pattern={pattern}
          enterKeyHint={enterKeyHint}
        />
        {icon ? <span className={s.icon}>{icon}</span> : null}
      </div>

      {showMessage && message ? (
        <div className={s.message}>
          {IconMap[messageType]}
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
