"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const labelVariants = cva(
  "inline-flex items-center justify-center select-none whitespace-nowrap font-sans font-normal rounded-rounded no-underline cursor-default",
  {
    variants: {
      type: {
        primary:
          "[--label-fg:var(--success-on-success)] [--label-solid-bg:var(--success-success)] [--label-tonal-bg:var(--success-success-container)] [--label-tonal-fg:var(--success-on-success-container)] [--label-grad-from:var(--primary-primary)] [--label-grad-to:var(--primary-primary-gradient)]",
        secondary:
          "[--label-fg:var(--secondary-on-secondary)] [--label-solid-bg:var(--secondary-secondary)] [--label-tonal-bg:var(--secondary-secondary-container)] [--label-tonal-fg:var(--secondary-on-secondary-container)] [--label-grad-from:var(--secondary-secondary)] [--label-grad-to:var(--secondary-secondary-gradient)]",
        warning:
          "[--label-fg:var(--warning-on-warning)] [--label-solid-bg:var(--warning-warning)] [--label-tonal-bg:var(--warning-warning-container)] [--label-tonal-fg:var(--warning-on-warning-container)] [--label-grad-from:var(--warning-warning)] [--label-grad-to:var(--warning-on-warning-container)]",
        danger:
          "[--label-fg:var(--error-on-error)] [--label-solid-bg:var(--error-error)] [--label-tonal-bg:var(--error-error-container)] [--label-tonal-fg:var(--error-on-error-container)] [--label-grad-from:var(--error-error)] [--label-grad-to:var(--error-on-error-container)]",
        deactive:
          "[--label-fg:var(--disable-on-disable)] [--label-solid-bg:var(--disable-disable)] [--label-tonal-bg:var(--disable-disable-container)] [--label-tonal-fg:var(--disable-on-disable-container)] [--label-grad-from:var(--disable-on-disable)] [--label-grad-to:var(--disable-on-disable-container)]",
      },
      size: {
        small: "text-label-12 leading-label-12 h-6 px-2 py-1 gap-1",
        medium: "text-label-14 leading-label-14 h-8 px-3 py-2 gap-1.5",
      },
      style: {
        solid: "text-[var(--label-fg)] bg-[var(--label-solid-bg)]",
        tonal: "text-[var(--label-tonal-fg)] bg-[var(--label-tonal-bg)]",
        gradient:
          "text-[var(--label-fg)] bg-gradient-to-l from-[var(--label-grad-from)] to-[var(--label-grad-to)]",
      },
    },
    defaultVariants: {
      type: "primary",
      size: "medium",
      style: "solid",
    },
  }
);

interface Props extends VariantProps<typeof labelVariants> {
  icon?: React.ReactNode;
  as?: "span" | "div" | "a";
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function Label({
  type,
  size,
  style,
  icon,
  as: Component = "span",
  href,
  className,
  children,
}: Props) {
  const classes = cn(labelVariants({ type, size, style }), className);

  const content = (
    <span className="inline-flex items-center justify-center gap-[inherit]">
      {icon && <span className="inline-flex items-center justify-center leading-none">{icon}</span>}
      <span>{children}</span>
    </span>
  );

  if (Component === "a" && href) {
    return <a href={href} className={classes}>{content}</a>;
  }

  return <Component className={classes}>{content}</Component>;
}
