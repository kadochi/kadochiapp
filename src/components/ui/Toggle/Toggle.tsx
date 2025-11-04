"use client";

import React from "react";
import s from "./Toggle.module.css";

export type ToggleProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
};

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Toggle(props: ToggleProps) {
  const {
    checked: controlled,
    defaultChecked,
    onChange,
    disabled,
    label,
    id,
    className,
  } = props;

  const [uncontrolled, setUncontrolled] = React.useState<boolean>(
    !!defaultChecked
  );
  const isControlled = controlled !== undefined;
  const checked = isControlled ? !!controlled : uncontrolled;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setUncontrolled(e.target.checked);
    onChange?.(e.target.checked);
  }

  return (
    <label className={cx(s.wrapper, className)}>
      <input
        id={id}
        type="checkbox"
        className={s.input}
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      <span
        className={cx(
          s.track,
          checked ? s.on : s.off,
          checked && s.checked,
          disabled && s.disabled
        )}
        aria-hidden
      >
        <span className={s.thumb} />
      </span>

      {label ? <span className={s.label}>{label}</span> : null}
    </label>
  );
}
