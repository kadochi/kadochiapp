"use client";

import React from "react";
import s from "./Label.module.css";

export type LabelType =
  | "primary"
  | "secondary"
  | "warning"
  | "danger"
  | "deactive";
export type LabelSize = "small" | "medium";
export type LabelStyle = "gradient" | "solid" | "tonal";

type Props = {
  type?: LabelType;
  size?: LabelSize;
  style?: LabelStyle;
  icon?: React.ReactNode;
  as?: "span" | "div" | "a";
  href?: string;
  className?: string;
  children?: React.ReactNode;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export default function Label({
  type = "primary",
  size = "medium",
  style = "solid",
  icon,
  as: Component = "span",
  href,
  className,
  children,
  ...rest
}: Props) {
  const classes = cx(
    s.root,
    s[`variant_${type}`],
    s[`style_${style}`],
    s[`size_${size}`],
    className
  );

  const content = (
    <span className={s.content}>
      {icon && <span className={s.icon}>{icon}</span>}
      <span className={s.text}>{children}</span>
    </span>
  );

  if (Component === "a" && href)
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );

  return (
    <Component className={classes} {...rest}>
      {content}
    </Component>
  );
}
