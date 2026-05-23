"use client";

import React from "react";
import s from "./Checkbox.module.css";

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
  checked,
  defaultChecked,
  disabled,
  label,
  id,
  name,
  onChange,
  className,
}: Props) {
  // Uncontrolled internal state (used only when `checked` prop is NOT provided)
  const [internal, setInternal] = React.useState<boolean>(!!defaultChecked);

  const isControlled = typeof checked === "boolean";
  const isChecked = isControlled ? !!checked : internal;
  const inputId = id ?? React.useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e.target.checked);
  }

  // Build input props to avoid passing both `checked` and `defaultChecked`
  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
    id: inputId,
    name,
    type: "checkbox",
    className: s.input,
    disabled,
    onChange: handleChange,
    ...(isControlled
      ? { checked: isChecked, readOnly: !onChange } // controlled
      : { defaultChecked: !!defaultChecked }), // uncontrolled
  };

  return (
    <label className={`${s.wrapper} ${className ?? ""}`} htmlFor={inputId}>
      <span
        className={`${s.control} ${isChecked ? s.checked : ""} ${
          disabled ? s.disabled : ""
        }`}
        aria-hidden
      >
        {/* check glyph */}
        <svg
          className={s.icon}
          viewBox="0 0 24 24"
          aria-hidden
          focusable="false"
        >
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {label ? <span className={s.label}>{label}</span> : null}

      <input {...inputProps} />
    </label>
  );
}
