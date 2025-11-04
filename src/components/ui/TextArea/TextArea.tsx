"use client";

import React from "react";
import s from "./TextArea.module.css";

type State = "default" | "focused" | "filled" | "disable";
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

export default function TextArea({
  id,
  name,
  value,
  defaultValue,
  placeholder,
  disabled,
  required,

  showLabel = true,
  label,

  showMessage = true,
  message,
  messageType = "hint",

  icon,

  dir = "rtl",
  rows = 4,

  showCounter = false,
  maxLength,

  onChange,
  onFocus,
  onBlur,
  className,
}: TextAreaProps) {
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

  const length = (val ?? "").length;

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
        <textarea
          id={id}
          name={name}
          className={s.textarea}
          value={controlled ? value : undefined}
          defaultValue={controlled ? undefined : defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          maxLength={maxLength}
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
        />
        {icon ? <span className={s.icon}>{icon}</span> : null}
      </div>

      {(showMessage && message) || showCounter ? (
        <div className={s.bottomRow}>
          {showMessage && message ? (
            <div className={s.message}>
              {IconMap[messageType]}
              <span>{message}</span>
            </div>
          ) : (
            <span />
          )}
          {showCounter ? (
            <div className={s.counter}>
              {maxLength !== undefined
                ? `${length} / ${maxLength}`
                : `${length}`}
            </div>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
