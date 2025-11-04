"use client";

import React from "react";
import s from "./Radio.module.css";

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
  checked,
  defaultChecked,
  disabled,
  label,
  id,
  name,
  value,
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
        <span className={s.dot} />
      </span>

      {label ? <span className={s.label}>{label}</span> : null}

      <input
        id={inputId}
        name={name}
        value={value}
        type="radio"
        className={s.input}
        checked={isChecked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={handleChange}
      />
    </label>
  );
}
