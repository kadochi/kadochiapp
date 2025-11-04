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
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isControlled = typeof checked === "boolean";
  const isChecked = isControlled ? !!checked : internal;
  const inputId = id ?? React.useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e.target.checked);
  }

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

      <input
        id={inputId}
        name={name}
        type="checkbox"
        className={s.input}
        checked={isChecked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={handleChange}
      />
    </label>
  );
}
