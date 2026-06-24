"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const chipVariants = cva(
  "inline-flex items-center justify-center font-sans font-normal text-label-16 leading-label-16 py-1.5 px-2 gap-1 rounded-rounded border border-solid whitespace-nowrap no-underline cursor-pointer box-border",
  {
    variants: {
      state: {
        default: "bg-surface-soft text-surface-neutral-high border-border-high",
        active:
          "bg-secondary-container text-surface-neutral-high border-secondary-on-container",
        disable:
          "bg-disable-container text-disable-on border-disable cursor-not-allowed",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

interface Props extends VariantProps<typeof chipVariants> {
  leadingIcon?: React.ReactNode;
  leadingBadge?: number;
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
  as?: "button" | "a" | "span";
  href?: string;
  className?: string;
  onClick?: React.MouseEventHandler;
  onClear?: React.MouseEventHandler;
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
}: Props) {
  const isDisabled = state === "disable";
  const cls = cn(chipVariants({ state }), className);

  const showBadge = typeof leadingBadge === "number";

  const trailing = trailingIcon ? (
    <span
      className="inline-flex items-center justify-center w-4 h-4 leading-none"
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
        <span className="inline-flex items-center justify-center w-4 h-4 leading-none ms-0.5">
          {leadingIcon}
        </span>
      )}
      <span>{children}</span>
      {showBadge && (
        <span
          className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-rounded text-xs leading-none",
            state === "disable"
              ? "bg-disable text-disable-on-container"
              : "bg-secondary text-secondary-on"
          )}
          aria-label={`count ${leadingBadge}`}
        >
          {leadingBadge}
        </span>
      )}
      {trailing}
    </>
  );

  if (As === "a" && href) {
    return (
      <a href={href} className={cls} aria-disabled={isDisabled || undefined}>
        {inner}
      </a>
    );
  }
  if (As === "span") {
    return (
      <span className={cls} aria-disabled={isDisabled || undefined}>
        {inner}
      </span>
    );
  }
  return (
    <button type="button" className={cls} disabled={isDisabled} onClick={onClick}>
      {inner}
    </button>
  );
}
