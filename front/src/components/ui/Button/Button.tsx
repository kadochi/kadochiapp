"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-sans font-normal no-underline select-none rounded-rounded border-0 transition-all duration-150 gap-1.5 cursor-pointer box-border",
  {
    variants: {
      intent: {
        primary: [
          "[--btn-fg:var(--primary-on-primary)]",
          "[--btn-bg:var(--primary-primary)]",
          "[--btn-bg-pressed:color-mix(in_oklab,var(--primary-primary)_84%,black)]",
          "[--btn-tonal-bg:var(--primary-primary-container)]",
          "[--btn-tonal-fg:var(--primary-on-primary-container)]",
          "[--btn-grad-from:var(--primary-primary)]",
          "[--btn-grad-to:var(--primary-primary-gradient)]",
          "[--btn-hover-grad-from:var(--primary-on-primary-container)]",
          "[--btn-hover-grad-to:var(--primary-primary)]",
          "[--btn-pressed-grad-from:color-mix(in_oklab,var(--primary-primary)_88%,black)]",
          "[--btn-pressed-grad-to:color-mix(in_oklab,var(--primary-primary-gradient)_88%,black)]",
        ].join(" "),
        secondary: [
          "[--btn-fg:var(--secondary-on-secondary)]",
          "[--btn-bg:var(--secondary-secondary)]",
          "[--btn-bg-pressed:color-mix(in_oklab,var(--secondary-secondary)_84%,black)]",
          "[--btn-tonal-bg:var(--secondary-secondary-container)]",
          "[--btn-tonal-fg:var(--secondary-on-secondary-container)]",
          "[--btn-grad-from:var(--secondary-secondary)]",
          "[--btn-grad-to:var(--secondary-secondary-gradient)]",
          "[--btn-hover-grad-from:var(--secondary-on-secondary-container)]",
          "[--btn-hover-grad-to:var(--secondary-secondary)]",
          "[--btn-pressed-grad-from:color-mix(in_oklab,var(--secondary-secondary)_88%,black)]",
          "[--btn-pressed-grad-to:color-mix(in_oklab,var(--secondary-secondary-gradient)_88%,black)]",
        ].join(" "),
        tertiary: "[--btn-fg:var(--text-primary)] [--btn-outline:var(--border-border-high-emphasis)]",
        link: "[--btn-link-fg:var(--text-primary)]",
      },
      style: {
        filled: "",
        tonal: "",
        outline: "",
        ghost: "",
      },
      size: {
        small: "text-label-14 leading-label-14 px-3 py-3 h-10 min-h-10 max-h-10 gap-1.5 [--icon-size:16px]",
        medium: "text-label-16 leading-label-16 px-3 py-3.5 h-12 min-h-12 max-h-12 gap-1.5 [--icon-size:24px]",
        large: "text-label-16 leading-label-16 px-4 py-4.5 h-14 min-h-14 max-h-14 gap-2 [--icon-size:24px]",
      },
      fullWidth: { true: "w-full" },
    },
    compoundVariants: [
      { intent: "primary", style: "filled", className: "text-[var(--btn-fg)] bg-gradient-to-l from-[var(--btn-grad-from)] to-[var(--btn-grad-to)]" },
      { intent: "primary", style: "filled", className: "hover:bg-gradient-to-l hover:from-[var(--btn-hover-grad-from)] hover:to-[var(--btn-hover-grad-to)] active:bg-gradient-to-l active:from-[var(--btn-bg-pressed)] active:to-[var(--btn-bg-pressed)]" },
      { intent: "secondary", style: "filled", className: "text-[var(--btn-fg)] bg-gradient-to-l from-[var(--btn-grad-from)] to-[var(--btn-grad-to)]" },
      { intent: "secondary", style: "filled", className: "hover:bg-gradient-to-l hover:from-[var(--btn-hover-grad-from)] hover:to-[var(--btn-hover-grad-to)] active:bg-gradient-to-l active:from-[var(--btn-bg-pressed)] active:to-[var(--btn-bg-pressed)]" },
      { intent: "primary", style: "tonal", className: "bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)]" },
      { intent: "secondary", style: "tonal", className: "bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)]" },
      { intent: "tertiary", style: "outline", className: "bg-transparent text-[var(--btn-fg)] border border-solid border-[var(--btn-outline)]" },
      { intent: "link", style: "ghost", className: "bg-transparent text-[var(--btn-link-fg)]" },
    ],
    defaultVariants: { intent: "primary", style: "filled", size: "medium" },
  }
);

export type ButtonType = "primary" | "secondary" | "tertiary" | "link";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonStyle = "filled" | "tonal" | "outline" | "ghost";

type BaseProps = VariantProps<typeof buttonVariants> & {
  type?: ButtonType;
  style?: ButtonStyle;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
  as?: "button" | "a" | React.ElementType;
  htmlType?: "button" | "submit" | "reset";
};

type NativeButton = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "type" | "style">;
type NativeAnchor = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "style">;
type Props = BaseProps & (NativeButton | NativeAnchor);

function normalizedStyle(t: ButtonType, st?: ButtonStyle): ButtonStyle {
  if (t === "primary" || t === "secondary") return st === "tonal" ? "tonal" : "filled";
  if (t === "tertiary") return "outline";
  return "ghost";
}

function Spinner() {
  return (
    <span className="inline-block w-[1em] h-[1em] border-2 border-solid border-current border-t-transparent rounded-full animate-spin" aria-hidden />
  );
}

export default function Button(props: Props) {
  const {
    as = "button",
    type = "primary",
    size = "medium",
    style: styleProp,
    htmlType,
    loading,
    disabled,
    fullWidth,
    leadingIcon,
    trailingIcon,
    className,
    children,
    ...rest
  } = props as any;

  const style = normalizedStyle(type, styleProp);
  const isDisabled = !!disabled || !!loading;

  const classes = cn(
    buttonVariants({ intent: type as any, style, size, fullWidth: !!fullWidth }),
    "disabled:pointer-events-none disabled:cursor-not-allowed",
    (style === "filled") && "disabled:bg-none disabled:bg-disable-container disabled:text-disable-on disabled:border-0",
    (style === "tonal") && "disabled:bg-disable-container disabled:text-disable-on disabled:border-0",
    (style === "outline") && "disabled:bg-disable-container disabled:text-disable-on disabled:border-solid disabled:border-disable",
    className
  );

  const content = (
    <span className="inline-flex items-center justify-center gap-[inherit]">
      {leadingIcon ? <span className="inline-flex items-center justify-center leading-none" style={{ width: "var(--icon-size)", height: "var(--icon-size)" }}>{leadingIcon}</span> : null}
      {loading ? <Spinner /> : children}
      {trailingIcon ? <span className="inline-flex items-center justify-center leading-none" style={{ width: "var(--icon-size)", height: "var(--icon-size)" }}>{trailingIcon}</span> : null}
    </span>
  );

  if (typeof as === "function" || (typeof as === "object" && as)) {
    const AsComp = as as React.ElementType;
    return (
      <AsComp {...(rest as any)} className={classes} aria-disabled={isDisabled || undefined} data-loading={loading || undefined}>
        {content}
      </AsComp>
    );
  }

  if (as === "a") {
    const aProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a {...aProps} className={classes} aria-disabled={isDisabled || undefined} data-loading={loading || undefined} tabIndex={isDisabled ? -1 : aProps.tabIndex}>
        {content}
      </a>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...buttonProps} type={htmlType ?? "button"} className={classes} disabled={isDisabled} data-loading={loading || undefined}>
      {content}
    </button>
  );
}
