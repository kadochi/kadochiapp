"use client";

import React from "react";
import s from "./Chip.module.css";

export type ChipState = "default" | "active" | "disable";

type Props = {
  state?: ChipState;
  leadingIcon?: React.ReactNode;
  leadingBadge?: number;
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;

  as?: "button" | "a" | "span";
  href?: string;
  className?: string;

  onClick?: React.MouseEventHandler;
  onClear?: React.MouseEventHandler;
};

function cx(...p: Array<string | false | undefined>) {
  return p.filter(Boolean).join(" ");
}

export default function Chip({
  state = "default",
  leadingIcon,
  leadingBadge,
  trailingIcon,
  children,
  as: As = "button",
  href,
  className,
  onClick,
  onClear,
  ...rest
}: Props) {
  const isDisabled = state === "disable";
  const cls = cx(s.root, s[`state_${state}`], className);

  const showBadge =
    (state === "active" && typeof leadingBadge === "number") ||
    (state === "disable" && typeof leadingBadge === "number");

  const trailing = trailingIcon ? (
    <span
      className={cx(s.icon, s.trailing)}
      onClick={(e) => {
        if (!onClear) return;
        e.stopPropagation();
        onClear(e as unknown as React.MouseEvent<HTMLSpanElement>);
      }}
      role={onClear ? "button" : undefined}
      tabIndex={onClear ? 0 : -1}
      aria-hidden={!onClear}
    >
      {trailingIcon}
    </span>
  ) : null;

  const inner = (
    <>
      {leadingIcon && (
        <span className={cx(s.icon, s.leading)}>{leadingIcon}</span>
      )}

      <span className={s.label}>{children}</span>

      {showBadge && (
        <span className={s.badge} aria-label={`count ${leadingBadge}`}>
          {leadingBadge}
        </span>
      )}

      {trailing}
    </>
  );

  if (As === "a" && href) {
    return (
      <a
        href={href}
        className={cls}
        aria-disabled={isDisabled || undefined}
        {...rest}
      >
        {inner}
      </a>
    );
  }
  if (As === "span") {
    return (
      <span className={cls} aria-disabled={isDisabled || undefined} {...rest}>
        {inner}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      disabled={isDisabled}
      onClick={onClick}
      {...rest}
    >
      {inner}
    </button>
  );
}
