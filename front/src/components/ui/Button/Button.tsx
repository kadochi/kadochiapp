"use client";

import React from "react";
import s from "./Button.module.css";

export type ButtonType = "primary" | "secondary" | "tertiary" | "link";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonStyle = "filled" | "tonal" | "outline" | "ghost";

type BaseProps = {
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

type NativeButton = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "type" | "style"
>;
type NativeAnchor = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "style"
>;
type Props = BaseProps & (NativeButton | NativeAnchor);

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}
function normalizedStyle(t: ButtonType, st?: ButtonStyle): ButtonStyle {
  if (t === "primary" || t === "secondary")
    return st === "tonal" ? "tonal" : "filled";
  if (t === "tertiary") return "outline";
  return "ghost";
}
function classByType(t: ButtonType) {
  switch (t) {
    case "secondary":
      return s.intentSecondary;
    case "tertiary":
      return s.intentTertiary;
    case "link":
      return s.intentLink;
    default:
      return s.intentPrimary;
  }
}
function classByStyle(st: ButtonStyle) {
  switch (st) {
    case "tonal":
      return s.styleTonal;
    case "outline":
      return s.styleOutline;
    case "ghost":
      return s.styleGhost;
    default:
      return s.styleFilled;
  }
}
function classBySize(sz: ButtonSize) {
  switch (sz) {
    case "small":
      return s.sizeSm;
    case "large":
      return s.sizeLg;
    default:
      return s.sizeMd;
  }
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

  const classes = cx(
    s.root,
    classByType(type),
    classByStyle(style),
    classBySize(size),
    fullWidth ? s.fullWidth : "",
    className
  );

  const content = (
    <span className={s.content}>
      {leadingIcon ? <span className={s.icon}>{leadingIcon}</span> : null}
      {loading ? <span className={s.spinner} aria-hidden /> : children}
      {trailingIcon ? <span className={s.icon}>{trailingIcon}</span> : null}
    </span>
  );

  const isCustomComponent =
    typeof as === "function" || (typeof as === "object" && as);

  if (isCustomComponent) {
    const AsComp = as as React.ElementType;
    return (
      <AsComp
        {...(rest as any)}
        className={classes}
        aria-disabled={isDisabled || undefined}
        data-loading={loading || undefined}
      >
        {content}
      </AsComp>
    );
  }

  if (as === "a") {
    const aProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        {...aProps}
        className={classes}
        aria-disabled={isDisabled || undefined}
        data-loading={loading || undefined}
        tabIndex={isDisabled ? -1 : aProps.tabIndex}
      >
        {content}
      </a>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonProps}
      type={htmlType ?? "button"}
      className={classes}
      disabled={isDisabled}
      data-loading={loading || undefined}
    >
      {content}
    </button>
  );
}
