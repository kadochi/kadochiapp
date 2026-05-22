"use client";

import React from "react";
import s from "./Divider.module.css";

type DividerType = "divider" | "spacer";
type DividerVariant = "full-width" | "with-padding";

interface Props {
  type?: DividerType;
  variant?: DividerVariant;
  className?: string;
}

function cx(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function Divider({
  type = "divider",
  variant = "full-width",
  className,
}: Props) {
  return (
    <div
      className={cx(
        s.root,
        type === "divider" && s.divider,
        type === "spacer" && s.spacer,
        variant === "with-padding" && s.withPadding,
        className
      )}
      aria-hidden="true"
    />
  );
}
